---
phase: 4
plan: 1
wave: 1
---

# Plan 4.1: Dual Encoder Architecture & Training Loop

## Objective

Implement the contrastive dual-encoder: two ResNet50 branches (one for SAR, one for optical), each with a shared projection head that maps to a 512-d embedding space. Train with InfoNCE/NT-Xent contrastive loss on matched SAR/optical pairs. The shared embedding space enables cross-modal retrieval.

## Context

- `models/dual_encoder.py` — new file to create
- `train.py` — main training entry point
- `models/encoder.py` — ResNet50Encoder to reuse
- MPS available on M1 for prototyping; HP Victus for full training
- Batch size must be small (≤ 16) on M1; use gradient accumulation to simulate larger effective batch

## Tasks

<task type="auto">
  <name>Implement models/dual_encoder.py — contrastive dual-encoder with projection head</name>
  <files>models/dual_encoder.py</files>
  <action>
    Create `models/dual_encoder.py`:

    ```python
    """
    Dual-encoder contrastive model for cross-modal satellite image retrieval.

    Architecture:
        SAR image  -> SAR Encoder (ResNet50) -> 2048-d -> Projection Head -> 512-d (L2-norm)
        OPT image  -> OPT Encoder (ResNet50) -> 2048-d -> Projection Head -> 512-d (L2-norm)

    The projection head is SHARED between encoders to enforce alignment.
    During inference, use only the backbone + projection (no temperature scaling).
    """
    import torch
    import torch.nn as nn
    import torch.nn.functional as F

    from models.encoder import ResNet50Encoder


    class ProjectionHead(nn.Module):
        """
        MLP projection head: 2048 -> 1024 -> 512 (L2-normalized).
        Follows SimCLR/CLIP-style projection for contrastive learning.
        """

        def __init__(self, in_dim: int = 2048, hidden_dim: int = 1024, out_dim: int = 512):
            super().__init__()
            self.net = nn.Sequential(
                nn.Linear(in_dim, hidden_dim),
                nn.BatchNorm1d(hidden_dim),
                nn.ReLU(inplace=True),
                nn.Linear(hidden_dim, out_dim),
            )

        def forward(self, x):
            return F.normalize(self.net(x), p=2, dim=1)


    class DualEncoder(nn.Module):
        """
        Cross-modal dual encoder for SAR-optical satellite retrieval.

        Args:
            embedding_dim: Final embedding dimension after projection (default 512)
            pretrained: Use ImageNet pretrained ResNet50 weights
            freeze_backbone: Freeze ResNet weights initially (unfreeze for fine-tuning)
        """

        def __init__(
            self,
            embedding_dim: int = 512,
            pretrained: bool = True,
            freeze_backbone: bool = False,
        ):
            super().__init__()
            self.embedding_dim = embedding_dim

            # Separate backbones for SAR and optical
            self.sar_backbone = ResNet50Encoder(
                in_channels=2,
                pretrained=pretrained,
                freeze_backbone=freeze_backbone,
                embedding_dim=2048,  # raw 2048 before projection
            )
            self.opt_backbone = ResNet50Encoder(
                in_channels=3,
                pretrained=pretrained,
                freeze_backbone=freeze_backbone,
                embedding_dim=2048,
            )

            # Shared projection head — cross-modal alignment
            self.projector = ProjectionHead(2048, 1024, embedding_dim)

        def encode_sar(self, x):
            """Encode SAR images to normalized embeddings."""
            feat = self.sar_backbone(x)   # (B, 2048) already L2-normalized by backbone
            return self.projector(feat)   # (B, 512) L2-normalized

        def encode_optical(self, x):
            """Encode optical images to normalized embeddings."""
            feat = self.opt_backbone(x)   # (B, 2048)
            return self.projector(feat)   # (B, 512)

        def forward(self, sar, optical):
            """
            Forward pass for training.
            Returns: (sar_emb, opt_emb) — both (B, embedding_dim), L2-normalized
            """
            return self.encode_sar(sar), self.encode_optical(optical)


    class InfoNCELoss(nn.Module):
        """
        NT-Xent / InfoNCE contrastive loss for matched pairs.

        For a batch of B pairs, positive pairs are (i, i) across modalities.
        All other combinations are negatives.

        Args:
            temperature: Softmax temperature (lower = harder, default 0.07)
        """

        def __init__(self, temperature: float = 0.07):
            super().__init__()
            self.temperature = temperature

        def forward(self, sar_emb: torch.Tensor, opt_emb: torch.Tensor) -> torch.Tensor:
            """
            Args:
                sar_emb: (B, D) L2-normalized SAR embeddings
                opt_emb: (B, D) L2-normalized Optical embeddings
            Returns:
                scalar loss
            """
            B = sar_emb.size(0)
            device = sar_emb.device

            # Similarity matrix: (B, B)
            # sim[i][j] = cosine similarity of SAR_i and OPT_j
            sim = torch.matmul(sar_emb, opt_emb.T) / self.temperature

            # Labels: positive pair is (i, i)
            labels = torch.arange(B, device=device)

            # Cross entropy in both directions
            loss_sar_to_opt = F.cross_entropy(sim, labels)
            loss_opt_to_sar = F.cross_entropy(sim.T, labels)

            return (loss_sar_to_opt + loss_opt_to_sar) / 2


    if __name__ == "__main__":
        import torch
        from models.encoder import get_device

        device = get_device()
        print(f"Device: {device}")

        model = DualEncoder(embedding_dim=512, pretrained=False).to(device)

        sar = torch.randn(4, 2, 256, 256).to(device)
        opt = torch.randn(4, 3, 256, 256).to(device)

        sar_emb, opt_emb = model(sar, opt)
        print(f"SAR emb: {sar_emb.shape}")     # (4, 512)
        print(f"OPT emb: {opt_emb.shape}")     # (4, 512)
        print(f"SAR norms: {sar_emb.norm(dim=1)}")  # all 1.0

        criterion = InfoNCELoss(temperature=0.07)
        loss = criterion(sar_emb, opt_emb)
        print(f"InfoNCE loss: {loss.item():.4f}")  # should be ~log(4)≈1.39
        assert not torch.isnan(loss), "Loss is NaN!"
        print("PASS: DualEncoder + InfoNCELoss working")
    ```
  </action>
  <verify>
    cd /Users/yuvrajmehta/Developer/satellite-retrieval
    source venv/bin/activate
    python models/dual_encoder.py 2>&1 | tail -8
    # Expected:
    # Device: mps
    # SAR emb: torch.Size([4, 512])
    # OPT emb: torch.Size([4, 512])
    # SAR norms: tensor([1., 1., 1., 1.], ...)
    # InfoNCE loss: ~1.3 (log of batch size)
    # PASS: DualEncoder + InfoNCELoss working
  </verify>
  <done>
    - `python models/dual_encoder.py` runs without error on MPS
    - SAR/OPT embeddings: `(4, 512)` L2-normalized
    - InfoNCE loss is a finite scalar (not NaN)
    - `PASS:` printed
  </done>
</task>

<task type="auto">
  <name>Implement train.py — contrastive training loop with MPS support and checkpointing</name>
  <files>train.py</files>
  <action>
    Create `train.py`:

    ```python
    """
    Contrastive dual-encoder training for cross-modal satellite retrieval.

    Usage:
        python train.py --epochs 20 --batch-size 8 --accum-steps 4
        # Effective batch size = batch_size * accum_steps = 32 on M1

    For HP Victus (CUDA):
        python train.py --epochs 50 --batch-size 32 --accum-steps 2
    """
    import argparse
    import time
    import json
    from pathlib import Path

    import torch
    from torch.utils.data import DataLoader, random_split

    from datasets.sen12ms_dataset import SEN12MSDataset
    from models.dual_encoder import DualEncoder, InfoNCELoss
    from models.encoder import get_device


    def train_one_epoch(model, loader, optimizer, criterion, device, accum_steps):
        model.train()
        total_loss = 0.0
        optimizer.zero_grad()

        for step, batch in enumerate(loader):
            sar = batch["sar"].to(device)
            opt = batch["optical"].to(device)

            sar_emb, opt_emb = model(sar, opt)
            loss = criterion(sar_emb, opt_emb)
            loss = loss / accum_steps  # scale for accumulation
            loss.backward()

            if (step + 1) % accum_steps == 0 or (step + 1) == len(loader):
                torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
                optimizer.step()
                optimizer.zero_grad()

            total_loss += loss.item() * accum_steps

        return total_loss / len(loader)


    @torch.no_grad()
    def validate(model, loader, criterion, device):
        model.eval()
        total_loss = 0.0
        for batch in loader:
            sar = batch["sar"].to(device)
            opt = batch["optical"].to(device)
            sar_emb, opt_emb = model(sar, opt)
            loss = criterion(sar_emb, opt_emb)
            total_loss += loss.item()
        return total_loss / len(loader)


    def main():
        parser = argparse.ArgumentParser()
        parser.add_argument("--data", default="data/sen12ms-subset")
        parser.add_argument("--epochs", type=int, default=20)
        parser.add_argument("--batch-size", type=int, default=8)
        parser.add_argument("--accum-steps", type=int, default=4,
                            help="Gradient accumulation steps (effective_bs = bs * accum)")
        parser.add_argument("--lr", type=float, default=1e-4)
        parser.add_argument("--embedding-dim", type=int, default=512)
        parser.add_argument("--temperature", type=float, default=0.07)
        parser.add_argument("--workers", type=int, default=0)
        parser.add_argument("--output-dir", default="outputs/checkpoints")
        parser.add_argument("--val-split", type=float, default=0.1)
        args = parser.parse_args()

        device = get_device()
        print(f"Device: {device}")
        print(f"Effective batch size: {args.batch_size * args.accum_steps}")

        out_dir = Path(args.output_dir)
        out_dir.mkdir(parents=True, exist_ok=True)

        # Dataset split
        dataset = SEN12MSDataset(args.data, normalize=True)
        val_size = max(1, int(len(dataset) * args.val_split))
        train_size = len(dataset) - val_size
        train_ds, val_ds = random_split(dataset, [train_size, val_size])
        print(f"Train: {train_size}, Val: {val_size}")

        pin_memory = str(device) not in ("mps", "cpu")
        train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True,
                                  num_workers=args.workers, pin_memory=pin_memory, drop_last=True)
        val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False,
                                num_workers=args.workers, pin_memory=pin_memory)

        # Model
        model = DualEncoder(embedding_dim=args.embedding_dim, pretrained=True,
                            freeze_backbone=False).to(device)
        criterion = InfoNCELoss(temperature=args.temperature)
        optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
        scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)

        history = {"train_loss": [], "val_loss": []}
        best_val_loss = float("inf")

        for epoch in range(1, args.epochs + 1):
            t0 = time.time()
            train_loss = train_one_epoch(model, train_loader, optimizer, criterion,
                                         device, args.accum_steps)
            val_loss = validate(model, val_loader, criterion, device)
            scheduler.step()

            history["train_loss"].append(train_loss)
            history["val_loss"].append(val_loss)

            print(f"Epoch {epoch:03d}/{args.epochs} | "
                  f"Train: {train_loss:.4f} | Val: {val_loss:.4f} | "
                  f"Time: {time.time()-t0:.1f}s")

            # Save best checkpoint
            if val_loss < best_val_loss:
                best_val_loss = val_loss
                ckpt_path = out_dir / "best_model.pt"
                torch.save({
                    "epoch": epoch,
                    "model_state_dict": model.state_dict(),
                    "optimizer_state_dict": optimizer.state_dict(),
                    "val_loss": val_loss,
                    "args": vars(args),
                }, ckpt_path)
                print(f"  -> Saved best checkpoint (val_loss={val_loss:.4f})")

            # Save latest checkpoint every 5 epochs
            if epoch % 5 == 0:
                torch.save({
                    "epoch": epoch,
                    "model_state_dict": model.state_dict(),
                    "val_loss": val_loss,
                }, out_dir / f"checkpoint_epoch{epoch:03d}.pt")

        # Save training history
        with open(out_dir / "history.json", "w") as f:
            json.dump(history, f, indent=2)
        print(f"\nTraining complete. Best val loss: {best_val_loss:.4f}")
        print(f"Checkpoints saved to: {out_dir}/")

    if __name__ == "__main__":
        main()
    ```
  </action>
  <verify>
    cd /Users/yuvrajmehta/Developer/satellite-retrieval
    source venv/bin/activate
    # Run 2 epochs as a smoke test (takes ~2 min on M1)
    python train.py --epochs 2 --batch-size 4 --accum-steps 2 --workers 0 2>&1 | tail -15
    # Expected: two epoch lines printed, best checkpoint saved
    ls -la outputs/checkpoints/best_model.pt
  </verify>
  <done>
    - `train.py` runs 2 epochs without OOM or error on M1
    - `outputs/checkpoints/best_model.pt` created
    - Training and validation loss decreasing (loss should go from ~log(batch_size) down)
    - No NaN losses
  </done>
</task>

## Success Criteria

- [ ] `python models/dual_encoder.py` produces `PASS:` with correct embedding shapes
- [ ] InfoNCE loss is a finite scalar, ≈ log(batch_size) initially
- [ ] `python train.py --epochs 2 --batch-size 4` runs without OOM on M1
- [ ] `outputs/checkpoints/best_model.pt` saved after training

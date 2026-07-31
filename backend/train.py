"""
Contrastive dual-encoder training for cross-modal satellite retrieval.

Usage:
    python train.py --epochs 20 --batch-size 8 --accum-steps 4
    # Effective batch size = batch_size * accum_steps = 32 on M1

For ASUS TUF (CUDA):
    python train.py --epochs 50 --batch-size 32 --accum-steps 2

Scheduler: Linear warmup (--warmup-epochs) then CosineAnnealingLR.
This prevents destroying pretrained features before the projection head stabilises.
"""
import argparse
import time
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import torch
from torch.utils.data import DataLoader, random_split
from torch.optim.lr_scheduler import LinearLR, CosineAnnealingLR, SequentialLR

from datasets.sen12ms_dataset import SEN12MSDataset
from datasets.sen12ms_hard_neg_dataset import SEN12MSHardNegDataset
from models.dual_encoder import DualEncoder, InfoNCELoss, InfoNCEWithHardNegs
from models.encoder import get_device


def train_one_epoch(model, loader, optimizer, criterion, device, accum_steps,
                    use_hard_neg: bool = False, resize_fn=None):
    model.train()
    total_loss = 0.0
    optimizer.zero_grad()

    is_xla = (device.type == "xla")

    for step, batch in enumerate(loader):
        batch = {k: v.to(device) if isinstance(v, torch.Tensor) else v
                 for k, v in batch.items()}
        if resize_fn:
            batch = resize_fn(batch)

        sar = batch["sar"]
        opt = batch["optical"]

        sar_emb, opt_emb = model(sar, opt)
        if use_hard_neg:
            hard_neg_emb = model.encode_sar(batch["hard_neg_sar"])
            loss = criterion(sar_emb, opt_emb, hard_neg_emb)
        else:
            loss = criterion(sar_emb, opt_emb)
        loss = loss / accum_steps  # scale for accumulation
        loss.backward()

        if (step + 1) % accum_steps == 0 or (step + 1) == len(loader):
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            if is_xla:
                import torch_xla.core.xla_model as xm
                xm.optimizer_step(optimizer)
            else:
                optimizer.step()
            optimizer.zero_grad()

        total_loss += loss.item() * accum_steps

    return total_loss / len(loader)


@torch.no_grad()
def validate(model, loader, criterion, device, resize_fn=None):
    model.eval()
    total_loss = 0.0
    for batch in loader:
        batch = {k: v.to(device) if isinstance(v, torch.Tensor) else v
                 for k, v in batch.items()}
        if resize_fn:
            batch = resize_fn(batch)
        sar_emb, opt_emb = model(batch["sar"], batch["optical"])
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
    parser.add_argument("--warmup-epochs", type=int, default=5,
                        help="Linear LR warmup epochs before cosine decay")
    parser.add_argument("--embedding-dim", type=int, default=512)
    parser.add_argument("--temperature", type=float, default=0.1,
                        help="InfoNCE temperature (0.1 recommended for batch<=64)")
    parser.add_argument("--workers", type=int, default=0)
    parser.add_argument("--output-dir", default="outputs/checkpoints")
    parser.add_argument("--val-split", type=float, default=0.1)
    parser.add_argument("--no-cache", action="store_true",
                        help="Disable RAM caching. Load from disk dynamically (use with --workers).")
    parser.add_argument("--hard-neg-mining", action="store_true",
                        help="Enable hard negative mining using LC labels")
    parser.add_argument("--lc-labels", default="outputs/index/lc_labels.json",
                        help="Path to lc_labels.json (required for hard-neg-mining)")
    parser.add_argument("--hard-neg-weight", type=float, default=1.0,
                        help="Weight for hard negative logits in InfoNCEWithHardNegs")
    parser.add_argument("--device", default=None,
                        help="Device to train on (cpu, mps, cuda). If None, uses best available.")
    parser.add_argument("--img-size", type=int, default=None,
                        help="Resize patches to this square size (e.g. 64 or 128). "
                             "Reduces GPU memory 16x at 64px vs 256px. "
                             "Recommended for M1 Air (8GB): 64")
    parser.add_argument("--freeze-backbone", action="store_true",
                        help="Freeze ResNet50 backbone weights — only train projection heads. "
                             "~4x faster, uses much less memory. Good for quick prototyping.")
    args = parser.parse_args()

    if args.device:
        device = torch.device(args.device)
    else:
        device = get_device()
    print(f"Device: {device}")
    print(f"Effective batch size: {args.batch_size * args.accum_steps}")

    if args.hard_neg_mining:
        from pathlib import Path as _Path
        if not _Path(args.lc_labels).exists():
            raise FileNotFoundError(
                f"LC labels not found at {args.lc_labels}. "
                "Run: python backend/scripts/build_lc_index.py"
            )
        print(f"[Train] Hard negative mining ENABLED. LC labels: {args.lc_labels}")

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Dataset split
    cache_in_memory = not args.no_cache
    if args.hard_neg_mining:
        dataset = SEN12MSHardNegDataset(args.data, normalize=True,
                                        lc_labels_path=args.lc_labels,
                                        cache_in_memory=cache_in_memory)
    else:
        dataset = SEN12MSDataset(args.data, normalize=True,
                                 cache_in_memory=cache_in_memory)
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
                        freeze_backbone=args.freeze_backbone).to(device)
    if args.freeze_backbone:
        trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
        total    = sum(p.numel() for p in model.parameters())
        print(f"[Train] Backbone FROZEN — training projection heads only "
              f"({trainable:,} / {total:,} params)")
    if args.hard_neg_mining:
        criterion = InfoNCEWithHardNegs(temperature=args.temperature,
                                        hard_neg_weight=args.hard_neg_weight)
    else:
        criterion = InfoNCELoss(temperature=args.temperature)
    val_criterion = InfoNCELoss(temperature=args.temperature)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)

    # LR schedule: linear warmup then cosine annealing
    # Warmup prevents destroying pretrained features before projection head stabilises.
    warmup_scheduler = LinearLR(
        optimizer, start_factor=0.1, end_factor=1.0,
        total_iters=args.warmup_epochs
    )
    cosine_scheduler = CosineAnnealingLR(
        optimizer, T_max=max(1, args.epochs - args.warmup_epochs)
    )
    scheduler = SequentialLR(
        optimizer,
        schedulers=[warmup_scheduler, cosine_scheduler],
        milestones=[args.warmup_epochs]
    )
    print(f"Scheduler: {args.warmup_epochs}-epoch linear warmup → cosine decay")
    print(f"Temperature: {args.temperature}")

    history = {"train_loss": [], "val_loss": []}
    best_val_loss = float("inf")

    # Patch resize lambda — applied per-batch in the loop (avoids re-caching resized tensors)
    img_size = args.img_size
    if img_size:
        print(f"[Train] Resizing patches to {img_size}×{img_size} (original: 256×256)")

    def maybe_resize(batch):
        """Resize sar/optical/hard_neg_sar tensors if --img-size is set."""
        if img_size is None:
            return batch
        batch["sar"]     = F.interpolate(batch["sar"],     size=img_size, mode="bilinear", align_corners=False)
        batch["optical"] = F.interpolate(batch["optical"], size=img_size, mode="bilinear", align_corners=False)
        if "hard_neg_sar" in batch:
            batch["hard_neg_sar"] = F.interpolate(batch["hard_neg_sar"], size=img_size,
                                                   mode="bilinear", align_corners=False)
        return batch

    for epoch in range(1, args.epochs + 1):
        t0 = time.time()
        train_loss = train_one_epoch(model, train_loader, optimizer, criterion,
                                     device, args.accum_steps,
                                     use_hard_neg=args.hard_neg_mining,
                                     resize_fn=maybe_resize)
        val_loss = validate(model, val_loader, val_criterion, device,
                            resize_fn=maybe_resize)
        scheduler.step()

        history["train_loss"].append(train_loss)
        history["val_loss"].append(val_loss)

        current_lr = scheduler.get_last_lr()[0]
        print(f"Epoch {epoch:03d}/{args.epochs} | "
              f"Train: {train_loss:.4f} | Val: {val_loss:.4f} | "
              f"LR: {current_lr:.2e} | Time: {time.time()-t0:.1f}s")

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
                "temperature": args.temperature,
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

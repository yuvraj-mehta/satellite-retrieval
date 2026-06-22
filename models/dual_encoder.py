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

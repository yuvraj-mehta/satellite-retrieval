"""
Dual-encoder contrastive model for cross-modal satellite image retrieval.

Architecture (CLIP-style — separate heads per modality):
    SAR image  -> SAR Encoder (ResNet50) -> 2048-d -> SAR ProjectionHead -> 512-d (L2-norm)
    OPT image  -> OPT Encoder (ResNet50) -> 2048-d -> OPT ProjectionHead -> 512-d (L2-norm)

Key design decisions:
  - SEPARATE projection heads per modality (not shared).
    Rationale: SAR (radar backscatter) and optical (solar reflectance) produce feature
    distributions from fundamentally different physics. Forcing the same linear transform
    on both (shared projector) is architecturally incorrect. CLIP, ALIGN, and all serious
    cross-modal retrieval systems use separate per-modality projection heads.

  - torchgeo sensor-native weights (when available):
    SAR backbone: SENTINEL1_GRD_MOCO — pretrained on Sentinel-1 GRD imagery
    OPT backbone: SENTINEL2_RGB_MOCO — pretrained on Sentinel-2 optical imagery
    These are physically correct initialisations vs. ImageNet (natural photos).

  - InfoNCE / NT-Xent contrastive loss aligns the two separate embedding spaces.

During inference, use only backbone + modality-specific projection (no temperature).
"""

import torch
import torch.nn as nn
import torch.nn.functional as F

from models.encoder import ResNet50Encoder, TORCHGEO_AVAILABLE


class ProjectionHead(nn.Module):
    """
    MLP projection head: 2048 -> 1024 -> out_dim (L2-normalized).
    Follows SimCLR/CLIP-style projection for contrastive learning.

    Each modality gets its OWN instance — they do not share weights.
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
        pretrained: Use ImageNet pretrained ResNet50 weights (ImageNet fallback path only)
        freeze_backbone: Freeze ResNet weights initially (fine-tune later if needed)
        use_torchgeo: Use torchgeo sensor-native weights when available (default True).
                      Falls back to ImageNet if torchgeo not installed.
    """

    def __init__(
        self,
        embedding_dim: int = 512,
        pretrained: bool = True,
        freeze_backbone: bool = False,
        use_torchgeo: bool = True,
    ):
        super().__init__()
        self.embedding_dim = embedding_dim

        if use_torchgeo and TORCHGEO_AVAILABLE:
            # ----------------------------------------------------------------
            # Sensor-native path — physically correct initialisations
            # SAR:     SENTINEL1_ALL_MOCO — pretrained on dual-pol (VV+VH) Sentinel-1
            # Optical: SENTINEL2_RGB_MOCO — pretrained on Sentinel-2 RGB bands
            #          We use 4-ch input (B4+B8+B11+B12), so a learnable 1x1 conv
            #          adapter is inserted before the backbone (handled in encoder.py).
            # ----------------------------------------------------------------
            from torchgeo.models import ResNet50_Weights
            print("[DualEncoder] Using torchgeo sensor-native weights:")
            self.sar_backbone = ResNet50Encoder(
                in_channels=2,   # SAR: VV + VH (matches SENTINEL1_ALL_MOCO native)
                torchgeo_weights=ResNet50_Weights.SENTINEL1_ALL_MOCO,
                freeze_backbone=freeze_backbone,
                embedding_dim=2048,
            )
            self.opt_backbone = ResNet50Encoder(
                in_channels=4,   # Optical: B4+B8+B11+B12 (4-ch → adapter → 3-ch backbone)
                torchgeo_weights=ResNet50_Weights.SENTINEL2_RGB_MOCO,
                freeze_backbone=freeze_backbone,
                embedding_dim=2048,
            )
        else:
            # ----------------------------------------------------------------
            # ImageNet fallback — used when torchgeo not installed
            # ----------------------------------------------------------------
            if use_torchgeo and not TORCHGEO_AVAILABLE:
                print("[DualEncoder] torchgeo not installed — falling back to ImageNet weights.")
                print("  Install with: pip install 'torchgeo>=0.5'")
            self.sar_backbone = ResNet50Encoder(
                in_channels=2,
                pretrained=pretrained,
                freeze_backbone=freeze_backbone,
                embedding_dim=2048,
            )
            self.opt_backbone = ResNet50Encoder(
                in_channels=3,
                pretrained=pretrained,
                freeze_backbone=freeze_backbone,
                embedding_dim=2048,
            )

        # ----------------------------------------------------------------
        # CLIP-style SEPARATE projection heads (one per modality)
        # This is the architecturally correct design — not a shared head.
        # ----------------------------------------------------------------
        self.sar_projector = ProjectionHead(2048, 1024, embedding_dim)
        self.opt_projector = ProjectionHead(2048, 1024, embedding_dim)

    def encode_sar(self, x):
        """Encode SAR images to normalized embeddings using SAR-specific projector."""
        feat = self.sar_backbone(x)      # (B, 2048) L2-normalized by backbone
        return self.sar_projector(feat)  # (B, embedding_dim) L2-normalized

    def encode_optical(self, x):
        """Encode optical images to normalized embeddings using optical-specific projector."""
        feat = self.opt_backbone(x)      # (B, 2048)
        return self.opt_projector(feat)  # (B, embedding_dim)

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
        temperature: Softmax temperature. Default 0.1 (recommended for batch≤64).
                     Note: 0.07 from SimCLR is calibrated for very large batches (4096+).
                     For effective batch size ~32, 0.1 is more appropriate.
    """

    def __init__(self, temperature: float = 0.1):
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

        # Cross entropy in both directions (bidirectional InfoNCE)
        loss_sar_to_opt = F.cross_entropy(sim, labels)
        loss_opt_to_sar = F.cross_entropy(sim.T, labels)

        return (loss_sar_to_opt + loss_opt_to_sar) / 2


if __name__ == "__main__":
    import torch
    from models.encoder import get_device

    device = get_device()
    print(f"Device: {device}")
    print(f"torchgeo available: {TORCHGEO_AVAILABLE}")

    model = DualEncoder(embedding_dim=512, use_torchgeo=True).to(device)

    sar = torch.randn(4, 2, 64, 64).to(device)
    opt = torch.randn(4, 3, 64, 64).to(device)

    sar_emb, opt_emb = model(sar, opt)
    print(f"\nSAR emb shape:  {sar_emb.shape}")     # (4, 512)
    print(f"OPT emb shape:  {opt_emb.shape}")     # (4, 512)
    print(f"SAR norms: {sar_emb.norm(dim=1)}")    # all 1.0
    print(f"OPT norms: {opt_emb.norm(dim=1)}")    # all 1.0

    # Verify separate (non-shared) projection heads
    sar_param_ids = {id(p) for p in model.sar_projector.parameters()}
    opt_param_ids = {id(p) for p in model.opt_projector.parameters()}
    assert sar_param_ids.isdisjoint(opt_param_ids), "ERROR: Projectors share parameters!"
    print("\nPASS: sar_projector and opt_projector have disjoint parameters (CLIP-style)")

    criterion = InfoNCELoss(temperature=0.1)
    loss = criterion(sar_emb, opt_emb)
    print(f"InfoNCE loss: {loss.item():.4f}")
    assert not torch.isnan(loss), "Loss is NaN!"
    print("PASS: DualEncoder + InfoNCELoss working")

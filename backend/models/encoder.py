"""
ResNet50-based feature extractor for satellite image retrieval.

Produces L2-normalized 2048-d embeddings from either SAR (2-ch) or
optical (3/4-ch) inputs.

Two backbone initialization paths:
  1. torchgeo sensor-native (preferred): Uses weights pretrained directly on
     Sentinel-1 GRD or Sentinel-2 satellite imagery. Available weight names:
       SAR:     SENTINEL1_GRD_MOCO, SENTINEL1_GRD_DECUR, SENTINEL1_GRD_SOFTCON
       Optical: SENTINEL2_RGB_MOCO, SENTINEL2_ALL_MOCO, SENTINEL2_RGB_SECO
     These weights understand the physical meaning of SAR/multispectral data.

  2. ImageNet pretrained (fallback): Uses standard IMAGENET1K_V1 weights with
     a ChannelAdapter to handle non-3-channel inputs. Faster to prototype with
     but physically incorrect for SAR (radar backscatter ≠ natural RGB scenes).
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.models as models

# ---------------------------------------------------------------------------
# Optional torchgeo import — graceful fallback if not installed
# ---------------------------------------------------------------------------
TORCHGEO_AVAILABLE = False
try:
    from torchgeo.models import ResNet50_Weights as TGWeights
    from torchgeo.models import resnet50 as tg_resnet50
    TORCHGEO_AVAILABLE = True
except ImportError:
    TGWeights = None
    tg_resnet50 = None


class ChannelAdapter(nn.Module):
    """
    Adapts N-channel input to 3-channel RGB expected by ImageNet ResNet50.

    Strategy:
      - 3-channel: pass through unchanged
      - 2-channel (SAR): replicate channel 0 to create 3-ch (R=G=VV, B=VH)
      - N>3 channel: use a learnable 1x1 conv to project to 3 channels

    Note: Only used in the ImageNet fallback path. The torchgeo path sets
    channel_adapter to nn.Identity() since torchgeo handles input channels natively.
    """

    def __init__(self, in_channels: int):
        super().__init__()
        self.in_channels = in_channels
        if in_channels not in (2, 3):
            # Learnable projection for unusual channel counts (e.g. 4-ch optical)
            self.proj = nn.Conv2d(in_channels, 3, kernel_size=1, bias=False)
        else:
            self.proj = None

    def forward(self, x):
        if self.in_channels == 3:
            return x
        elif self.in_channels == 2:
            # VV, VH -> R=VV, G=VV, B=VH
            return torch.cat([x[:, :1], x[:, :1], x[:, 1:]], dim=1)
        else:
            return self.proj(x)


class ResNet50Encoder(nn.Module):
    """
    ResNet50 encoder that returns L2-normalized 2048-d embeddings.

    Supports two initialization paths:
      - torchgeo_weights (preferred): Pass a TGWeights enum value for sensor-native init.
        e.g. ResNet50_Weights.SENTINEL1_GRD_MOCO for SAR,
             ResNet50_Weights.SENTINEL2_RGB_MOCO for optical.
      - ImageNet fallback: Used when torchgeo_weights=None. Uses pretrained=True for
        IMAGENET1K_V1 weights with ChannelAdapter for non-3-channel inputs.

    Args:
        in_channels: Number of input channels (2 for SAR, 3 or 4 for optical).
                     Ignored when torchgeo_weights is set (channels inferred from weights).
        pretrained: If True and torchgeo_weights is None, use ImageNet pretrained weights.
        freeze_backbone: If True, freeze all ResNet weights after init.
        embedding_dim: Output embedding dimension (2048 = ResNet50 pool output).
        torchgeo_weights: A torchgeo ResNet50_Weights enum for sensor-native init.
                          Example: from torchgeo.models import ResNet50_Weights
    """

    def __init__(
        self,
        in_channels: int = 3,
        pretrained: bool = True,
        freeze_backbone: bool = False,
        embedding_dim: int = 2048,
        torchgeo_weights=None,
    ):
        super().__init__()
        self.embedding_dim = embedding_dim

        if torchgeo_weights is not None:
            # ----------------------------------------------------------------
            # Path 1: torchgeo sensor-native weights (preferred)
            # ----------------------------------------------------------------
            if not TORCHGEO_AVAILABLE:
                raise ImportError(
                    "torchgeo is required for sensor-native weights. "
                    "Install with: pip install 'torchgeo>=0.5'"
                )
            native_chans = torchgeo_weights.meta.get("in_chans", in_channels)
            print(
                f"  [Encoder] torchgeo weights: {torchgeo_weights.name} "
                f"(native_chans={native_chans}, input_chans={in_channels})"
            )
            backbone_model = tg_resnet50(weights=torchgeo_weights)
            # Remove final avg-pool + FC to get (B, 2048, 1, 1) features
            self.backbone = nn.Sequential(*list(backbone_model.children())[:-1])

            if in_channels == native_chans:
                # Perfect match — no adapter needed
                self.channel_adapter = nn.Identity()
            else:
                # Channel mismatch (e.g. 4-ch input into 3-ch SENTINEL2_RGB_MOCO).
                # Insert a learnable ChannelAdapter (1x1 conv) to project input
                # channels to what the torchgeo backbone expects.
                # This keeps ALL input channels informative while using pretrained weights.
                self.channel_adapter = ChannelAdapter(in_channels)
                # Override: ChannelAdapter maps to 3-ch for the torchgeo RGB backbone
                if in_channels not in (2, 3):
                    # Re-create adapter projecting to native_chans instead of hardcoded 3
                    self.channel_adapter = nn.Sequential(
                        nn.Conv2d(in_channels, native_chans, kernel_size=1, bias=False)
                    )
                print(
                    f"  [Encoder] Channel adapter: {in_channels}→{native_chans} "
                    f"(learnable 1x1 conv)"
                )
            self.in_channels = in_channels
        else:
            # ----------------------------------------------------------------
            # Path 2: ImageNet pretrained (fallback)
            # ----------------------------------------------------------------
            self.in_channels = in_channels
            self.channel_adapter = ChannelAdapter(in_channels)
            weights = models.ResNet50_Weights.IMAGENET1K_V1 if pretrained else None
            backbone = models.resnet50(weights=weights)
            self.backbone = nn.Sequential(*list(backbone.children())[:-1])
            # Output: (B, 2048, 1, 1) after global average pooling

        if freeze_backbone:
            for param in self.backbone.parameters():
                param.requires_grad = False

        # Optional linear projection (identity when embedding_dim == 2048)
        if embedding_dim != 2048:
            self.projector = nn.Linear(2048, embedding_dim)
        else:
            self.projector = None

    def forward(self, x):
        """
        Args:
            x: Input tensor (B, C, H, W)
        Returns:
            embeddings: L2-normalized embeddings (B, embedding_dim)
        """
        x = self.channel_adapter(x)
        features = self.backbone(x)           # (B, 2048, 1, 1)
        features = features.flatten(1)        # (B, 2048)
        if self.projector is not None:
            features = self.projector(features)
        embeddings = F.normalize(features, p=2, dim=1)  # L2 normalize
        return embeddings


def get_device():
    """Return best available device: MPS > CUDA > CPU."""
    if torch.backends.mps.is_available():
        return torch.device("mps")
    elif torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


if __name__ == "__main__":
    device = get_device()
    print(f"Device: {device}")
    print(f"torchgeo available: {TORCHGEO_AVAILABLE}")

    if TORCHGEO_AVAILABLE:
        print("\n--- Testing torchgeo SAR encoder ---")
        from torchgeo.models import ResNet50_Weights
        sar_encoder = ResNet50Encoder(
            torchgeo_weights=ResNet50_Weights.SENTINEL1_GRD_MOCO
        ).to(device)
        dummy_sar = torch.randn(4, 2, 256, 256).to(device)
        emb = sar_encoder(dummy_sar)
        print(f"SAR embedding shape: {emb.shape}")       # (4, 2048)
        print(f"SAR embedding norms: {emb.norm(dim=1)}")  # all 1.0
        assert emb.shape == (4, 2048), f"Unexpected shape: {emb.shape}"
        print("PASS: torchgeo SAR encoder")

    print("\n--- Testing ImageNet fallback (SAR 2-ch) ---")
    sar_encoder_fb = ResNet50Encoder(in_channels=2, pretrained=True).to(device)
    dummy_sar = torch.randn(4, 2, 256, 256).to(device)
    emb = sar_encoder_fb(dummy_sar)
    print(f"SAR (fallback) shape: {emb.shape}")  # (4, 2048)
    assert emb.shape == (4, 2048)

    print("\n--- Testing ImageNet fallback (4-ch optical) ---")
    opt_encoder_fb = ResNet50Encoder(in_channels=4, pretrained=True).to(device)
    dummy_opt = torch.randn(4, 4, 256, 256).to(device)
    emb = opt_encoder_fb(dummy_opt)
    print(f"OPT 4-ch (fallback) shape: {emb.shape}")  # (4, 2048)
    assert emb.shape == (4, 2048)
    print("PASS: all encoder paths")

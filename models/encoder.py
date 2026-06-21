"""
ResNet50-based feature extractor for satellite image retrieval.

Produces L2-normalized 2048-d embeddings from either SAR (2-ch) or
optical (3-ch) inputs. Uses pretrained ImageNet weights as a strong
zero-shot baseline before contrastive fine-tuning.
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.models as models


class ChannelAdapter(nn.Module):
    """
    Adapts N-channel input to 3-channel RGB expected by ResNet50.

    Strategy:
      - 3-channel: pass through unchanged
      - 2-channel (SAR): replicate channel 0 to create 3-ch (R=G=VV, B=VH)
      - N>3 channel: use a 1x1 conv to project to 3 channels
    """

    def __init__(self, in_channels: int):
        super().__init__()
        self.in_channels = in_channels
        if in_channels not in (2, 3):
            # Learnable projection for unusual channel counts
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
    Pretrained ResNet50 encoder that returns L2-normalized embeddings.

    Args:
        in_channels: Number of input channels (2 for SAR, 3 for optical)
        pretrained: If True, use ImageNet pretrained weights
        freeze_backbone: If True, freeze all ResNet weights (useful for MVP)
        embedding_dim: Output embedding dimension (2048 = ResNet50 pool output)
    """

    def __init__(
        self,
        in_channels: int = 3,
        pretrained: bool = True,
        freeze_backbone: bool = False,
        embedding_dim: int = 2048,
    ):
        super().__init__()
        self.in_channels = in_channels
        self.embedding_dim = embedding_dim

        # Channel adapter (handles SAR 2-ch -> 3-ch)
        self.channel_adapter = ChannelAdapter(in_channels)

        # ResNet50 backbone (remove final FC layer)
        weights = models.ResNet50_Weights.IMAGENET1K_V1 if pretrained else None
        backbone = models.resnet50(weights=weights)
        self.backbone = nn.Sequential(*list(backbone.children())[:-1])
        # Output: (B, 2048, 1, 1) after global average pooling

        if freeze_backbone:
            for param in self.backbone.parameters():
                param.requires_grad = False

        # Optional projection head (identity by default)
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

    # Test SAR encoder
    sar_encoder = ResNet50Encoder(in_channels=2, pretrained=True).to(device)
    dummy_sar = torch.randn(4, 2, 256, 256).to(device)
    emb = sar_encoder(dummy_sar)
    print(f"SAR embedding shape: {emb.shape}")     # (4, 2048)
    print(f"SAR embedding norm: {emb.norm(dim=1)}")  # should all be 1.0

    # Test Optical encoder
    opt_encoder = ResNet50Encoder(in_channels=3, pretrained=True).to(device)
    dummy_opt = torch.randn(4, 3, 256, 256).to(device)
    emb = opt_encoder(dummy_opt)
    print(f"Optical embedding shape: {emb.shape}")  # (4, 2048)
    print(f"Optical embedding norm: {emb.norm(dim=1)}")

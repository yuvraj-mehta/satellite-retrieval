---
phase: 6
plan: 1
wave: 1
---

# Plan 6.1: Sensor-Native Backbones + Separate Projection Heads

## Objective

Replace the ImageNet-pretrained ResNet50 (wrong physics for SAR) with torchgeo's
`SENTINEL1_GRD_MOCO` weights for the SAR encoder and `SENTINEL2_RGB_MOCO` for the optical
encoder — these are pretrained specifically on Sentinel-1 and Sentinel-2 satellite imagery.

Simultaneously fix the shared projection head (architecturally incorrect — forced same linear
transform on different sensor physics) to use **separate** per-modality projection heads,
matching the CLIP architecture.

## Context
- `.gsd/SPEC.md`
- `.gsd/phases/6/RESEARCH.md`
- `models/encoder.py` — ResNet50Encoder, ChannelAdapter
- `models/dual_encoder.py` — DualEncoder, ProjectionHead, InfoNCELoss
- `requirements.txt`

## Tasks

<task type="auto">
  <name>Install torchgeo and verify available Sentinel weights</name>
  <files>requirements.txt</files>
  <action>
    1. Run `pip install torchgeo` inside the venv.
    2. Verify the following weight identifiers exist:
       - `torchgeo.models.ResNet50_Weights.SENTINEL1_GRD_MOCO`
       - `torchgeo.models.ResNet50_Weights.SENTINEL2_RGB_MOCO`
    3. Run: `python -c "from torchgeo.models import ResNet50_Weights; print([w for w in dir(ResNet50_Weights) if 'SENTINEL' in w])"`
    4. Add `torchgeo>=0.5` to `requirements.txt`.
    5. Document the exact available weight names in a comment in `models/encoder.py`.

    DO NOT modify any model code in this task — only install and verify.
  </action>
  <verify>python -c "from torchgeo.models import ResNet50_Weights, resnet50; w=ResNet50_Weights.SENTINEL1_GRD_MOCO; print('SAR weights in_chans:', w.meta['in_chans'])"</verify>
  <done>Command prints `SAR weights in_chans: 2` (or the correct channel count for S1 GRD). No ImportError.</done>
</task>

<task type="auto">
  <name>Update ResNet50Encoder to support torchgeo sensor-native weights</name>
  <files>models/encoder.py</files>
  <action>
    Modify `ResNet50Encoder.__init__` to accept an optional `torchgeo_weights` parameter.

    New signature:
    ```python
    def __init__(self, in_channels=3, pretrained=True, freeze_backbone=False,
                 embedding_dim=2048, torchgeo_weights=None):
    ```

    Logic:
    - If `torchgeo_weights` is not None:
      - Import `from torchgeo.models import resnet50 as tg_resnet50`
      - Build model: `backbone_model = tg_resnet50(weights=torchgeo_weights)`
      - Strip final FC: `self.backbone = nn.Sequential(*list(backbone_model.children())[:-1])`
      - Set `self.channel_adapter = nn.Identity()` (torchgeo handles input channels natively)
      - Print: `f"Using torchgeo weights: {torchgeo_weights.name}, in_chans={torchgeo_weights.meta['in_chans']}"`
    - Else: keep existing ImageNet path (no change to the existing behaviour)

    The `ChannelAdapter` class stays in the file — it's still the fallback for the ImageNet path.
    Do NOT remove it.

    Add a module-level constant at the top of `encoder.py`:
    ```python
    TORCHGEO_AVAILABLE = False
    try:
        from torchgeo.models import ResNet50_Weights as TGWeights
        TORCHGEO_AVAILABLE = True
    except ImportError:
        TGWeights = None
    ```
  </action>
  <verify>python -c "
from models.encoder import ResNet50Encoder, TORCHGEO_AVAILABLE
print('torchgeo available:', TORCHGEO_AVAILABLE)
if TORCHGEO_AVAILABLE:
    from torchgeo.models import ResNet50_Weights
    enc = ResNet50Encoder(torchgeo_weights=ResNet50_Weights.SENTINEL1_GRD_MOCO)
    import torch
    x = torch.randn(2, 2, 256, 256)
    out = enc(x)
    print('Output shape:', out.shape)
    assert out.shape == (2, 2048), f'Expected (2,2048) got {out.shape}'
    print('PASS')
"</verify>
  <done>Script prints `PASS` and output shape is `(2, 2048)`. No errors.</done>
</task>

<task type="auto">
  <name>Fix DualEncoder: separate projection heads + torchgeo backbone init</name>
  <files>models/dual_encoder.py</files>
  <action>
    **Change 1 — Separate projection heads** (the architectural fix):
    Replace the single `self.projector` with two modality-specific projectors:
    ```python
    # OLD (wrong — shared head)
    self.projector = ProjectionHead(2048, 1024, embedding_dim)

    # NEW (correct — CLIP-style separate heads)
    self.sar_projector = ProjectionHead(2048, 1024, embedding_dim)
    self.opt_projector = ProjectionHead(2048, 1024, embedding_dim)
    ```

    Update `encode_sar` to use `self.sar_projector(feat)`.
    Update `encode_optical` to use `self.opt_projector(feat)`.

    **Change 2 — torchgeo backbone init** (the physics fix):
    Add `use_torchgeo: bool = True` parameter to `DualEncoder.__init__`.

    If `use_torchgeo=True` AND `TORCHGEO_AVAILABLE`:
    ```python
    from torchgeo.models import ResNet50_Weights
    self.sar_backbone = ResNet50Encoder(
        torchgeo_weights=ResNet50_Weights.SENTINEL1_GRD_MOCO
    )
    self.opt_backbone = ResNet50Encoder(
        torchgeo_weights=ResNet50_Weights.SENTINEL2_RGB_MOCO
    )
    ```
    Else: fallback to the existing ImageNet path (keep the existing code path, just wrap it in else).

    IMPORTANT: The `InfoNCELoss` class is NOT touched. Only change `DualEncoder` and update
    the `__main__` smoke test to verify both projectors are present and have different parameters.

    Update the docstring: note that heads are now separate (CLIP-style), not shared.
  </action>
  <verify>python -c "
from models.dual_encoder import DualEncoder, InfoNCELoss
import torch
model = DualEncoder(embedding_dim=512, pretrained=True)
# Verify separate heads
sar_params = set(id(p) for p in model.sar_projector.parameters())
opt_params = set(id(p) for p in model.opt_projector.parameters())
assert sar_params.isdisjoint(opt_params), 'Projectors still share parameters!'
sar = torch.randn(4, 2, 64, 64)
opt = torch.randn(4, 3, 64, 64)
se, oe = model(sar, opt)
assert se.shape == (4, 512)
assert oe.shape == (4, 512)
loss_fn = InfoNCELoss()
loss = loss_fn(se, oe)
assert not torch.isnan(loss)
print('PASS: separate projectors, shapes correct, loss not NaN')
"</verify>
  <done>Script prints `PASS`. `sar_projector` and `opt_projector` have disjoint parameter sets. Forward pass produces (4, 512) embeddings with non-NaN InfoNCE loss.</done>
</task>

## Success Criteria
- [ ] `torchgeo` installed and importable in venv
- [ ] `ResNet50Encoder` supports `torchgeo_weights` argument with graceful fallback
- [ ] `DualEncoder` uses `sar_projector` and `opt_projector` (separate weights, not shared)
- [ ] All existing training infrastructure (`train.py`) still works unchanged
- [ ] Smoke test passes: forward pass + InfoNCE loss on random tensors

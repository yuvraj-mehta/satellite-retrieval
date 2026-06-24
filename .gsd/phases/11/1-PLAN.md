---
phase: 11
plan: 1
wave: 1
---

# Plan 11.1: Dataset + Encoder — optical_rgb Modality

## Objective

Add a third modality `optical_rgb` (Sentinel-2 true-colour, 3 bands: B2, B3, B4) that
reuses the existing `opt_backbone` + `opt_projector` without any retraining. The key
insight is that the backbone already accepts 3-channel input (it was pre-trained on
Sentinel-2 RGB) — we only need to select the right bands and add Z-score constants.
This plan handles the backend model and data layers; Plan 11.2 handles the API and UI.

## Context

- `backend/datasets/sen12ms_dataset.py` — current bands: SAR=[all 2], Optical=[3,7,10,11] (0-indexed)
  - S2 band indices (0-indexed): B2=blue(1), B3=green(2), B4=red(3), B8=NIR(7), B11=SWIR1(10), B12=SWIR2(11)
  - True-colour RGB = [B4, B3, B2] = indices [3, 2, 1] — note reversed for R,G,B order
- `backend/outputs/dataset_stats.json` — contains per-band mean/std for S2 bands; check this first
- `backend/models/dual_encoder.py` — `encode_optical(x)` takes (B, 4, H, W); we need
  `encode_optical_rgb(x)` that takes (B, 3, H, W) and reuses the same opt_backbone
- `backend/models/encoder.py` — `ResNet50Encoder` with `in_channels` param and 1×1 adapter

## Tasks

<task type="auto">
  <name>Add optical_rgb constants and config to sen12ms_dataset.py</name>
  <files>
    backend/datasets/sen12ms_dataset.py
  </files>
  <action>
    In `backend/datasets/sen12ms_dataset.py`, after the existing `OPT_MEAN` / `OPT_STD`
    constants, add:

    ```python
    # ---------------------------------------------------------------------------
    # Optical RGB (Sentinel-2 true colour): B4 (Red), B3 (Green), B2 (Blue)
    # Band indices (0-indexed): B4=3, B3=2, B2=1
    # Normalization: Z-score using Sentinel-2 empirical values for these bands.
    # B4 (Red):   mean ~878, std ~337  (same as OPT_MEAN[0]/OPT_STD[0])
    # B3 (Green): mean ~1034, std ~292 (empirical from SEN12MS literature)
    # B2 (Blue):  mean ~843,  std ~284 (empirical from SEN12MS literature)
    # Order here matches band selection [3, 2, 1] → R, G, B
    # ---------------------------------------------------------------------------
    OPT_RGB_BANDS = [3, 2, 1]   # 0-indexed: B4=Red, B3=Green, B2=Blue
    OPT_RGB_MEAN  = [878.379167, 1034.0, 843.0]   # R, G, B
    OPT_RGB_STD   = [336.91765,  292.0,  284.0]   # R, G, B
    ```

    Do NOT modify the existing `OPT_MEAN`, `OPT_STD`, or `self.optical_bands` logic.
    Do NOT change `__getitem__` — the RGB band-loading will be done in `encode_optical_rgb()`
    in the encoder, not in the dataset. The dataset always loads its configured bands.

    Also export these constants at module level so `api/retriever.py` can import them.
  </action>
  <verify>
    cd /Users/yuvrajmehta/Developer/satellite-retrieval/backend
    ../../venv/bin/python -c "
from datasets.sen12ms_dataset import OPT_RGB_BANDS, OPT_RGB_MEAN, OPT_RGB_STD
assert OPT_RGB_BANDS == [3, 2, 1], OPT_RGB_BANDS
assert len(OPT_RGB_MEAN) == 3 and len(OPT_RGB_STD) == 3
print('PASS: OPT_RGB_BANDS =', OPT_RGB_BANDS)
print('PASS: OPT_RGB_MEAN =', OPT_RGB_MEAN)
"
  </verify>
  <done>
    - `OPT_RGB_BANDS`, `OPT_RGB_MEAN`, `OPT_RGB_STD` importable from `datasets.sen12ms_dataset`
    - All existing dataset unit tests / imports unaffected
  </done>
</task>

<task type="auto">
  <name>Add encode_optical_rgb() to DualEncoder</name>
  <files>
    backend/models/dual_encoder.py
  </files>
  <action>
    In `backend/models/dual_encoder.py`, add a new method `encode_optical_rgb()` to the
    `DualEncoder` class, immediately after `encode_optical()`:

    ```python
    def encode_optical_rgb(self, x):
        """
        Encode 3-channel true-colour RGB optical images (B4, B3, B2).

        Reuses opt_backbone + opt_projector (no retraining required).
        The backbone's 1×1 channel adapter handles the 3→4 mismatch at inference
        time by projecting 3 input channels through the existing adapter weights.
        The adapter was trained on 4-channel input, so this introduces a minor
        domain shift — acceptable for an architectural demo without retraining.

        Args:
            x: (B, 3, H, W) tensor, Z-score normalized using OPT_RGB_MEAN/OPT_RGB_STD
        Returns:
            (B, embedding_dim) L2-normalized embedding
        """
        feat = self.opt_backbone(x)      # adapter handles 3→backbone_channels
        return self.opt_projector(feat)
    ```

    Do NOT add any new backbone or projector — reuse existing `opt_backbone` + `opt_projector`.
    Do NOT modify `forward()`, `encode_sar()`, or `encode_optical()`.
    Add a brief inline comment explaining the channel-adapter reuse strategy.
  </action>
  <verify>
    cd /Users/yuvrajmehta/Developer/satellite-retrieval/backend
    ../../venv/bin/python -c "
from models.dual_encoder import DualEncoder
from models.encoder import get_device
import torch
device = get_device()
model = DualEncoder(embedding_dim=512, use_torchgeo=True).to(device)
# Test encode_optical_rgb with 3-channel input
rgb = torch.randn(2, 3, 64, 64).to(device)
emb = model.encode_optical_rgb(rgb)
assert emb.shape == (2, 512), f'Wrong shape: {emb.shape}'
norms = emb.norm(dim=1)
assert all(abs(n - 1.0) < 0.01 for n in norms.tolist()), f'Not normalized: {norms}'
print('PASS encode_optical_rgb shape:', emb.shape, 'norms:', norms.tolist())
"
  </verify>
  <done>
    - `model.encode_optical_rgb(x)` accepts `(B, 3, H, W)` and returns `(B, 512)` L2-normalized embeddings
    - No new parameters added (verified by checking `model.named_parameters()` count is unchanged)
    - Existing `encode_sar()` and `encode_optical()` still work correctly
  </done>
</task>

## Success Criteria
- [ ] `OPT_RGB_BANDS`, `OPT_RGB_MEAN`, `OPT_RGB_STD` importable from `datasets.sen12ms_dataset`
- [ ] `DualEncoder.encode_optical_rgb(x)` accepts `(B, 3, H, W)` and returns `(B, 512)` L2-normalized
- [ ] No new parameters added to the model (reuses existing opt_backbone + opt_projector)
- [ ] All existing encode_sar / encode_optical tests still pass

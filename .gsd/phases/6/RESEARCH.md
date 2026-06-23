# RESEARCH.md — Phase 6: Architectural & Scientific Hardening

## Findings

### Fix 1: Backbone — Replace ImageNet ResNet50 with torchgeo Sensor-Native Weights

**Finding**: torchgeo provides ResNet50 pretrained specifically on Sentinel-1 GRD (2-ch VV/VH):
- `ResNet50_Weights.SENTINEL1_GRD_MOCO` — SAR-pretrained via MoCo self-supervised learning
- `ResNet50_Weights.SENTINEL1_GRD_DECUR` — SAR-pretrained via DeCUR cross-modal learning
- `ResNet50_Weights.SENTINEL2_RGB_MOCO` — Optical pretrained on Sentinel-2 RGB
- `ResNet50_Weights.SENTINEL2_ALL_MOCO` — Optical pretrained on all 13 S2 bands

**Usage pattern**:
```python
from torchgeo.models import ResNet50_Weights, resnet50

sar_weights = ResNet50_Weights.SENTINEL1_GRD_MOCO
model = resnet50(weights=sar_weights)
# in_chans is auto-set from weights.meta['in_chans']
```

**Key**: torchgeo's `resnet50` wrapper handles channel configuration automatically via weights metadata.
ChannelAdapter becomes unnecessary for the sensor-native path (2-ch SAR, 13-ch optical).

**Installation**: `pip install torchgeo` — check compatibility with Python 3.11, PyTorch 2.x

---

### Fix 2: Architecture — Separate Projection Heads Per Modality (CLIP-style)

**Finding**: CLIP, ALIGN, and SigLIP all use separate encoders with separate projection heads.
A shared projection head forces the same linear transformation on fundamentally different
feature distributions (radar backscatter vs. solar radiance). This is architecturally wrong.

**Correct pattern**:
```
SAR Backbone → SAR ProjectionHead (2048→1024→512) ──┐
                                                      ├── InfoNCE aligns the output space
OPT Backbone → OPT ProjectionHead (2048→1024→512) ──┘
```

**Change**: In `dual_encoder.py`, replace single shared `self.projector` with
`self.sar_projector` and `self.opt_projector` (same architecture, different weights).
This doubles the projector parameter count by ~2M params — trivially acceptable.

---

### Fix 3: Optical Input — Add NIR+SWIR Bands (B4, B8, B11, B12 = 4-channel)

**Finding**: Research consensus is that NIR (B8) and SWIR (B11, B12) are the most
complementary Sentinel-2 bands for SAR cross-modal alignment because:
- SAR is sensitive to vegetation structure ↔ NIR captures vegetation health
- SAR is sensitive to soil moisture ↔ SWIR is sensitive to water content
- RGB alone discards the primary differentiating information

**Practical decision**: Use 4-channel optical input: B4 (Red), B8 (NIR), B11 (SWIR1), B12 (SWIR2).
This is compatible with torchgeo's `SENTINEL2_ALL_MOCO` weights (which handle 13 bands) by
selecting 4 of the 13 bands. In the dataset loader, change `optical_bands` default from
[3, 2, 1] (RGB) to [3, 7, 10, 11] (0-indexed: B4=3, B8=7, B11=10, B12=11).

Note: torchgeo S2 weights using all 13 bands require selecting bands from the pretrained
weight's channel ordering. Alternatively, re-initialize only the first layer of the pretrained
model to accept 4 channels using standard partial weight loading.

**Simple approach**: Keep ChannelAdapter's learnable 1×1 conv path for 4-ch → 3-ch if using
ImageNet init, OR use torchgeo 13-channel weights and select 4 bands at dataloader time.

---

### Fix 4: SAR Normalization — Use Dataset Statistics Instead of Hardcoded [-25, 0] dB

**Finding**: The hardcoded [-25, 0] dB clip range is too narrow. Sentinel-1 GRD products:
- Smooth water bodies can reach -35 dB (clipped to 0 in current code)
- Urban corner reflectors can exceed +5 dB (clipped to 1 in current code)
- Typical land surfaces: -20 to -5 dB (mostly unaffected)

**Fix**: Compute per-band mean and std from the actual dataset. Use Z-score normalization:
```python
s1 = (s1 - sar_mean) / (sar_std + 1e-6)  # per-band
```
Or use the broader documented range [-50, 1] dB which clips nothing in the dataset.

**Practical approach**: Compute actual stats with a one-time scan script, bake into dataset loader
as constants (mean/std per band), so it's reproducible without requiring a pre-pass at runtime.

---

### Fix 5: Evaluation — Exclude Query from Gallery (Leave-One-Out)

**Finding**: The current evaluation places every query in the gallery, so same-modal retrieval
trivially finds itself at Rank 1 with similarity 1.0. This inflates same-modal F1 and makes the
metric meaningless for measuring semantic similarity.

**Fix**: In `evaluate.py`, when building the gallery for same-modal search, remove the query
vector from the gallery before searching. For cross-modal this is not an issue (modality mismatch).

**Implementation**: Pass a `exclude_idx` parameter to the search that skips the self-match.
FAISS `IndexFlatIP` doesn't support this natively — filter in post-processing:
```python
# Filter out self-match after retrieval
results = [r for r in results if r['metadata_key'] != query_key][:k]
```

---

### Fix 6: Training — Add LR Warmup + Adjust Temperature

**Finding**:
- Temperature: Research recommends τ=0.1 for batch size ≤64 (vs. 0.07 for ≥256). Start at 0.1.
- Warmup: Linear warmup for 3-5 epochs is standard for contrastive fine-tuning of pretrained models.
  Prevents destroying pretrained features before the projection head stabilizes.

**Implementation** in `train.py`:
- Add `--warmup-epochs 5` argument
- Use `torch.optim.lr_scheduler.LinearLR` for warmup, then `CosineAnnealingLR`
- Chain with `SequentialLR`
- Change default `--temperature` to 0.1

---

### Additional Metric: MRR (Mean Reciprocal Rank)

**Finding**: MRR is a standard retrieval metric that rewards finding the relevant item at higher
ranks. Unlike F1@K which is binary (in/out of top-K), MRR = mean(1/rank_of_first_hit).
This gives a more nuanced view of retrieval quality. Should be added alongside F1@K.

---

## Decision Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| SAR backbone init | torchgeo SENTINEL1_GRD_MOCO | Physics-correct pretraining |
| OPT backbone init | torchgeo SENTINEL2_RGB_MOCO or ImageNet | Depends on torchgeo install |
| Projection heads | Separate per modality | CLIP-correct architecture |
| Optical bands | 4-ch: B4+B8+B11+B12 | SAR-complementary bands |
| SAR normalization | Dataset statistics (per-band mean/std) | Empirically correct |
| Evaluation gallery | Exclude self-match | Correct IR practice |
| Temperature | 0.1 (was 0.07) | Appropriate for batch=32 |
| LR warmup | 5 epochs linear | Standard contrastive fine-tuning |

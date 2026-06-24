# Phase 6.2 Execution Summary — Multispectral Optical Input + Correct SAR Normalization

## Status: ✅ COMPLETE

## What was done

### Task 1: Created `scripts/compute_dataset_stats.py`
- Iterates all 1167 SEN12MS pairs with `normalize=False` (raw values)
- Uses Welford online algorithm for memory-efficient mean/std computation
- Computes per-band stats for SAR (VV, VH) and optical (B4, B8, B11, B12)
- Saves `outputs/dataset_stats.json` and prints Python-ready constants

### Empirical statistics from actual dataset:
```python
SAR_MEAN = [-11.476286, -17.751606]   # dB (VV, VH)
SAR_STD  = [3.257546,   3.956914]     # dB (VV, VH)
# Key finding: VV mean=-11.5 dB, VH mean=-17.8 dB
# Old hardcoded clip: [-25, 0] dB → most urban pixels clipped to 1.0

OPT_MEAN = [878.38, 1933.12, 32.40, 1912.59]  # raw uint16 (B4, B8, B11, B12)
OPT_STD  = [336.92, 492.11,  20.41, 501.81]
# Key finding: B11 SWIR1 range is 6-91 (tiny vs B8 range 544-4551)
# Old /10000 normalization left B11 with values 0.0006-0.0091 (near-zero)
# Z-score fixes this: all bands normalized to mean≈0, std≈1
```

### Task 2: Updated `datasets/sen12ms_dataset.py`
- Baked empirical constants as module-level `SAR_MEAN`, `SAR_STD`, `OPT_MEAN`, `OPT_STD`
- **SAR normalization**: Z-score per band (OLD: clip to [-25,0] then /25 → [0,1])
- **Default optical bands**: Changed from `[3, 2, 1]` (RGB) to `[3, 7, 10, 11]` (B4+B8+B11+B12)
- **Optical normalization**: Z-score per band (OLD: /10000 flat — broke B11 scale)
- `optical_bands` argument preserved for custom overrides
- Updated all docstrings to explain band selection rationale

### Updated `scripts/verify_dataset.py`
- Asserts optical shape is `(4, 256, 256)` (not `(3, 256, 256)`)
- Asserts SAR min < 0 (confirms Z-scoring, not [0,1] clipping)
- Adds per-band mean sanity check (Z-scored mean should be ≈ 0)
- Adds NaN detection

## Verification Results
```
[OK] Pair count: 1167 (expected 1167)
[OK] SAR shape:     (2, 256, 256)  (2-ch: VV, VH)
[OK] Optical shape: (4, 256, 256)  (4-ch: B4, B8, B11, B12)
[OK] SAR Z-scored:     min=-1.4674, max=3.0908 (NOT clipped to [0,1])
[OK] Optical Z-scored: min=-1.4733, max=1.7405
[OK] All (scene_id, patch_id) pairs are unique
[OK] No NaN values in first 5 samples
ALL CHECKS PASSED ✓
```

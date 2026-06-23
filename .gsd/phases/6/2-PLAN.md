---
phase: 6
plan: 2
wave: 1
---

# Plan 6.2: Multispectral Optical Input + Correct SAR Normalization

## Objective

Two scientific data fixes:
1. Expand optical input from 3-channel RGB to 4-channel (B4+B8+B11+B12) using the
   SAR-complementary NIR and SWIR bands, unlocking the primary advantage of Sentinel-2.
2. Fix SAR normalization from the hardcoded [-25, 0] dB clip to empirically computed
   per-band statistics (mean/std) that don't destroy information at the extremes.

Both changes are confined to the dataset layer and a new statistics script — no model changes.

## Context
- `.gsd/SPEC.md`
- `.gsd/phases/6/RESEARCH.md`
- `datasets/sen12ms_dataset.py` — dataset loader with hardcoded normalization
- `scripts/verify_dataset.py` — health check script

## Tasks

<task type="auto">
  <name>Compute SAR per-band statistics from actual dataset</name>
  <files>scripts/compute_dataset_stats.py</files>
  <action>
    Create a NEW script `scripts/compute_dataset_stats.py` that:
    1. Loads the full SEN12MSDataset with `normalize=False` (raw dB values)
    2. Iterates all 1167 pairs, accumulates SAR per-band (VV=ch0, VH=ch1) min, max, mean, std
    3. Also accumulates optical per-band stats for the 4 selected bands
    4. Prints a Python-ready constants block and saves to `outputs/dataset_stats.json`:

    Expected output format:
    ```
    # Paste into datasets/sen12ms_dataset.py
    SAR_MEAN = [mean_VV, mean_VH]   # dB
    SAR_STD  = [std_VV,  std_VH]    # dB
    OPT_MEAN = [mean_B4, mean_B8, mean_B11, mean_B12]  # /10000 scale
    OPT_STD  = [std_B4,  std_B8,  std_B11,  std_B12]
    ```

    Script must:
    - Use `normalize=False` in the dataset to get raw values
    - Read 4 optical bands: indices [3, 7, 10, 11] (0-indexed B4, B8, B11, B12)
    - Use Welford online algorithm OR just collect all values and call numpy mean/std
    - Save JSON: `{"sar_mean": [...], "sar_std": [...], "opt_mean": [...], "opt_std": [...]}`
    - Print exact values to copy into the dataset loader

    Handle missing B8/B11/B12 gracefully: if the SEN12MS subset only has 13-band S2,
    rasterio reads by band index so indices work. If fewer bands exist, print a warning.
  </action>
  <verify>python scripts/compute_dataset_stats.py --data data/sen12ms-subset 2>&1 | tail -20</verify>
  <done>Script prints 4 float values each for SAR_MEAN, SAR_STD, OPT_MEAN, OPT_STD.
`outputs/dataset_stats.json` exists with all 4 keys. No NaN values in output.</done>
</task>

<task type="auto">
  <name>Update dataset loader: 4-channel optical + statistics-based SAR normalization</name>
  <files>datasets/sen12ms_dataset.py</files>
  <action>
    **Part A — SAR normalization fix**:
    After running `compute_dataset_stats.py`, copy the printed constants into the top of
    `sen12ms_dataset.py` as module-level constants. Then change `__getitem__` normalization:

    Replace:
    ```python
    # OLD
    s1 = np.clip(s1, -25.0, 0.0)
    s1 = (s1 + 25.0) / 25.0
    ```
    With:
    ```python
    # NEW — per-band Z-score normalization using empirical stats
    for i in range(s1.shape[0]):
        s1[i] = (s1[i] - SAR_MEAN[i]) / (SAR_STD[i] + 1e-6)
    ```

    **Part B — 4-channel optical input**:
    Change the default value of `optical_bands` from `[3, 2, 1]` to `[3, 7, 10, 11]`
    (0-indexed: B4=index 3, B8=index 7, B11=index 10, B12=index 11).

    Update the docstring to document the new default band selection and the reason:
    "B4 (Red), B8 (NIR), B11 (SWIR1), B12 (SWIR2) — chosen for SAR-optical complementarity."

    IMPORTANT: Keep `optical_bands` as a constructor argument so callers can still pass
    custom bands. Only the DEFAULT changes. The `ChannelAdapter` in the encoder handles
    4-ch → 3-ch projection if using ImageNet weights.

    Also update `optical_bands` Z-score normalization using `OPT_MEAN` and `OPT_STD`
    instead of dividing by 10000 flat — or keep the /10000 for optical (since it's already
    a calibrated reflectance scale) and add Z-score only for SAR. Document the choice.

    **Part C — update verify_dataset.py**:
    Update `scripts/verify_dataset.py` to assert:
    - Optical shape is `(4, H, W)` not `(3, H, W)`
    - SAR values are not clipped to [0, 1] (they are now Z-scored, so mean ≈ 0)
  </action>
  <verify>python scripts/verify_dataset.py 2>&1</verify>
  <done>verify_dataset.py passes all assertions. Optical tensor shape is (4, 256, 256).
SAR tensor has values outside [0, 1] (Z-scored). No assertion errors.</done>
</task>

## Success Criteria
- [ ] `scripts/compute_dataset_stats.py` runs and produces `outputs/dataset_stats.json`
- [ ] SAR normalization uses per-band Z-score from actual data (not hardcoded [-25, 0] clip)
- [ ] Default optical input is 4-channel (B4, B8, B11, B12) — NIR and SWIR included
- [ ] `verify_dataset.py` passes with new assertions for 4-ch optical shape
- [ ] Dataset loader `optical_bands` argument still works for custom overrides

# Plan 1.1 Summary

## What Was Done

Rewrote `datasets/sen12ms_dataset.py` with the correct pairing logic.

## Root Cause Fixed

The old code did `s1_path.replace("/s1_", "/s2_")` — this searched for S2 inside the S1 directory, which doesn't exist. SAR and optical are in separate top-level directories.

## Implementation

- Added `_PATCH_RE = re.compile(r"ROIs\d+_\w+_(s[12])_(\d+)_p(\d+)\.tif")` to parse filenames
- Built an S2 lookup dict keyed by `(scene_id, patch_id)` from `ROIs2017_winter_s2/`
- Matched each S1 file against this lookup
- Added SAR normalization: dB [-25, 0] → [0, 1]
- Added optical normalization: uint16 [0, 10000] → [0, 1] (divide by 10000, clip)
- Selected RGB bands by default (B4/B3/B2 = indices 3/2/1 from 13-band S2)
- Added `scene_id` and `patch_id` to sample output

## Verification

```
Found 1167 paired samples
SAR shape: torch.Size([2, 256, 256])
Optical shape: torch.Size([3, 256, 256])
SAR min/max: 0.0752 0.9437
Optical min/max: 0.0382 0.1150
PASS: Dataset loader working, found 1167 pairs
```

## Files Changed

- `datasets/sen12ms_dataset.py` — complete rewrite

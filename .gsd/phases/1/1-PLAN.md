---
phase: 1
plan: 1
wave: 1
---

# Plan 1.1: Fix SEN12MSDataset Pairing Logic

## Objective

The existing `datasets/sen12ms_dataset.py` uses a string-replace approach that fails because S1 and S2 files live in **completely separate top-level directories**, not within the same folder tree. This plan rewrites the dataset loader with the correct path logic and adds normalization.

## Root Cause (confirmed by inspection)

```
Actual structure:
  data/sen12ms-subset/ROIs2017_winter_s1/s1_{scene}/ROIs2017_winter_s1_{scene}_p{patch}.tif
  data/sen12ms-subset/ROIs2017_winter_s2/s2_{scene}/ROIs2017_winter_s2_{scene}_p{patch}.tif

Old (broken) code searched:
  s2_path = s1_path.replace("/s1_", "/s2_").replace("_s1_", "_s2_")
  # This produced paths still inside ROIs2017_winter_s1/ — which don't exist
```

Correct approach: glob all S1 files, extract `(scene_id, patch_id)` from the filename, construct the corresponding S2 path using the known directory pattern.

## Context

- `datasets/sen12ms_dataset.py` — file to rewrite
- `check_dataset.py` — shows working hardcoded paths confirming the pattern
- `data/sen12ms-subset/` — actual data directory structure

## Tasks

<task type="auto">
  <name>Rewrite SEN12MSDataset with correct pairing logic and normalization</name>
  <files>datasets/sen12ms_dataset.py</files>
  <action>
    Replace the entire file with the following implementation:

    ```python
    from pathlib import Path
    import re
    import rasterio
    import numpy as np
    import torch
    from torch.utils.data import Dataset


    # SEN12MS patch filename pattern:
    # ROIs2017_winter_s1_21_p302.tif
    # Group 1: sensor (s1/s2), Group 2: scene_id, Group 3: patch_id
    _PATCH_RE = re.compile(r"ROIs\d+_\w+_(s[12])_(\d+)_p(\d+)\.tif")


    def _parse_patch_id(path: Path):
        """Extract (sensor, scene_id, patch_id) from a SEN12MS filename."""
        m = _PATCH_RE.match(path.name)
        if m is None:
            return None
        return m.group(1), m.group(2), m.group(3)


    class SEN12MSDataset(Dataset):
        """
        Loads paired SAR (Sentinel-1) and optical (Sentinel-2) patches
        from the SEN12MS dataset subset.

        Directory structure expected:
            root_dir/
              ROIs2017_winter_s1/
                s1_{scene}/
                  ROIs2017_winter_s1_{scene}_p{patch}.tif
              ROIs2017_winter_s2/
                s2_{scene}/
                  ROIs2017_winter_s2_{scene}_p{patch}.tif

        Args:
            root_dir: Path to the sen12ms-subset directory
            sar_bands: Which SAR bands to load (None = all 2 bands)
            optical_bands: Which optical band indices to load (0-indexed).
                           Default [3, 2, 1] = B4 (Red), B3 (Green), B2 (Blue)
            normalize: If True, normalize SAR and optical to [0, 1]
        """

        def __init__(
            self,
            root_dir,
            sar_bands=None,
            optical_bands=None,
            normalize=True,
        ):
            self.root_dir = Path(root_dir)
            self.sar_bands = sar_bands        # None = load all
            self.optical_bands = optical_bands or [3, 2, 1]  # RGB from 13-band S2
            self.normalize = normalize

            # Build a lookup: (scene_id, patch_id) -> s2_path
            s2_lookup = {}
            s2_root = self.root_dir / "ROIs2017_winter_s2"
            for s2_path in s2_root.rglob("*.tif"):
                parsed = _parse_patch_id(s2_path)
                if parsed is None:
                    continue
                _, scene_id, patch_id = parsed
                s2_lookup[(scene_id, patch_id)] = s2_path

            # Match every S1 file to its S2 counterpart
            self.samples = []
            s1_root = self.root_dir / "ROIs2017_winter_s1"
            missing_pairs = 0
            for s1_path in sorted(s1_root.rglob("*.tif")):
                parsed = _parse_patch_id(s1_path)
                if parsed is None:
                    continue
                _, scene_id, patch_id = parsed
                s2_path = s2_lookup.get((scene_id, patch_id))
                if s2_path is not None:
                    self.samples.append((s1_path, s2_path, scene_id, patch_id))
                else:
                    missing_pairs += 1

            print(f"Found {len(self.samples)} paired samples")
            if missing_pairs > 0:
                print(f"WARNING: {missing_pairs} S1 files had no matching S2 file")

        def __len__(self):
            return len(self.samples)

        def __getitem__(self, idx):
            s1_path, s2_path, scene_id, patch_id = self.samples[idx]

            with rasterio.open(s1_path) as src:
                if self.sar_bands is not None:
                    s1 = src.read(self.sar_bands)
                else:
                    s1 = src.read()  # Shape: (2, H, W)

            with rasterio.open(s2_path) as src:
                # rasterio bands are 1-indexed; optical_bands are 0-indexed
                bands_1indexed = [b + 1 for b in self.optical_bands]
                s2 = src.read(bands_1indexed)  # Shape: (len(optical_bands), H, W)

            s1 = s1.astype(np.float32)
            s2 = s2.astype(np.float32)

            if self.normalize:
                # SAR (dB values typically in [-25, 0]): clip and map to [0, 1]
                s1 = np.clip(s1, -25.0, 0.0)
                s1 = (s1 + 25.0) / 25.0

                # Optical (uint16, typical range [0, 10000]): divide by 10000, clip
                s2 = np.clip(s2 / 10000.0, 0.0, 1.0)

            s1_tensor = torch.tensor(s1, dtype=torch.float32)
            s2_tensor = torch.tensor(s2, dtype=torch.float32)

            return {
                "sar": s1_tensor,          # (2, H, W) or (sar_bands, H, W)
                "optical": s2_tensor,      # (3, H, W) default (RGB)
                "sar_path": str(s1_path),
                "optical_path": str(s2_path),
                "scene_id": scene_id,
                "patch_id": patch_id,
            }
    ```

    Key changes from old code:
    - Build S2 lookup dict keyed by (scene_id, patch_id) parsed from filename
    - Match S1 files to S2 via this lookup (correct cross-directory pairing)
    - Add `scene_id` and `patch_id` to output (needed for evaluation ground truth)
    - Normalize SAR from dB range [-25, 0] → [0, 1]
    - Normalize Optical from uint16 [0, 10000] → [0, 1]
    - Select only RGB bands from 13-band S2 by default (for ResNet50 compatibility)
  </action>
  <verify>
    cd /Users/yuvrajmehta/Developer/satellite-retrieval
    source venv/bin/activate
    python -c "
from datasets.sen12ms_dataset import SEN12MSDataset
ds = SEN12MSDataset('data/sen12ms-subset')
assert len(ds) == 1167, f'Expected 1167 pairs, got {len(ds)}'
sample = ds[0]
assert 'sar' in sample and 'optical' in sample
assert 'scene_id' in sample and 'patch_id' in sample
print('SAR shape:', sample['sar'].shape)
print('Optical shape:', sample['optical'].shape)
print('SAR min/max:', sample['sar'].min().item(), sample['sar'].max().item())
print('Optical min/max:', sample['optical'].min().item(), sample['optical'].max().item())
print('PASS: Dataset loader working, found', len(ds), 'pairs')
"
  </verify>
  <done>
    - `Found 1167 paired samples` printed (no warnings)
    - SAR tensor shape: `(2, H, W)` with values in [0, 1]
    - Optical tensor shape: `(3, H, W)` with values in [0, 1]
    - `scene_id` and `patch_id` present in sample dict
    - Test assertion passes with no error
  </done>
</task>

## Success Criteria

- [ ] `len(SEN12MSDataset('data/sen12ms-subset')) == 1167`
- [ ] SAR tensors are shape `(2, H, W)`, values in `[0, 1]`
- [ ] Optical tensors are shape `(3, H, W)`, values in `[0, 1]`
- [ ] `scene_id` and `patch_id` present in each sample

"""
Dataset verification script.
Runs a series of assertions to prove the dataset loader is working correctly.
Usage: python scripts/verify_dataset.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
from datasets.sen12ms_dataset import SEN12MSDataset

DATA_DIR = "data/sen12ms-subset"
EXPECTED_PAIRS = 1167

def main():
    print("=" * 60)
    print("SEN12MS Dataset Verification")
    print("=" * 60)

    ds = SEN12MSDataset(DATA_DIR, normalize=True)

    # Check 1: Pair count
    assert len(ds) == EXPECTED_PAIRS, (
        f"FAIL: Expected {EXPECTED_PAIRS} pairs, got {len(ds)}"
    )
    print(f"[OK] Pair count: {len(ds)} (expected {EXPECTED_PAIRS})")

    # Check 2: Sample structure
    sample = ds[0]
    required_keys = {"sar", "optical", "sar_path", "optical_path", "scene_id", "patch_id"}
    assert required_keys.issubset(sample.keys()), (
        f"FAIL: Missing keys: {required_keys - sample.keys()}"
    )
    print(f"[OK] Sample keys: {sorted(sample.keys())}")

    # Check 3: Shapes
    sar = sample["sar"]
    optical = sample["optical"]
    assert sar.ndim == 3 and sar.shape[0] == 2, (
        f"FAIL: SAR shape {sar.shape}, expected (2, H, W)"
    )
    assert optical.ndim == 3 and optical.shape[0] == 3, (
        f"FAIL: Optical shape {optical.shape}, expected (3, H, W)"
    )
    assert sar.shape[1:] == optical.shape[1:], (
        f"FAIL: SAR/Optical spatial mismatch: {sar.shape[1:]} vs {optical.shape[1:]}"
    )
    print(f"[OK] SAR shape: {tuple(sar.shape)}")
    print(f"[OK] Optical shape: {tuple(optical.shape)}")

    # Check 4: Normalization ranges
    assert 0.0 <= sar.min().item() and sar.max().item() <= 1.0, (
        f"FAIL: SAR out of [0,1] range: min={sar.min():.4f}, max={sar.max():.4f}"
    )
    assert 0.0 <= optical.min().item() and optical.max().item() <= 1.0, (
        f"FAIL: Optical out of [0,1] range: min={optical.min():.4f}, max={optical.max():.4f}"
    )
    print(f"[OK] SAR values in [0, 1]: min={sar.min():.4f}, max={sar.max():.4f}")
    print(f"[OK] Optical values in [0, 1]: min={optical.min():.4f}, max={optical.max():.4f}")

    # Check 5: Stats over first 10 samples
    print("\nSampling 10 pairs for statistics...")
    sar_means, opt_means = [], []
    for i in range(min(10, len(ds))):
        s = ds[i]
        sar_means.append(s["sar"].mean().item())
        opt_means.append(s["optical"].mean().item())
    print(f"[OK] SAR mean (10 samples): {np.mean(sar_means):.4f} ± {np.std(sar_means):.4f}")
    print(f"[OK] Optical mean (10 samples): {np.mean(opt_means):.4f} ± {np.std(opt_means):.4f}")

    # Check 6: Scene IDs present
    scenes = set()
    for i in range(len(ds)):
        scenes.add(ds.samples[i][2])  # scene_id
    print(f"[OK] Scenes found: {sorted(scenes)}")

    # Check 7: Patch ID uniqueness per scene
    from collections import Counter
    scene_patch_counts = Counter((s[2], s[3]) for s in ds.samples)
    duplicates = {k: v for k, v in scene_patch_counts.items() if v > 1}
    assert not duplicates, f"FAIL: Duplicate (scene, patch) pairs: {duplicates}"
    print(f"[OK] All (scene_id, patch_id) pairs are unique")

    print("\n" + "=" * 60)
    print("ALL CHECKS PASSED ✓")
    print("=" * 60)

if __name__ == "__main__":
    main()

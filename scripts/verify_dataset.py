"""
Dataset verification script (v2 — updated for Phase 6 changes).
Runs a series of assertions to prove the dataset loader is working correctly.

Phase 6 changes verified:
  - Optical shape is now (4, H, W) — 4-channel (B4+B8+B11+B12), not (3, H, W)
  - SAR values are Z-scored (mean≈0, std≈1), NOT clipped to [0, 1]
  - Optical values are Z-scored — NOT clipped to [0, 1]

Usage: python scripts/verify_dataset.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
from datasets.sen12ms_dataset import SEN12MSDataset

DATA_DIR = "data/sen12ms-subset"
EXPECTED_PAIRS = 1167
EXPECTED_OPT_CHANNELS = 4   # B4, B8, B11, B12 (Phase 6)
EXPECTED_SAR_CHANNELS = 2   # VV, VH


def main():
    print("=" * 60)
    print("SEN12MS Dataset Verification (Phase 6)")
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

    assert sar.ndim == 3 and sar.shape[0] == EXPECTED_SAR_CHANNELS, (
        f"FAIL: SAR shape {sar.shape}, expected ({EXPECTED_SAR_CHANNELS}, H, W)"
    )
    # Phase 6: optical must be 4-channel, NOT 3-channel
    assert optical.ndim == 3 and optical.shape[0] == EXPECTED_OPT_CHANNELS, (
        f"FAIL: Optical shape {optical.shape}, expected ({EXPECTED_OPT_CHANNELS}, H, W).\n"
        f"  Did you update the optical_bands default to [3,7,10,11]?"
    )
    assert sar.shape[1:] == optical.shape[1:], (
        f"FAIL: SAR/Optical spatial mismatch: {sar.shape[1:]} vs {optical.shape[1:]}"
    )
    print(f"[OK] SAR shape:     {tuple(sar.shape)}  (2-ch: VV, VH)")
    print(f"[OK] Optical shape: {tuple(optical.shape)}  (4-ch: B4, B8, B11, B12)")

    # Check 4: Z-score normalization (NOT [0,1] clip)
    # Phase 6: SAR and optical are Z-scored, so values SHOULD be outside [0, 1]
    sar_min = sar.min().item()
    sar_max = sar.max().item()
    opt_min = optical.min().item()
    opt_max = optical.max().item()

    # Z-scored data: values should be roughly in [-5, 5] with mean ≈ 0
    assert sar_min < 0.0, (
        f"FAIL: SAR min={sar_min:.4f} expected negative (Z-scored). "
        f"Still using [0,1] clip normalization?"
    )
    assert optical.mean().item() < 2.0, (
        f"FAIL: Optical mean={optical.mean():.4f} unexpectedly large. "
        f"Z-score not applied?"
    )
    print(f"[OK] SAR Z-scored:     min={sar_min:.4f}, max={sar_max:.4f} (NOT clipped to [0,1])")
    print(f"[OK] Optical Z-scored: min={opt_min:.4f}, max={opt_max:.4f}")

    # Check 5: Per-band Z-score sanity over first 50 samples
    print("\nSampling 50 pairs for Z-score sanity check...")
    sar_channel_means = [[] for _ in range(EXPECTED_SAR_CHANNELS)]
    opt_channel_means = [[] for _ in range(EXPECTED_OPT_CHANNELS)]

    for i in range(min(50, len(ds))):
        s = ds[i]
        for c in range(EXPECTED_SAR_CHANNELS):
            sar_channel_means[c].append(s["sar"][c].mean().item())
        for c in range(EXPECTED_OPT_CHANNELS):
            opt_channel_means[c].append(s["optical"][c].mean().item())

    sar_names = ["VV", "VH"]
    opt_names = ["B4(Red)", "B8(NIR)", "B11(SWIR1)", "B12(SWIR2)"]
    for c, name in enumerate(sar_names):
        m = np.mean(sar_channel_means[c])
        print(f"  SAR  {name}: mean={m:.3f} (should be ≈ 0)")
    for c, name in enumerate(opt_names):
        m = np.mean(opt_channel_means[c])
        print(f"  OPT  {name}: mean={m:.3f} (should be ≈ 0)")

    # Check 6: Scene IDs present
    scenes = set()
    for i in range(len(ds)):
        scenes.add(ds.samples[i][2])  # scene_id
    print(f"\n[OK] Scenes found: {sorted(scenes)}")

    # Check 7: Patch ID uniqueness per scene
    from collections import Counter
    scene_patch_counts = Counter((s[2], s[3]) for s in ds.samples)
    duplicates = {k: v for k, v in scene_patch_counts.items() if v > 1}
    assert not duplicates, f"FAIL: Duplicate (scene, patch) pairs: {duplicates}"
    print(f"[OK] All (scene_id, patch_id) pairs are unique")

    # Check 8: No NaN values
    for i in range(min(5, len(ds))):
        s = ds[i]
        assert not s["sar"].isnan().any(), f"FAIL: NaN in SAR at sample {i}"
        assert not s["optical"].isnan().any(), f"FAIL: NaN in optical at sample {i}"
    print(f"[OK] No NaN values in first 5 samples")

    print("\n" + "=" * 60)
    print("ALL CHECKS PASSED ✓  (Phase 6 — 4-ch optical, Z-score norm)")
    print("=" * 60)


if __name__ == "__main__":
    main()

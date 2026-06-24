"""
Compute per-band dataset statistics for SEN12MS subset.

Run once to get empirical SAR and optical normalization constants.
Outputs a JSON file and prints Python-ready constants to paste into
datasets/sen12ms_dataset.py.

Usage:
    python scripts/compute_dataset_stats.py --data data/sen12ms-subset

Output: outputs/dataset_stats.json
"""

import argparse
import json
import sys
from pathlib import Path

import numpy as np

# Allow importing from the project root
sys.path.insert(0, str(Path(__file__).parent.parent))

from datasets.sen12ms_dataset import SEN12MSDataset


def compute_stats(data_dir: str, optical_bands: list[int]) -> dict:
    """
    Compute per-band mean and std for SAR and optical using Welford's algorithm.

    Args:
        data_dir: Path to sen12ms-subset directory
        optical_bands: List of 0-indexed optical band indices to include

    Returns:
        dict with sar_mean, sar_std, sar_min, sar_max,
                    opt_mean, opt_std, opt_min, opt_max
    """
    # Load with normalize=False to get raw pixel values
    dataset = SEN12MSDataset(
        root_dir=data_dir,
        optical_bands=optical_bands,
        normalize=False,
    )

    n = len(dataset)
    if n == 0:
        raise ValueError(f"No samples found in {data_dir}")

    sar_bands = 2
    opt_bands = len(optical_bands)

    # Welford online accumulators
    sar_count = np.zeros(sar_bands, dtype=np.float64)
    sar_mean  = np.zeros(sar_bands, dtype=np.float64)
    sar_M2    = np.zeros(sar_bands, dtype=np.float64)
    sar_min   = np.full(sar_bands, np.inf)
    sar_max   = np.full(sar_bands, -np.inf)

    opt_count = np.zeros(opt_bands, dtype=np.float64)
    opt_mean  = np.zeros(opt_bands, dtype=np.float64)
    opt_M2    = np.zeros(opt_bands, dtype=np.float64)
    opt_min   = np.full(opt_bands, np.inf)
    opt_max   = np.full(opt_bands, -np.inf)

    print(f"Computing stats over {n} samples...")
    for idx in range(n):
        sample = dataset[idx]
        sar = sample["sar"].numpy()   # (2, H, W)  raw dB values
        opt = sample["optical"].numpy()  # (opt_bands, H, W)

        if idx % 100 == 0:
            print(f"  [{idx}/{n}]", end="\r", flush=True)

        # Flatten spatial dims for per-band stats
        for b in range(sar_bands):
            vals = sar[b].ravel()
            vals = vals[np.isfinite(vals)]  # skip NaN/Inf pixels
            if len(vals) == 0:
                continue
            for v in vals:
                sar_count[b] += 1
                delta = v - sar_mean[b]
                sar_mean[b] += delta / sar_count[b]
                delta2 = v - sar_mean[b]
                sar_M2[b] += delta * delta2
            sar_min[b] = min(sar_min[b], vals.min())
            sar_max[b] = max(sar_max[b], vals.max())

        for b in range(opt_bands):
            vals = opt[b].ravel()
            vals = vals[np.isfinite(vals)]
            if len(vals) == 0:
                continue
            for v in vals:
                opt_count[b] += 1
                delta = v - opt_mean[b]
                opt_mean[b] += delta / opt_count[b]
                delta2 = v - opt_mean[b]
                opt_M2[b] += delta * delta2
            opt_min[b] = min(opt_min[b], vals.min())
            opt_max[b] = max(opt_max[b], vals.max())

    print(f"\nDone. Processed {n} samples.")

    sar_std = np.sqrt(sar_M2 / np.maximum(sar_count - 1, 1))
    opt_std = np.sqrt(opt_M2 / np.maximum(opt_count - 1, 1))

    return {
        "sar_mean": sar_mean.tolist(),
        "sar_std":  sar_std.tolist(),
        "sar_min":  sar_min.tolist(),
        "sar_max":  sar_max.tolist(),
        "opt_mean": opt_mean.tolist(),
        "opt_std":  opt_std.tolist(),
        "opt_min":  opt_min.tolist(),
        "opt_max":  opt_max.tolist(),
        "optical_bands": optical_bands,
        "n_samples": n,
    }


def main():
    parser = argparse.ArgumentParser(description="Compute SEN12MS dataset statistics")
    parser.add_argument("--data", default="data/sen12ms-subset",
                        help="Path to sen12ms-subset directory")
    parser.add_argument("--optical-bands", nargs="+", type=int,
                        default=[3, 7, 10, 11],
                        help="0-indexed optical band indices (default: B4,B8,B11,B12)")
    parser.add_argument("--output", default="outputs/dataset_stats.json",
                        help="Output JSON path")
    args = parser.parse_args()

    Path(args.output).parent.mkdir(parents=True, exist_ok=True)

    stats = compute_stats(args.data, args.optical_bands)

    # Save JSON
    with open(args.output, "w") as f:
        json.dump(stats, f, indent=2)
    print(f"\nSaved stats to: {args.output}")

    # Print Python-ready constants
    band_names = ["B4 (Red)", "B8 (NIR)", "B11 (SWIR1)", "B12 (SWIR2)"]
    print("\n" + "="*60)
    print("# Paste into datasets/sen12ms_dataset.py")
    print("="*60)
    print(f"SAR_MEAN = {[round(v, 6) for v in stats['sar_mean']]}  # dB (VV, VH)")
    print(f"SAR_STD  = {[round(v, 6) for v in stats['sar_std']]}   # dB (VV, VH)")
    print(f"OPT_MEAN = {[round(v, 6) for v in stats['opt_mean']]}  # reflectance ×1 ({', '.join(band_names[:len(stats['opt_mean'])])})")
    print(f"OPT_STD  = {[round(v, 6) for v in stats['opt_std']]}   # reflectance ×1")
    print("="*60)

    print("\nSAR per-band summary (raw dB):")
    for b, (name, mn, mx, m, s) in enumerate(zip(
        ["VV", "VH"], stats["sar_min"], stats["sar_max"], stats["sar_mean"], stats["sar_std"]
    )):
        print(f"  {name}: min={mn:.2f} max={mx:.2f} mean={m:.4f} std={s:.4f}")

    print("\nOptical per-band summary (raw uint16):")
    for b_idx, (bname, mn, mx, m, s) in enumerate(zip(
        band_names, stats["opt_min"], stats["opt_max"], stats["opt_mean"], stats["opt_std"]
    )):
        print(f"  {bname}: min={mn:.0f} max={mx:.0f} mean={m:.2f} std={s:.2f}")


if __name__ == "__main__":
    main()

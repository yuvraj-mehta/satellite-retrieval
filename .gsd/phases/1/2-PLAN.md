---
phase: 1
plan: 2
wave: 2
---

# Plan 1.2: Verification Script & Visualization

## Objective

After fixing the loader, prove it works empirically and make the data visually inspectable. This plan creates two scripts:
1. `scripts/verify_dataset.py` — machine-verifiable proof that all pairs load and stats are sane
2. `scripts/visualize_samples.py` — matplotlib side-by-side display of SAR/optical pairs

## Context

- `datasets/sen12ms_dataset.py` — fixed in Plan 1.1 (must be complete first)
- SAR: 2-band Sentinel-1 (VV, VH polarizations)
- Optical: 13-band Sentinel-2 (we select B4/B3/B2 = RGB for display)

## Tasks

<task type="auto">
  <name>Create scripts/verify_dataset.py — machine-verifiable dataset health check</name>
  <files>scripts/verify_dataset.py</files>
  <action>
    Create `scripts/verify_dataset.py`:

    ```python
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

        print("\n" + "=" * 60)
        print("ALL CHECKS PASSED ✓")
        print("=" * 60)

    if __name__ == "__main__":
        main()
    ```
  </action>
  <verify>
    cd /Users/yuvrajmehta/Developer/satellite-retrieval
    source venv/bin/activate
    python scripts/verify_dataset.py
  </verify>
  <done>
    - Script runs without errors
    - All `[OK]` lines printed
    - `ALL CHECKS PASSED ✓` at the end
    - Scene IDs `['21', '22']` confirmed
  </done>
</task>

<task type="auto">
  <name>Create scripts/visualize_samples.py — side-by-side SAR/optical display</name>
  <files>scripts/visualize_samples.py</files>
  <action>
    Create `scripts/visualize_samples.py`:

    ```python
    """
    Visualize SAR and optical sample pairs side by side.
    Usage: python scripts/visualize_samples.py [--n 4] [--save]
    """
    import sys
    import argparse
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent.parent))

    import numpy as np
    import matplotlib.pyplot as plt
    import matplotlib.gridspec as gridspec
    from datasets.sen12ms_dataset import SEN12MSDataset


    def tensor_to_display(tensor, mode="optical"):
        """Convert a CHW tensor to HWC numpy array for imshow."""
        arr = tensor.numpy()
        if mode == "optical":
            # (3, H, W) -> (H, W, 3), already in [0,1]
            return np.transpose(arr, (1, 2, 0))
        elif mode == "sar":
            # (2, H, W) -> display VV band (index 0) as grayscale
            return arr[0]  # (H, W)
        raise ValueError(f"Unknown mode: {mode}")


    def main():
        parser = argparse.ArgumentParser()
        parser.add_argument("--n", type=int, default=4, help="Number of pairs to display")
        parser.add_argument("--save", action="store_true", help="Save to outputs/visualization.png")
        parser.add_argument("--data", type=str, default="data/sen12ms-subset")
        args = parser.parse_args()

        ds = SEN12MSDataset(args.data)
        n = min(args.n, len(ds))

        fig, axes = plt.subplots(n, 2, figsize=(10, 4 * n))
        fig.suptitle("SEN12MS Pairs: SAR (VV) | Optical (RGB)", fontsize=14, fontweight="bold")

        if n == 1:
            axes = [axes]

        for i in range(n):
            sample = ds[i]
            sar_img = tensor_to_display(sample["sar"], mode="sar")
            opt_img = tensor_to_display(sample["optical"], mode="optical")

            scene = sample["scene_id"]
            patch = sample["patch_id"]

            axes[i][0].imshow(sar_img, cmap="gray", vmin=0, vmax=1)
            axes[i][0].set_title(f"SAR (VV) — Scene {scene}, Patch {patch}")
            axes[i][0].axis("off")

            axes[i][1].imshow(np.clip(opt_img, 0, 1))
            axes[i][1].set_title(f"Optical (RGB) — Scene {scene}, Patch {patch}")
            axes[i][1].axis("off")

        plt.tight_layout()

        if args.save:
            out_dir = Path("outputs")
            out_dir.mkdir(exist_ok=True)
            save_path = out_dir / "visualization.png"
            plt.savefig(save_path, dpi=150, bbox_inches="tight")
            print(f"Saved: {save_path}")
        else:
            plt.show()

    if __name__ == "__main__":
        main()
    ```
  </action>
  <verify>
    cd /Users/yuvrajmehta/Developer/satellite-retrieval
    source venv/bin/activate
    python scripts/visualize_samples.py --n 2 --save
    # Should print "Saved: outputs/visualization.png" and file should exist
    ls -la outputs/visualization.png
  </verify>
  <done>
    - Script runs without error
    - `outputs/visualization.png` created
    - File size > 0 bytes (non-empty image)
  </done>
</task>

## Success Criteria

- [ ] `python scripts/verify_dataset.py` prints `ALL CHECKS PASSED ✓`
- [ ] `python scripts/visualize_samples.py --n 2 --save` creates `outputs/visualization.png`
- [ ] Both scripts runnable from project root with venv activated

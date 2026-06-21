"""
Visualize SAR and optical sample pairs side by side.
Usage: python scripts/visualize_samples.py [--n 4] [--save] [--indices 0 5 10]
"""
import sys
import argparse
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
import matplotlib.pyplot as plt
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
    parser.add_argument("--indices", nargs="+", type=int, default=None,
                        help="Specific sample indices to display (overrides --n)")
    parser.add_argument("--save", action="store_true", help="Save to outputs/visualization.png")
    parser.add_argument("--data", type=str, default="data/sen12ms-subset")
    args = parser.parse_args()

    ds = SEN12MSDataset(args.data)

    indices = args.indices if args.indices is not None else list(range(min(args.n, len(ds))))
    n = len(indices)

    fig, axes = plt.subplots(n, 2, figsize=(10, 4 * n))
    fig.suptitle("SEN12MS Pairs: SAR (VV polarization) | Optical (RGB)", fontsize=14, fontweight="bold")

    if n == 1:
        axes = [axes]

    for row, idx in enumerate(indices):
        sample = ds[idx]
        sar_img = tensor_to_display(sample["sar"], mode="sar")
        opt_img = tensor_to_display(sample["optical"], mode="optical")

        scene = sample["scene_id"]
        patch = sample["patch_id"]

        axes[row][0].imshow(sar_img, cmap="gray", vmin=0, vmax=1)
        axes[row][0].set_title(f"SAR (VV) — Scene {scene}, Patch {patch}")
        axes[row][0].axis("off")

        # Gamma correction for better optical visualization (satellite imagery is often dark)
        opt_gamma = np.clip(opt_img ** 0.5, 0, 1)  # gamma=0.5 brightens
        axes[row][1].imshow(opt_gamma)
        axes[row][1].set_title(f"Optical (RGB, γ=0.5) — Scene {scene}, Patch {patch}")
        axes[row][1].axis("off")

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

"""
End-to-end retrieval demo.

Given a query image path, loads the trained model (or baseline), retrieves Top-5 results,
and displays them side by side with similarity scores.

Usage:
    python scripts/demo.py --query data/sen12ms-subset/ROIs2017_winter_s1/s1_21/ROIs2017_winter_s1_21_p100.tif
    python scripts/demo.py --query-modality optical --target-modality sar
"""
import sys
import argparse
import time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
import torch
import rasterio
import matplotlib.pyplot as plt
from typing import List, Tuple

from models.dual_encoder import DualEncoder
from models.encoder import ResNet50Encoder, get_device
from retrieval.faiss_utils import FAISSRetriever


def load_tif(path: Path, bands: List[int] = None, normalize: bool = True, modality: str = "sar") -> np.ndarray:
    with rasterio.open(path) as src:
        if bands:
            data = src.read([b + 1 for b in bands])
        else:
            data = src.read()

    data = data.astype(np.float32)
    if normalize:
        if modality == "sar":
            data = np.clip(data, -25.0, 0.0)
            data = (data + 25.0) / 25.0
        else:
            # Optical channels are co-registered and divided by 10000
            data = np.clip(data / 10000.0, 0.0, 1.0)
    return data


def encode_image(img_arr: np.ndarray, modality: str, model: torch.nn.Module, device: torch.device) -> np.ndarray:
    """Encode a single image array to a normalized embedding."""
    tensor = torch.tensor(img_arr, dtype=torch.float32).unsqueeze(0).to(device)
    with torch.no_grad():
        if isinstance(model, DualEncoder):
            if modality == "sar":
                emb = model.encode_sar(tensor)
            else:
                emb = model.encode_optical(tensor)
        else:
            emb = model(tensor)
    return emb.cpu().float().numpy()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--query", required=True, help="Path to query .tif file")
    parser.add_argument("--query-modality", default="sar", choices=["sar", "optical"])
    parser.add_argument("--target-modality", default="optical", choices=["sar", "optical"])
    parser.add_argument("--k", type=int, default=5)
    parser.add_argument("--checkpoint", default="outputs/checkpoints/best_model.pt")
    parser.add_argument("--index-dir", default="outputs/index")
    parser.add_argument("--save", action="store_true")
    args = parser.parse_args()

    device = get_device()
    print(f"Device: {device}")

    # Load model
    if Path(args.checkpoint).exists():
        ckpt = torch.load(args.checkpoint, map_location=device)
        emb_dim = ckpt.get("args", {}).get("embedding_dim", 512)
        model = DualEncoder(embedding_dim=emb_dim, pretrained=False).to(device)
        model.load_state_dict(ckpt["model_state_dict"])
        model.eval()
        print(f"Loaded trained DualEncoder (dim={emb_dim}) from checkpoint")
    else:
        in_ch = 2 if args.query_modality == "sar" else 3
        model = ResNet50Encoder(in_channels=in_ch, pretrained=True, freeze_backbone=True).to(device)
        model.eval()
        print("Using pretrained ResNet50 baseline (no checkpoint found)")

    # Load FAISS index
    idx_dir = Path(args.index_dir)
    print(f"Loading FAISS index from: {idx_dir}")
    retriever = FAISSRetriever.load(
        str(idx_dir / "combined.index"),
        str(idx_dir / "combined.meta")
    )

    # Load and encode query
    query_path = Path(args.query)
    bands = None if args.query_modality == "sar" else [3, 2, 1]
    query_arr = load_tif(query_path, bands=bands, modality=args.query_modality)
    
    t0 = time.time()
    query_emb = encode_image(query_arr, args.query_modality, model, device)
    results = retriever.search(query_emb, k=args.k + 10)  # get extra to filter by modality
    elapsed_ms = (time.time() - t0) * 1000

    # Filter to target modality
    target_results = [r for r in results[0] if r["modality"] == args.target_modality][:args.k]
    print(f"\nQuery: {args.query}")
    print(f"Query modality: {args.query_modality} -> Target: {args.target_modality}")
    print(f"Retrieval time: {elapsed_ms:.2f}ms")
    print(f"\nTop-{args.k} results:")
    for r in target_results:
        print(f"  Rank {r['rank']}: Scene {r['scene_id']}, Patch {r['patch_id']}, Score (similarity): {r['score']:.4f}")

    # Visualize
    fig, axes = plt.subplots(1, args.k + 1, figsize=(4 * (args.k + 1), 4))
    
    # Preprocess query display
    # SAR is (2, H, W) -> take VV band
    # Optical is (3, H, W) -> transpose to (H, W, 3)
    if args.query_modality == "sar":
        query_display = query_arr[0]
        cmap = "gray"
    else:
        query_display = np.transpose(query_arr, (1, 2, 0))
        cmap = None
        
    axes[0].imshow(np.clip(query_display * 2.0 if args.query_modality == "optical" else query_display, 0.0, 1.0), cmap=cmap)
    axes[0].set_title(f"Query\n({args.query_modality.upper()})", fontweight="bold")
    axes[0].axis("off")

    for i, r in enumerate(target_results):
        r_bands = None if r["modality"] == "sar" else [3, 2, 1]
        r_arr = load_tif(Path(r["path"]), bands=r_bands, modality=r["modality"])
        
        if r["modality"] == "sar":
            r_display = r_arr[0]
            r_cmap = "gray"
        else:
            r_display = np.transpose(r_arr, (1, 2, 0))
            r_cmap = None
            
        # Boost optical display visibility with a clip boost
        disp_img = r_display * 2.0 if r["modality"] == "optical" else r_display
        axes[i + 1].imshow(np.clip(disp_img, 0, 1), cmap=r_cmap)
        axes[i + 1].set_title(f"Rank {i+1}\nScore: {r['score']:.3f}")
        axes[i + 1].axis("off")

    plt.suptitle(f"{args.query_modality.upper()} -> {args.target_modality.upper()} Retrieval | Latency: {elapsed_ms:.1f}ms", fontsize=12)
    plt.tight_layout()

    if args.save:
        out_path = Path("outputs") / "demo_result.png"
        out_path.parent.mkdir(exist_ok=True)
        plt.savefig(out_path, dpi=150, bbox_inches="tight")
        print(f"Saved visualization to: {out_path}")
    else:
        plt.show()


if __name__ == "__main__":
    main()

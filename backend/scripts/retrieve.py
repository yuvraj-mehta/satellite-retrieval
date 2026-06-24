"""
Query the FAISS index using a single satellite image file path.
Usage: python scripts/retrieve.py --query-path data/sen12ms-subset/ROIs2017_winter_s1/s1_21/ROIs2017_winter_s1_21_p302.tif [--k 5]
"""
import sys
import argparse
import re
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
import rasterio
import torch

import re
from typing import Tuple, Dict, Any

from models.encoder import ResNet50Encoder, get_device
from retrieval.faiss_utils import FAISSRetriever

_PATCH_RE = re.compile(r"ROIs\d+_\w+_(s[12])_(\d+)_p(\d+)\.tif")


def parse_filename(filename: str) -> Dict[str, Any]:
    """Extract (sensor, scene_id, patch_id) from filename."""
    m = _PATCH_RE.match(filename)
    if m is None:
        return None
    return {
        "sensor": m.group(1),
        "scene_id": m.group(2),
        "patch_id": m.group(3),
    }


def load_and_preprocess_image(img_path: Path) -> Tuple[torch.Tensor, str]:
    """
    Loads and preprocesses an image file from its path.
    Returns:
        tensor: Normalised image tensor (C, H, W)
        modality: 'sar' or 'optical'
    """
    modality = "sar" if "_s1_" in img_path.name else "optical"

    with rasterio.open(img_path) as src:
        if modality == "sar":
            # SAR channels: 0: VV, 1: VH
            data = src.read([1, 2])  # 1-indexed bands
            # normalise dB scale [-25, 0] -> [0, 1]
            data = np.clip(data, -25.0, 0.0)
            data = (data + 25.0) / 25.0
        else:
            # Optical channels: B4 (red), B3 (green), B2 (blue) -> indices 4, 3, 2 in 1-based indexing
            data = src.read([4, 3, 2])
            data = data.astype(np.float32) / 10000.0
            data = np.clip(data, 0.0, 1.0)

    tensor = torch.from_numpy(data).float()
    return tensor, modality


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--query-path", required=True, type=str, help="Path to the query image (.tif)")
    parser.add_argument("--index-dir", default="outputs/index", type=str)
    parser.add_argument("--k", type=int, default=5, help="Number of retrieved results")
    args = parser.parse_args()

    query_path = Path(args.query_path)
    if not query_path.exists():
        print(f"Error: Query path '{query_path}' does not exist.")
        sys.exit(1)

    idx_dir = Path(args.index_dir)
    index_path = idx_dir / "combined.index"
    meta_path = idx_dir / "combined.meta"

    if not index_path.exists() or not meta_path.exists():
        print(f"Error: FAISS index/metadata files not found in '{idx_dir}'. Run scripts/build_index.py first.")
        sys.exit(1)

    device = get_device()
    print(f"Using device: {device}")

    # 1. Load image and determine modality
    print(f"Loading and preprocessing query image: {query_path.name}")
    try:
        img_tensor, modality = load_and_preprocess_image(query_path)
    except Exception as e:
        # Fallback to local import helper
        from typing import Tuple
        # Re-run with typing imported
        def load_and_preprocess_image_internal(img_path: Path) -> Tuple[torch.Tensor, str]:
            mod = "sar" if "_s1_" in img_path.name else "optical"
            with rasterio.open(img_path) as src:
                if mod == "sar":
                    data = src.read([1, 2])
                    data = np.clip(data, -25.0, 0.0)
                    data = (data + 25.0) / 25.0
                else:
                    # B4, B3, B2 are indices 4, 3, 2 in 1-based indexing for rasterio
                    data = src.read([4, 3, 2])
                    data = data.astype(np.float32) / 10000.0
                    data = np.clip(data, 0.0, 1.0)
            return torch.from_numpy(data).float(), mod
        img_tensor, modality = load_and_preprocess_image_internal(query_path)

    # Shape: (1, C, H, W)
    img_tensor = img_tensor.unsqueeze(0).to(device)

    # 2. Extract embedding
    print(f"Extracting embedding using {modality.upper()} encoder...")
    in_channels = 2 if modality == "sar" else 3
    encoder = ResNet50Encoder(in_channels=in_channels, pretrained=True, freeze_backbone=True).to(device)
    encoder.eval()

    with torch.no_grad():
        emb = encoder(img_tensor).cpu().numpy().astype(np.float32)

    # 3. Load Retriever and Search
    print(f"Searching index with K={args.k}...")
    retriever = FAISSRetriever.load(str(index_path), str(meta_path))
    results = retriever.search(emb, k=args.k)[0]

    # Parse query metadata from path
    parsed = parse_filename(query_path.name)
    query_scene = parsed["scene_id"] if parsed else "unknown"
    query_patch = parsed["patch_id"] if parsed else "unknown"

    print("\n" + "=" * 80)
    print(f"QUERY: {query_path.name} (Modality: {modality.upper()}, Scene: {query_scene}, Patch: {query_patch})")
    print("=" * 80)
    print(f"{'Rank':<5} {'Score':<10} {'Modality':<10} {'Scene':<10} {'Patch':<10} {'Path'}")
    print("-" * 80)
    for res in results:
        res_parsed = parse_filename(Path(res["path"]).name)
        res_scene = res_parsed["scene_id"] if res_parsed else res["scene_id"]
        res_patch = res_parsed["patch_id"] if res_parsed else res["patch_id"]
        
        # Highlight if it's the co-located match (same scene and patch)
        marker = " ★" if (res_scene == query_scene and res_patch == query_patch) else ""
        print(f"{res['rank']:<5} {res['score']:.4f}     {res['modality'].upper():<10} {res_scene:<10} {res_patch:<10} {res['path']}{marker}")
    print("=" * 80)
    print("★ = Geographically co-located patch (correct cross-modal/same-modal target)")

if __name__ == "__main__":
    main()

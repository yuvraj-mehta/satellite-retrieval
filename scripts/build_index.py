"""
Extract ResNet50 embeddings from all dataset samples and build FAISS index.
Usage: python scripts/build_index.py [--batch-size 32] [--output-dir outputs/index]
"""
import sys
import time
import argparse
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
import torch
from torch.utils.data import DataLoader
from tqdm import tqdm

from datasets.sen12ms_dataset import SEN12MSDataset
from models.encoder import ResNet50Encoder, get_device
from retrieval.faiss_utils import FAISSRetriever


def extract_embeddings(encoder, dataloader, device, modality):
    """Extract embeddings for one modality from the full dataset."""
    encoder.eval()
    all_embeddings = []
    all_metadata = []

    with torch.no_grad():
        for batch in tqdm(dataloader, desc=f"Extracting {modality}"):
            imgs = batch[modality].to(device)
            embs = encoder(imgs)
            # Move to CPU and convert to float32 numpy
            embs_np = embs.cpu().float().numpy()
            all_embeddings.append(embs_np)

            for i in range(len(imgs)):
                all_metadata.append({
                    "path": batch[f"{modality}_path"][i],
                    "scene_id": batch["scene_id"][i],
                    "patch_id": batch["patch_id"][i],
                    "modality": modality,
                })

    return np.concatenate(all_embeddings, axis=0), all_metadata


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default="data/sen12ms-subset")
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--output-dir", default="outputs/index")
    parser.add_argument("--workers", type=int, default=0)
    args = parser.parse_args()

    device = get_device()
    print(f"Device: {device}")

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Load dataset
    dataset = SEN12MSDataset(args.data, normalize=True)
    dataloader = DataLoader(
        dataset,
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=args.workers,
        pin_memory=(str(device) != "mps"),  # MPS doesn't support pin_memory
    )

    # SAR encoder (2-ch input)
    sar_encoder = ResNet50Encoder(in_channels=2, pretrained=True, freeze_backbone=True).to(device)
    # Optical encoder (3-ch input)
    opt_encoder = ResNet50Encoder(in_channels=3, pretrained=True, freeze_backbone=True).to(device)

    # --- Extract SAR embeddings ---
    print("\n[1/2] Extracting SAR embeddings...")
    t0 = time.time()
    sar_embs, sar_meta = extract_embeddings(sar_encoder, dataloader, device, "sar")
    print(f"SAR: {sar_embs.shape} in {time.time()-t0:.1f}s")

    # --- Extract Optical embeddings ---
    print("\n[2/2] Extracting Optical embeddings...")
    t0 = time.time()
    opt_embs, opt_meta = extract_embeddings(opt_encoder, dataloader, device, "optical")
    print(f"Optical: {opt_embs.shape} in {time.time()-t0:.1f}s")

    # --- Build combined FAISS index (both modalities together) ---
    print("\nBuilding FAISS index (SAR + Optical combined)...")
    retriever = FAISSRetriever(embedding_dim=2048)
    retriever.add(sar_embs, sar_meta)
    retriever.add(opt_embs, opt_meta)
    retriever.save(str(out_dir / "combined.index"), str(out_dir / "combined.meta"))

    # --- Also save modality-specific embeddings as numpy (for evaluation) ---
    np.save(str(out_dir / "sar_embeddings.npy"), sar_embs)
    np.save(str(out_dir / "opt_embeddings.npy"), opt_embs)

    import pickle
    with open(str(out_dir / "sar_metadata.pkl"), "wb") as f:
        pickle.dump(sar_meta, f)
    with open(str(out_dir / "opt_metadata.pkl"), "wb") as f:
        pickle.dump(opt_meta, f)

    print(f"\nIndex built: {retriever.ntotal} total entries")
    print(f"Outputs saved to: {out_dir}/")
    print("  combined.index, combined.meta")
    print("  sar_embeddings.npy, opt_embeddings.npy")
    print("  sar_metadata.pkl, opt_metadata.pkl")

if __name__ == "__main__":
    main()

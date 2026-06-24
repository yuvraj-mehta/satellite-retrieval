---
phase: 2
plan: 2
wave: 2
---

# Plan 2.2: FAISS Index & Retrieval Pipeline

## Objective

Build `retrieval/faiss_utils.py` with a complete FAISS wrapper (build, add, search, save, load), then `scripts/build_index.py` to extract embeddings from the full dataset and save the index. Finally `scripts/retrieve.py` to query by image path and display Top-K results.

## Context

- `retrieval/faiss_utils.py` — file to implement
- `models/encoder.py` — complete from Plan 2.1
- `datasets/sen12ms_dataset.py` — complete from Phase 1
- FAISS-cpu 1.14.3 installed (`faiss.IndexFlatIP` for dot product on L2-normalized embeddings = cosine similarity)

## Tasks

<task type="auto">
  <name>Implement retrieval/faiss_utils.py — FAISS index wrapper</name>
  <files>retrieval/faiss_utils.py</files>
  <action>
    Create `retrieval/faiss_utils.py`:

    ```python
    """
    FAISS-based similarity retrieval for satellite image embeddings.

    Uses IndexFlatIP (inner product) with L2-normalized embeddings,
    which is equivalent to cosine similarity.
    """
    import numpy as np
    import faiss
    import pickle
    from pathlib import Path
    from typing import List, Dict, Any, Tuple


    class FAISSRetriever:
        """
        Wraps a FAISS IndexFlatIP for embedding retrieval.

        All embeddings must be L2-normalized before adding (produces cosine sim).

        Args:
            embedding_dim: Dimensionality of embeddings (default 2048)
        """

        def __init__(self, embedding_dim: int = 2048):
            self.embedding_dim = embedding_dim
            self.index = faiss.IndexFlatIP(embedding_dim)
            self.metadata: List[Dict[str, Any]] = []  # parallel to index entries

        def add(self, embeddings: np.ndarray, metadata: List[Dict[str, Any]]):
            """
            Add embeddings to the index.

            Args:
                embeddings: (N, D) float32 array, L2-normalized
                metadata: list of N dicts with keys like path, scene_id, patch_id, modality
            """
            assert embeddings.dtype == np.float32, "Embeddings must be float32"
            assert embeddings.shape[1] == self.embedding_dim
            assert len(embeddings) == len(metadata)
            self.index.add(embeddings)
            self.metadata.extend(metadata)

        def search(self, query: np.ndarray, k: int = 10) -> List[List[Dict]]:
            """
            Search for Top-K nearest neighbors.

            Args:
                query: (Q, D) float32 array of query embeddings, L2-normalized
                k: number of results to return

            Returns:
                List of Q lists, each containing K result dicts with
                keys: metadata fields + 'score' (cosine similarity)
            """
            assert query.dtype == np.float32
            if query.ndim == 1:
                query = query[np.newaxis, :]

            scores, indices = self.index.search(query, k)
            results = []
            for q_idx in range(len(query)):
                q_results = []
                for rank, (score, idx) in enumerate(zip(scores[q_idx], indices[q_idx])):
                    if idx == -1:  # FAISS sentinel for empty results
                        continue
                    result = dict(self.metadata[idx])
                    result["score"] = float(score)
                    result["rank"] = rank + 1
                    q_results.append(result)
                results.append(q_results)
            return results

        def save(self, index_path: str, meta_path: str):
            """Save FAISS index and metadata to disk."""
            faiss.write_index(self.index, index_path)
            with open(meta_path, "wb") as f:
                pickle.dump({
                    "metadata": self.metadata,
                    "embedding_dim": self.embedding_dim,
                }, f)
            print(f"Saved index ({self.index.ntotal} entries) to {index_path}")
            print(f"Saved metadata to {meta_path}")

        @classmethod
        def load(cls, index_path: str, meta_path: str) -> "FAISSRetriever":
            """Load a saved FAISS index and metadata."""
            with open(meta_path, "rb") as f:
                saved = pickle.load(f)
            retriever = cls(embedding_dim=saved["embedding_dim"])
            retriever.index = faiss.read_index(index_path)
            retriever.metadata = saved["metadata"]
            print(f"Loaded index with {retriever.index.ntotal} entries")
            return retriever

        @property
        def ntotal(self):
            return self.index.ntotal
    ```
  </action>
  <verify>
    cd /Users/yuvrajmehta/Developer/satellite-retrieval
    source venv/bin/activate
    python -c "
import numpy as np
from retrieval.faiss_utils import FAISSRetriever

# Build a small test index
r = FAISSRetriever(embedding_dim=128)
embs = np.random.randn(20, 128).astype(np.float32)
embs /= np.linalg.norm(embs, axis=1, keepdims=True)
meta = [{'path': f'img_{i}.tif', 'scene_id': '21', 'patch_id': str(i), 'modality': 'sar'} for i in range(20)]
r.add(embs, meta)
assert r.ntotal == 20

# Search
q = embs[:2]  # query with known embeddings
results = r.search(q, k=5)
assert len(results) == 2
assert len(results[0]) == 5
assert results[0][0]['rank'] == 1
assert 0.99 < results[0][0]['score'] <= 1.01  # query matches itself

# Save/load
r.save('/tmp/test.index', '/tmp/test.meta')
r2 = FAISSRetriever.load('/tmp/test.index', '/tmp/test.meta')
assert r2.ntotal == 20
print('PASS: FAISSRetriever working correctly')
"
  </verify>
  <done>
    - `PASS: FAISSRetriever working correctly` printed
    - Index with 20 entries builds, searches, saves, and loads correctly
    - Self-query returns score ≈ 1.0 (cosine similarity with self)
  </done>
</task>

<task type="auto">
  <name>Create scripts/build_index.py — extract all embeddings and build FAISS index</name>
  <files>scripts/build_index.py</files>
  <action>
    Create `scripts/build_index.py`:

    ```python
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

        # Load dataset (no normalization needed differently for ResNet — already in [0,1])
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
    ```
  </action>
  <verify>
    cd /Users/yuvrajmehta/Developer/satellite-retrieval
    source venv/bin/activate
    python scripts/build_index.py --batch-size 16 --workers 0
    ls -la outputs/index/
    # Expected files: combined.index, combined.meta, sar_embeddings.npy, opt_embeddings.npy, sar_metadata.pkl, opt_metadata.pkl
    python -c "
import numpy as np
sar = np.load('outputs/index/sar_embeddings.npy')
opt = np.load('outputs/index/opt_embeddings.npy')
print('SAR embeddings shape:', sar.shape)   # (1167, 2048)
print('Opt embeddings shape:', opt.shape)   # (1167, 2048)
assert sar.shape == (1167, 2048)
assert opt.shape == (1167, 2048)
# Check L2 normalization
norms = np.linalg.norm(sar, axis=1)
assert abs(norms.mean() - 1.0) < 0.01, f'SAR norms not 1.0: {norms.mean()}'
print('PASS: Embeddings correct shape and L2 normalized')
"
  </verify>
  <done>
    - `build_index.py` completes without error
    - `outputs/index/` contains all 6 files
    - SAR embeddings: `(1167, 2048)` shape
    - Optical embeddings: `(1167, 2048)` shape
    - L2 norms ≈ 1.0 for all embeddings
  </done>
</task>

## Success Criteria

- [ ] `retrieval/faiss_utils.py` passes unit test (save/load/search roundtrip)
- [ ] `scripts/build_index.py` completes on full 1167-pair dataset
- [ ] `outputs/index/` contains all required files
- [ ] Embeddings are `(1167, 2048)` float32, L2-normalized

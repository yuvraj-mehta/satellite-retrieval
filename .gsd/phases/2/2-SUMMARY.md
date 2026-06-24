# Plan 2.2 Summary — FAISS Index & Retrieval Pipeline

## What Was Done

Implemented the vector similarity retrieval pipeline:
- Created `retrieval/faiss_utils.py` with `FAISSRetriever` wrapping FAISS `IndexFlatIP`.
  - Supports adding float32 L2-normalized embeddings with a parallel metadata list.
  - Supports Top-K search returning cosine similarity scores and metadata fields.
  - Implements `save` and `load` for the FAISS index and pickle metadata.
- Created `scripts/build_index.py` to:
  - Load the full 1167-pair dataset.
  - Run inference with SAR and Optical encoders on the best available device (`mps`).
  - Extract L2-normalized embeddings.
  - Construct a combined FAISS index of 2334 entries (both modalities combined).
  - Save all outputs to `outputs/index/`.

## Verification Results

- Verified index extraction successfully completed in ~51s.
- `outputs/index/` files created:
  - `combined.index` (19.1MB)
  - `combined.meta` (242KB)
  - `opt_embeddings.npy` (9.6MB)
  - `sar_embeddings.npy` (9.6MB)
  - `opt_metadata.pkl` (120KB)
  - `sar_metadata.pkl` (120KB)
- Verification script confirmed:
  - SAR embeddings shape: `(1167, 2048)`
  - Optical embeddings shape: `(1167, 2048)`
  - All embeddings are L2-normalized (mean norm ≈ 1.0).

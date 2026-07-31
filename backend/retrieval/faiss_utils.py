"""
FAISS-based similarity retrieval for satellite image embeddings.

Uses IndexFlatIP (inner product) with L2-normalized embeddings,
which is equivalent to cosine similarity.
"""
import numpy as np
import faiss

# Prevent FAISS segmentation fault on Apple Silicon by limiting OpenMP threads
faiss.omp_set_num_threads(1)

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

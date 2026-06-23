"""
Full evaluation script for cross-modal satellite retrieval.

Evaluates 4 retrieval modes:
  1. SAR -> SAR   (same-modal)
  2. OPT -> OPT   (same-modal)
  3. SAR -> OPT   (cross-modal)
  4. OPT -> SAR   (cross-modal)

Evaluation integrity notes:
  - Same-modal (SAR→SAR, OPT→OPT): The query vector IS in the gallery (self-match
    at similarity=1.0). We apply leave-one-out filtering — the query is removed from
    its own result list BEFORE computing metrics. This ensures F1@K measures actual
    semantic similarity to *other* patches, not trivial self-retrieval.
  - Cross-modal (SAR→OPT, OPT→SAR): No self-filtering needed; the query modality
    and gallery modality differ, so the query cannot appear in the gallery.

Usage: python evaluation/evaluate.py [--index-dir outputs/index] [--k 5 10]
"""
import sys
import time
import argparse
import pickle
import json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
from retrieval.faiss_utils import FAISSRetriever
from evaluation.metrics import mean_f1_at_k, mean_reciprocal_rank


def build_modality_retriever(embeddings, metadata, embedding_dim=None):
    """Build a FAISS retriever for a single modality."""
    if embedding_dim is None:
        embedding_dim = embeddings.shape[1]
    r = FAISSRetriever(embedding_dim=embedding_dim)
    r.add(embeddings, metadata)
    return r


def _filter_self(result_list: list, query_meta: dict, k: int) -> list:
    """
    Remove the query's own entry from same-modal results (leave-one-out).

    FAISS returns the query itself at rank 1 with similarity=1.0 for same-modal
    search. Filtering it out lets F1@K measure similarity to *other* patches,
    not trivial self-retrieval.

    Args:
        result_list: List of result dicts from FAISS search
        query_meta: The query's metadata dict (scene_id, patch_id, modality)
        k: Number of results to return after filtering

    Returns:
        Top-k results with the self-match removed
    """
    filtered = [
        r for r in result_list
        if not (
            r.get("scene_id") == query_meta["scene_id"]
            and r.get("patch_id") == query_meta["patch_id"]
            and r.get("modality") == query_meta["modality"]
        )
    ]
    return filtered[:k]


def evaluate_mode(
    query_embs, query_meta, retriever, gallery_modality, k_values,
    same_modal: bool = False
):
    """
    Run retrieval for one query-to-gallery mode and compute metrics.

    Args:
        query_embs: (N, D) query embedding matrix
        query_meta: List of N metadata dicts for queries
        retriever: FAISSRetriever for the gallery
        gallery_modality: 'sar' or 'optical'
        k_values: List of K cutoffs for F1@K
        same_modal: If True, apply leave-one-out self-filtering

    Returns:
        (metrics_dict, all_results_filtered)
    """
    t0 = time.time()
    # Fetch k+1 to ensure we have k results after self-filtering (same-modal)
    fetch_k = max(k_values) + (1 if same_modal else 0)

    all_results_raw = []
    batch_size = 64
    for start in range(0, len(query_embs), batch_size):
        batch = query_embs[start:start + batch_size].astype(np.float32)
        results = retriever.search(batch, k=fetch_k)
        all_results_raw.extend(results)
    elapsed = time.time() - t0

    # Apply leave-one-out filtering for same-modal modes
    if same_modal:
        all_results = [
            _filter_self(res, qmeta, max(k_values))
            for res, qmeta in zip(all_results_raw, query_meta)
        ]
    else:
        all_results = [res[:max(k_values)] for res in all_results_raw]

    metrics = {}
    for k in k_values:
        m = mean_f1_at_k(query_meta, all_results, k=k, target_modality=gallery_modality)
        metrics.update(m)

    # Add MRR
    mrr = mean_reciprocal_rank(query_meta, all_results, target_modality=gallery_modality)
    metrics["mrr"] = mrr
    metrics["retrieval_time_s"] = elapsed
    metrics["time_per_query_ms"] = (elapsed / max(1, len(query_embs))) * 1000
    return metrics, all_results


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--index-dir", default="outputs/index")
    parser.add_argument("--k", nargs="+", type=int, default=[5, 10])
    args = parser.parse_args()

    idx_dir = Path(args.index_dir)

    # Load embeddings and metadata
    print("Loading embeddings and metadata...")
    sar_embs = np.load(idx_dir / "sar_embeddings.npy")
    opt_embs = np.load(idx_dir / "opt_embeddings.npy")
    with open(idx_dir / "sar_metadata.pkl", "rb") as f:
        sar_meta = pickle.load(f)
    with open(idx_dir / "opt_metadata.pkl", "rb") as f:
        opt_meta = pickle.load(f)

    print(f"SAR: {sar_embs.shape}, Optical: {opt_embs.shape}")

    # Build per-modality retrievers
    sar_retriever = build_modality_retriever(sar_embs, sar_meta)
    opt_retriever = build_modality_retriever(opt_embs, opt_meta)

    results_table = {}

    # Mode 1: SAR -> SAR (same-modal — apply leave-one-out)
    print("\n[1/4] SAR -> SAR (same-modal, leave-one-out)...")
    m, _ = evaluate_mode(sar_embs, sar_meta, sar_retriever, "sar", args.k, same_modal=True)
    results_table["SAR -> SAR"] = m

    # Mode 2: OPT -> OPT (same-modal — apply leave-one-out)
    print("[2/4] OPT -> OPT (same-modal, leave-one-out)...")
    m, _ = evaluate_mode(opt_embs, opt_meta, opt_retriever, "optical", args.k, same_modal=True)
    results_table["OPT -> OPT"] = m

    # Mode 3: SAR -> OPT (cross-modal — no self-filtering)
    print("[3/4] SAR -> OPT (cross-modal)...")
    m, _ = evaluate_mode(sar_embs, sar_meta, opt_retriever, "optical", args.k, same_modal=False)
    results_table["SAR -> OPT"] = m

    # Mode 4: OPT -> SAR (cross-modal — no self-filtering)
    print("[4/4] OPT -> SAR (cross-modal)...")
    m, _ = evaluate_mode(opt_embs, opt_meta, sar_retriever, "sar", args.k, same_modal=False)
    results_table["OPT -> SAR"] = m

    # Print report
    print("\n" + "=" * 80)
    print("RETRIEVAL EVALUATION REPORT")
    print("=" * 80)
    header = f"{'Mode':<20}"
    for k in args.k:
        header += f"  F1@{k:<4} R@{k:<4}"
    header += "    MRR     Time/q(ms)"
    print(header)
    print("-" * 80)
    for mode, m in results_table.items():
        row = f"{mode:<20}"
        for k in args.k:
            row += f"  {m[f'mean_f1@{k}']:.4f}  {m[f'mean_recall@{k}']:.4f}"
        row += f"    {m['mrr']:.4f}  {m['time_per_query_ms']:.2f}ms"
        print(row)
    print("=" * 80)

    # Save results
    out_path = idx_dir / "evaluation_results.json"
    with open(out_path, "w") as f:
        json.dump(results_table, f, indent=2)
    print(f"\nResults saved to {out_path}")


if __name__ == "__main__":
    main()

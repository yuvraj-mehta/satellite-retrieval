"""
Full evaluation script for cross-modal satellite retrieval.

Evaluates 4 retrieval modes:
  1. SAR -> SAR   (same-modal)
  2. OPT -> OPT   (same-modal)
  3. SAR -> OPT   (cross-modal)
  4. OPT -> SAR   (cross-modal)

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
from evaluation.metrics import mean_f1_at_k


def build_modality_retriever(embeddings, metadata, embedding_dim=None):
    """Build a FAISS retriever for a single modality."""
    if embedding_dim is None:
        embedding_dim = embeddings.shape[1]
    r = FAISSRetriever(embedding_dim=embedding_dim)
    r.add(embeddings, metadata)
    return r


def evaluate_mode(query_embs, query_meta, retriever, gallery_modality, k_values):
    """Run retrieval for one query-to-gallery mode and compute metrics."""
    t0 = time.time()
    all_results = []
    batch_size = 64
    for start in range(0, len(query_embs), batch_size):
        batch = query_embs[start:start+batch_size].astype(np.float32)
        results = retriever.search(batch, k=max(k_values) + 1)
        all_results.extend(results)
    elapsed = time.time() - t0

    metrics = {}
    for k in k_values:
        m = mean_f1_at_k(query_meta, all_results, k=k, target_modality=gallery_modality)
        metrics.update(m)

    metrics["retrieval_time_s"] = elapsed
    metrics["time_per_query_ms"] = (elapsed / len(query_embs)) * 1000
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

    # Mode 1: SAR -> SAR
    print("\n[1/4] SAR -> SAR (same-modal)...")
    m, _ = evaluate_mode(sar_embs, sar_meta, sar_retriever, "sar", args.k)
    results_table["SAR -> SAR"] = m

    # Mode 2: OPT -> OPT
    print("[2/4] OPT -> OPT (same-modal)...")
    m, _ = evaluate_mode(opt_embs, opt_meta, opt_retriever, "optical", args.k)
    results_table["OPT -> OPT"] = m

    # Mode 3: SAR -> OPT (cross-modal)
    print("[3/4] SAR -> OPT (cross-modal)...")
    m, _ = evaluate_mode(sar_embs, sar_meta, opt_retriever, "optical", args.k)
    results_table["SAR -> OPT"] = m

    # Mode 4: OPT -> SAR (cross-modal)
    print("[4/4] OPT -> SAR (cross-modal)...")
    m, _ = evaluate_mode(opt_embs, opt_meta, sar_retriever, "sar", args.k)
    results_table["OPT -> SAR"] = m

    # Print report
    print("\n" + "=" * 70)
    print("RETRIEVAL EVALUATION REPORT")
    print("=" * 70)
    header = f"{'Mode':<20}"
    for k in args.k:
        header += f"  F1@{k:<6} P@{k:<6} R@{k:<6}"
    header += "  Time/query(ms)"
    print(header)
    print("-" * 70)
    for mode, m in results_table.items():
        row = f"{mode:<20}"
        for k in args.k:
            row += f"  {m[f'mean_f1@{k}']:.4f}   {m[f'mean_precision@{k}']:.4f}   {m[f'mean_recall@{k}']:.4f}  "
        row += f"  {m['time_per_query_ms']:.2f}ms"
        print(row)
    print("=" * 70)

    # Save results
    out_path = idx_dir / "evaluation_results.json"
    with open(out_path, "w") as f:
        json.dump(results_table, f, indent=2)
    print(f"\nResults saved to {out_path}")


if __name__ == "__main__":
    main()

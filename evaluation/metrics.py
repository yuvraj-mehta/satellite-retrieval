"""
Retrieval evaluation metrics: Precision@K, Recall@K, F1@K.

For SEN12MS: each query has exactly 1 relevant result (same scene+patch, target modality).
"""
from typing import List, Dict, Any
import numpy as np


def precision_at_k(retrieved_ids: List[str], relevant_ids: set, k: int) -> float:
    """Fraction of top-K retrieved that are relevant."""
    hits = sum(1 for r in retrieved_ids[:k] if r in relevant_ids)
    return hits / k


def recall_at_k(retrieved_ids: List[str], relevant_ids: set, k: int) -> float:
    """Fraction of relevant items found in top-K (capped at 1.0)."""
    if not relevant_ids:
        return 0.0
    hits = sum(1 for r in retrieved_ids[:k] if r in relevant_ids)
    return hits / len(relevant_ids)


def f1_at_k(retrieved_ids: List[str], relevant_ids: set, k: int) -> float:
    """Harmonic mean of P@K and R@K."""
    p = precision_at_k(retrieved_ids, relevant_ids, k)
    r = recall_at_k(retrieved_ids, relevant_ids, k)
    if p + r == 0:
        return 0.0
    return 2 * p * r / (p + r)


def mean_f1_at_k(
    queries: List[Dict[str, Any]],
    results: List[List[Dict[str, Any]]],
    k: int,
    target_modality: str,
) -> Dict[str, float]:
    """
    Compute mean F1@K across all queries.

    Args:
        queries: List of query metadata dicts (each has scene_id, patch_id, modality)
        results: List of retrieval result lists (parallel to queries)
        k: Top-K cutoff
        target_modality: Expected modality in results ('sar' or 'optical')

    Returns:
        Dict with mean_f1, mean_precision, mean_recall, std_f1
    """
    f1s, precs, recs = [], [], []

    for query, result_list in zip(queries, results):
        # Ground truth: same scene+patch, target modality
        gt_key = f"{target_modality}_{query['scene_id']}_{query['patch_id']}"

        # Build relevant set (just 1 item for SEN12MS)
        relevant = {gt_key}

        # Get retrieved IDs
        retrieved_ids = [
            f"{r['modality']}_{r['scene_id']}_{r['patch_id']}"
            for r in result_list
        ]

        f1s.append(f1_at_k(retrieved_ids, relevant, k))
        precs.append(precision_at_k(retrieved_ids, relevant, k))
        recs.append(recall_at_k(retrieved_ids, relevant, k))

    return {
        f"mean_f1@{k}": float(np.mean(f1s)),
        f"mean_precision@{k}": float(np.mean(precs)),
        f"mean_recall@{k}": float(np.mean(recs)),
        f"std_f1@{k}": float(np.std(f1s)),
    }


if __name__ == "__main__":
    # Unit test with known data
    # Query: sar_21_100, relevant = opt_21_100
    queries = [{"scene_id": "21", "patch_id": "100", "modality": "sar"}]
    results = [[
        {"modality": "optical", "scene_id": "21", "patch_id": "100", "score": 0.95},  # hit
        {"modality": "optical", "scene_id": "21", "patch_id": "101", "score": 0.80},  # miss
    ]]
    metrics = mean_f1_at_k(queries, results, k=5, target_modality="optical")
    # P@5=1/5=0.2, R@5=1/1=1.0, F1@5=2*0.2*1.0/1.2=0.333
    assert abs(metrics["mean_f1@5"] - 0.333) < 0.01, f"Got {metrics}"
    print("PASS:", metrics)

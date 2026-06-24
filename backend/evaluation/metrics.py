"""
Retrieval evaluation metrics: Precision@K, Recall@K, F1@K, MRR.

For SEN12MS: each query has exactly 1 relevant result (same scene+patch, target modality).

Evaluation design notes:
  - For same-modal retrieval (SAR→SAR, OPT→OPT), the query vector itself is in the gallery
    with similarity 1.0. The gallery is filtered (leave-one-out) in evaluate.py before
    calling these metrics — this file operates on already-filtered result lists.
  - MRR (Mean Reciprocal Rank) rewards finding the relevant item at higher ranks and is
    more informative than F1@K alone (which is binary: in/out of top-K).
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
        results: List of retrieval result lists (parallel to queries).
                 For same-modal queries, self-matches should already be filtered out
                 by the caller (leave-one-out evaluation).
        k: Top-K cutoff
        target_modality: Expected modality in results ('sar' or 'optical')

    Returns:
        Dict with mean_f1, mean_precision, mean_recall, std_f1
    """
    f1s, precs, recs = [], [], []

    for query, result_list in zip(queries, results):
        # Ground truth: same scene+patch, target modality
        gt_key = f"{target_modality}_{query['scene_id']}_{query['patch_id']}"

        # Build relevant set (just 1 item for SEN12MS co-location)
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


def mean_reciprocal_rank(
    queries: List[Dict[str, Any]],
    results: List[List[Dict[str, Any]]],
    target_modality: str,
) -> float:
    """
    Mean Reciprocal Rank (MRR): mean(1 / rank_of_first_relevant_hit).

    MRR rewards finding the relevant item at higher ranks and is more
    informative than F1@K (which is binary: in/out of top-K).

    Range: [0, 1]. Higher is better.
      MRR = 1.0  → all queries found at rank 1
      MRR = 0.5  → average first hit at rank 2
      MRR = 0.0  → relevant item never found

    Args:
        queries: List of query metadata dicts (scene_id, patch_id, modality)
        results: Parallel list of retrieval result lists (already leave-one-out filtered)
        target_modality: Expected modality in results ('sar' or 'optical')

    Returns:
        Mean reciprocal rank as a float in [0, 1]
    """
    rrs = []
    for query, result_list in zip(queries, results):
        gt_key = f"{target_modality}_{query['scene_id']}_{query['patch_id']}"
        for rank, r in enumerate(result_list, start=1):
            r_key = f"{r['modality']}_{r['scene_id']}_{r['patch_id']}"
            if r_key == gt_key:
                rrs.append(1.0 / rank)
                break
        else:
            rrs.append(0.0)  # relevant item not found in results
    return float(np.mean(rrs)) if rrs else 0.0


def mean_semantic_f1_at_k(
    queries: List[Dict[str, Any]],
    results: List[List[Dict[str, Any]]],
    k: int,
    target_modality: str,
    lc_labels: Dict[str, int],
) -> Dict[str, float]:
    """
    Compute mean semantic F1@K across queries.
    Two patches are relevant if they share the same Land Cover (LC) class.
    """
    f1s, precs, recs = [], [], []

    for query, result_list in zip(queries, results):
        query_key = f"{query['scene_id']}_{query['patch_id']}"
        query_lc_class = lc_labels.get(query_key)
        if query_lc_class is None:
            continue

        relevant = set()
        for r in result_list:
            r_key = f"{r['scene_id']}_{r['patch_id']}"
            if lc_labels.get(r_key) == query_lc_class:
                relevant.add(f"{r['modality']}_{r['scene_id']}_{r['patch_id']}")

        retrieved_ids = [
            f"{r['modality']}_{r['scene_id']}_{r['patch_id']}"
            for r in result_list
        ]

        f1s.append(f1_at_k(retrieved_ids, relevant, k))
        precs.append(precision_at_k(retrieved_ids, relevant, k))
        recs.append(recall_at_k(retrieved_ids, relevant, k))

    return {
        f"semantic_mean_f1@{k}": float(np.mean(f1s)) if f1s else 0.0,
        f"semantic_mean_precision@{k}": float(np.mean(precs)) if precs else 0.0,
        f"semantic_mean_recall@{k}": float(np.mean(recs)) if recs else 0.0,
        f"semantic_std_f1@{k}": float(np.std(f1s)) if f1s else 0.0,
    }


if __name__ == "__main__":
    print("Running metrics unit tests...")

    # Test 1: F1@K
    queries = [{"scene_id": "21", "patch_id": "100", "modality": "sar"}]
    results = [[
        {"modality": "optical", "scene_id": "21", "patch_id": "100", "score": 0.95},  # hit
        {"modality": "optical", "scene_id": "21", "patch_id": "101", "score": 0.80},  # miss
    ]]
    metrics = mean_f1_at_k(queries, results, k=5, target_modality="optical")
    # P@5=1/5=0.2, R@5=1/1=1.0, F1@5=2*0.2*1.0/1.2=0.333
    assert abs(metrics["mean_f1@5"] - 0.333) < 0.01, f"F1 test failed: {metrics}"
    print(f"PASS F1@5: {metrics['mean_f1@5']:.4f}")

    # Test 2: MRR — hit at rank 1
    mrr = mean_reciprocal_rank(queries, results, "optical")
    assert abs(mrr - 1.0) < 0.01, f"MRR rank-1 test failed: {mrr}"
    print(f"PASS MRR (rank-1 hit): {mrr:.4f}")

    # Test 3: MRR — hit at rank 3
    results_rank3 = [[
        {"modality": "optical", "scene_id": "21", "patch_id": "999", "score": 0.9},
        {"modality": "optical", "scene_id": "21", "patch_id": "888", "score": 0.85},
        {"modality": "optical", "scene_id": "21", "patch_id": "100", "score": 0.8},  # hit
    ]]
    mrr = mean_reciprocal_rank(queries, results_rank3, "optical")
    assert abs(mrr - 1/3) < 0.01, f"MRR rank-3 test failed: {mrr}"
    print(f"PASS MRR (rank-3 hit): {mrr:.4f}")

    # Test 4: MRR — miss
    results_miss = [[
        {"modality": "optical", "scene_id": "21", "patch_id": "999", "score": 0.9},
    ]]
    mrr = mean_reciprocal_rank(queries, results_miss, "optical")
    assert mrr == 0.0, f"MRR miss test failed: {mrr}"
    print(f"PASS MRR (miss): {mrr:.4f}")

    # Test 5: Semantic F1@K
    q_sem = [{'scene_id': '21', 'patch_id': '100', 'modality': 'sar'}]
    res_sem = [[
        {'modality': 'optical', 'scene_id': '21', 'patch_id': '200', 'score': 0.9},
        {'modality': 'optical', 'scene_id': '21', 'patch_id': '300', 'score': 0.8},
    ]]
    lc_sem = {'21_100': 9, '21_200': 9, '21_300': 12}
    out_sem = mean_semantic_f1_at_k(q_sem, res_sem, k=2, target_modality='optical', lc_labels=lc_sem)
    assert out_sem['semantic_mean_f1@2'] > 0, out_sem
    print(f"PASS semantic_mean_f1_at_k: {out_sem['semantic_mean_f1@2']:.4f}")

    print("\nAll metrics unit tests PASSED.")

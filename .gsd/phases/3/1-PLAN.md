---
phase: 3
plan: 1
wave: 1
---

# Plan 3.1: Evaluation Metrics & Ground Truth Definition

## Objective

Define the ground truth for retrieval evaluation and implement F1@K metrics. The SEN12MS dataset pairs patches by `(scene_id, patch_id)` — so the correct match for a SAR query `(scene=21, patch=302)` is the optical image at `(scene=21, patch=302)`. This is a 1-to-1 relevant set (each query has exactly one correct result in the gallery).

## Context

- Ground truth: for query `(scene_id, patch_id, modality_A)`, the relevant result is `(scene_id, patch_id, modality_B)` where modality_B is the target modality
- For same-modal retrieval: there is ONE correct result (same patch, same modality)
- For cross-modal retrieval: there is ONE correct result (same patch, other modality)
- F1@K formula: F1@K = 2 * P@K * R@K / (P@K + R@K) where P@K = hits/K, R@K = hits/total_relevant

## Tasks

<task type="auto">
  <name>Create evaluation/metrics.py — F1@K, Precision@K, Recall@K</name>
  <files>evaluation/__init__.py, evaluation/metrics.py</files>
  <action>
    Create `evaluation/__init__.py` (empty):
    ```python
    ```

    Create `evaluation/metrics.py`:

    ```python
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
    ```
  </action>
  <verify>
    cd /Users/yuvrajmehta/Developer/satellite-retrieval
    source venv/bin/activate
    python evaluation/metrics.py
    # Expected: PASS: {'mean_f1@5': 0.333..., ...}
  </verify>
  <done>
    - `evaluation/metrics.py` runs without error
    - Unit test prints `PASS:` with correct F1@5 ≈ 0.333
  </done>
</task>

<task type="auto">
  <name>Create evaluation/evaluate.py — full evaluation script for all 4 retrieval modes</name>
  <files>evaluation/evaluate.py</files>
  <action>
    Create `evaluation/evaluate.py`:

    ```python
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
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent.parent))

    import numpy as np
    from retrieval.faiss_utils import FAISSRetriever
    from evaluation.metrics import mean_f1_at_k


    def build_modality_retriever(embeddings, metadata, embedding_dim=2048):
        """Build a FAISS retriever for a single modality."""
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
        import json
        out_path = idx_dir / "evaluation_results.json"
        with open(out_path, "w") as f:
            json.dump(results_table, f, indent=2)
        print(f"\nResults saved to {out_path}")

    if __name__ == "__main__":
        main()
    ```
  </action>
  <verify>
    cd /Users/yuvrajmehta/Developer/satellite-retrieval
    source venv/bin/activate
    python evaluation/evaluate.py --index-dir outputs/index --k 5 10
    # Should print a table with F1@5, F1@10 for all 4 modes
    # SAR->SAR and OPT->OPT should be very high (near 1.0 for same-modal with same encoder)
    # Cross-modal will be low without training (MVP baseline)
    ls -la outputs/index/evaluation_results.json
  </verify>
  <done>
    - Script runs without error
    - Prints evaluation table with all 4 modes
    - Same-modal F1@5 ≈ 1.0 (ResNet finds exact match)
    - `evaluation_results.json` saved
    - Time per query < 100ms
  </done>
</task>

## Success Criteria

- [ ] `evaluation/metrics.py` unit test passes with correct F1@5 ≈ 0.333
- [ ] `evaluation/evaluate.py` runs and prints table for all 4 modes
- [ ] Same-modal (SAR→SAR, OPT→OPT) shows high F1 as MVP baseline
- [ ] `evaluation_results.json` saved to disk

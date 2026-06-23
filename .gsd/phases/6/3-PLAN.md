---
phase: 6
plan: 3
wave: 2
---

# Plan 6.3: Evaluation Integrity + Training Stability Fixes

## Objective

Three final fixes that run after Plans 6.1 and 6.2:
1. **Evaluation fix**: Exclude the query from its own gallery (self-retrieval leakage) so
   same-modal F1 actually measures semantic similarity, not dictionary lookup.
2. **Metrics fix**: Add MRR (Mean Reciprocal Rank) alongside F1@K for richer reporting.
3. **Training fix**: Add LR warmup (5 epochs) and change default temperature to 0.1.

After these changes, re-run the full evaluation pipeline to produce updated performance
numbers that are scientifically valid.

## Context
- `.gsd/SPEC.md`
- `.gsd/phases/6/RESEARCH.md`
- `evaluation/metrics.py` — Precision@K, Recall@K, F1@K
- `evaluation/evaluate.py` — 4-mode evaluator
- `train.py` — training loop with scheduler

## Tasks

<task type="auto">
  <name>Fix evaluation: leave-one-out gallery + add MRR metric</name>
  <files>evaluation/metrics.py, evaluation/evaluate.py</files>
  <action>
    **In `evaluation/metrics.py`** — add MRR function:
    ```python
    def mean_reciprocal_rank(
        queries: List[Dict], results: List[List[Dict]], target_modality: str
    ) -> float:
        """Mean Reciprocal Rank: mean(1 / rank_of_first_relevant_hit)."""
        rrs = []
        for query, result_list in zip(queries, results):
            gt_key = f"{target_modality}_{query['scene_id']}_{query['patch_id']}"
            for rank, r in enumerate(result_list, start=1):
                r_key = f"{r['modality']}_{r['scene_id']}_{r['patch_id']}"
                if r_key == gt_key:
                    rrs.append(1.0 / rank)
                    break
            else:
                rrs.append(0.0)  # not found in results
        return float(np.mean(rrs))
    ```

    **In `evaluation/evaluate.py`** — fix the self-retrieval leakage for same-modal queries:
    In the same-modal search loop (SAR→SAR and OPT→OPT), after FAISS returns Top-(K+1) results,
    filter out any result where `scene_id == query_scene_id AND patch_id == query_patch_id
    AND modality == query_modality`. Then truncate to Top-K.

    Implementation pattern:
    ```python
    def _filter_self(results, query_meta, k):
        """Remove the query itself from its own results, return top-k."""
        filtered = [
            r for r in results
            if not (r['scene_id'] == query_meta['scene_id']
                    and r['patch_id'] == query_meta['patch_id']
                    and r['modality'] == query_meta['modality'])
        ]
        return filtered[:k]
    ```

    Call this function only for same-modal retrieval modes (SAR→SAR, OPT→OPT).
    For cross-modal (SAR→OPT, OPT→SAR), self-filtering is not needed (different modality index).

    Also import and call `mean_reciprocal_rank` from `metrics.py` in the evaluation report output.
    Print MRR alongside F1@5 and F1@10 in the summary table.

    DO NOT change the FAISS index structure or retrieval code — only post-process results.
  </action>
  <verify>python -c "
from evaluation.metrics import mean_reciprocal_rank
# Query that finds match at rank 3
queries = [{'scene_id': '21', 'patch_id': '100', 'modality': 'sar'}]
results = [[
    {'modality': 'optical', 'scene_id': '21', 'patch_id': '999', 'score': 0.9},
    {'modality': 'optical', 'scene_id': '21', 'patch_id': '888', 'score': 0.85},
    {'modality': 'optical', 'scene_id': '21', 'patch_id': '100', 'score': 0.8},  # hit at rank 3
]]
mrr = mean_reciprocal_rank(queries, results, 'optical')
assert abs(mrr - 1/3) < 0.01, f'Expected 0.333, got {mrr}'
print(f'PASS: MRR = {mrr:.4f}')
"</verify>
  <done>MRR unit test passes (MRR = 0.333 for rank-3 hit). `evaluate.py` runs without errors
and prints MRR in the output table. Same-modal results no longer include the query's own entry.</done>
</task>

<task type="auto">
  <name>Fix training: add LR warmup + update default temperature</name>
  <files>train.py</files>
  <action>
    **Change 1 — Default temperature**:
    Change `--temperature` default from `0.07` to `0.1`.

    **Change 2 — LR warmup**:
    Add argument: `parser.add_argument("--warmup-epochs", type=int, default=5)`

    Replace the current single `CosineAnnealingLR` scheduler with a `SequentialLR` that:
    - Phase 1: `LinearLR(optimizer, start_factor=0.1, end_factor=1.0, total_iters=warmup_epochs)`
      (linearly ramps LR from 10% to 100% over warmup_epochs)
    - Phase 2: `CosineAnnealingLR(optimizer, T_max=epochs - warmup_epochs)`
      (cosine decay for the remaining epochs)

    ```python
    from torch.optim.lr_scheduler import LinearLR, CosineAnnealingLR, SequentialLR

    warmup_scheduler = LinearLR(
        optimizer, start_factor=0.1, end_factor=1.0,
        total_iters=args.warmup_epochs
    )
    cosine_scheduler = CosineAnnealingLR(
        optimizer, T_max=max(1, args.epochs - args.warmup_epochs)
    )
    scheduler = SequentialLR(
        optimizer,
        schedulers=[warmup_scheduler, cosine_scheduler],
        milestones=[args.warmup_epochs]
    )
    ```

    **Change 3 — Log current LR** in the epoch print line:
    ```python
    current_lr = scheduler.get_last_lr()[0]
    print(f"Epoch {epoch:03d}/{args.epochs} | Train: {train_loss:.4f} | Val: {val_loss:.4f} | "
          f"LR: {current_lr:.2e} | Time: {time.time()-t0:.1f}s")
    ```

    Also save the final trained temperature in the checkpoint dict:
    `"temperature": args.temperature`

    IMPORTANT: Do not change gradient accumulation logic, optimizer type, or checkpoint saving
    structure beyond adding the temperature key. Backwards compatibility with old checkpoints
    is not required (existing checkpoints use the old architecture anyway after Plan 6.1).
  </action>
  <verify>python train.py --epochs 3 --batch-size 4 --accum-steps 2 --warmup-epochs 2 --temperature 0.1 2>&1 | head -20</verify>
  <done>Training runs for 3 epochs without error. Output shows LR increasing during epoch 1-2
(warmup) then decreasing from epoch 3 (cosine). LR column visible in epoch print. Checkpoint saved.</done>
</task>

## Success Criteria
- [ ] `mean_reciprocal_rank` function in `evaluation/metrics.py` with unit test
- [ ] Same-modal evaluation excludes self-match (leave-one-out gallery)
- [ ] `evaluate.py` prints MRR alongside F1@5 and F1@10
- [ ] `train.py` uses `SequentialLR` with 5-epoch linear warmup then cosine decay
- [ ] Default temperature is `0.1`
- [ ] LR is logged each epoch in training output
- [ ] 3-epoch smoke training run completes without error

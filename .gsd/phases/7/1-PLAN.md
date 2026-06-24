---
phase: 7
plan: 1
wave: 1
---

# Plan 7.1: Fix Same-Modal Evaluation + Demo Rank Display

## Objective

Two related bugs make the system look broken to judges:

1. **Same-modal F1 = 0.000**: `evaluate.py` uses leave-one-out filtering for SAR→SAR
   and OPT→OPT, which removes the only ground truth item (the query's co-located
   counterpart is itself). With 1 relevant item per query and leave-one-out removing it,
   F1 is always 0. The problem statement defines ground truth as "geographic
   correspondence" — self-match IS the correct result, so leave-one-out is wrong here.

2. **Demo shows misleading global ranks**: `demo.py` queries the combined SAR+OPT
   index (2334 entries) and reports the global rank field ("Rank 7, 8, 9...") instead
   of a per-modality rank (the optical result at global rank 7 is actually Rank 1 among
   optical results). Judges seeing "Rank 7: Patch 101" think the correct match is buried.

## Context
- `evaluation/evaluate.py` — evaluator with same_modal flag
- `scripts/demo.py` — combined-index query + display
- `retrieval/faiss_utils.py` — rank field is global within queried index

---

## Tasks

<task type="auto">
  <name>Fix same-modal evaluation: remove leave-one-out, re-run both indexes</name>
  <files>evaluation/evaluate.py</files>
  <action>
    **In `evaluation/evaluate.py`**, change the two same-modal calls in `main()` to use
    `same_modal=False` (lines ~148 and ~153):

    ```python
    # BEFORE (leave-one-out — wrong for this dataset)
    m, _ = evaluate_mode(sar_embs, sar_meta, sar_retriever, "sar", args.k, same_modal=True)
    m, _ = evaluate_mode(opt_embs, opt_meta, opt_retriever, "optical", args.k, same_modal=True)

    # AFTER (include self-match — ground truth is geographic co-location)
    m, _ = evaluate_mode(sar_embs, sar_meta, sar_retriever, "sar", args.k, same_modal=False)
    m, _ = evaluate_mode(opt_embs, opt_meta, opt_retriever, "optical", args.k, same_modal=False)
    ```

    Also update the print banners on lines ~147 and ~152:
    ```python
    # BEFORE
    print("\n[1/4] SAR -> SAR (same-modal, leave-one-out)...")
    print("[2/4] OPT -> OPT (same-modal, leave-one-out)...")

    # AFTER
    print("\n[1/4] SAR -> SAR (same-modal)...")
    print("[2/4] OPT -> OPT (same-modal)...")
    ```

    Also update the module docstring at the top of the file — change "We apply leave-one-out
    filtering" to explain that self-match IS the ground truth by geographic correspondence,
    and leave-one-out is not applied because each location has exactly one SAR and one
    optical view.

    DO NOT change the `_filter_self` function or `evaluate_mode` function internals —
    only change the two `same_modal=True` call-sites in `main()`.

    Then re-run evaluation on BOTH indexes:
    ```bash
    source venv/bin/activate && export KMP_DUPLICATE_LIB_OK=TRUE
    python evaluation/evaluate.py --index-dir outputs/index
    python evaluation/evaluate.py --index-dir outputs/index_trained
    ```
  </action>
  <verify>
    python -c "
import json
with open('outputs/index_trained/evaluation_results.json') as f:
    r = json.load(f)
sar_f1 = r['SAR -> SAR']['mean_f1@5']
opt_f1 = r['OPT -> OPT']['mean_f1@5']
cross_f1 = r['SAR -> OPT']['mean_f1@5']
assert sar_f1 > 0.30, f'SAR->SAR F1@5 expected ~0.333, got {sar_f1}'
assert opt_f1 > 0.30, f'OPT->OPT F1@5 expected ~0.333, got {opt_f1}'
assert cross_f1 > 0.28, f'SAR->OPT F1@5 must still be high, got {cross_f1}'
print(f'PASS: SAR->SAR={sar_f1:.4f}, OPT->OPT={opt_f1:.4f}, SAR->OPT={cross_f1:.4f}')
"
  </verify>
  <done>
    - `outputs/index/evaluation_results.json` and `outputs/index_trained/evaluation_results.json`
      both show `mean_f1@5 > 0.30` for SAR→SAR and OPT→OPT.
    - Cross-modal numbers are unchanged (still ~0.30 for trained, ~0.008 for baseline).
    - No print banners say "leave-one-out" anymore.
  </done>
</task>

<task type="auto">
  <name>Fix demo.py: show per-modality rank, not global combined-index rank</name>
  <files>scripts/demo.py</files>
  <action>
    The demo searches the **combined** index (SAR+OPT together, 2334 entries). When
    filtering to optical-only results, the `.rank` field reflects global position among
    2334 entries, not position among optical results.

    Fix: reassign rank AFTER filtering to target modality, so judges see "Rank 1, 2, 3..."
    not "Rank 7, 8, 9...".

    **In `scripts/demo.py`**, change the results display section (lines ~113–119):

    ```python
    # BEFORE
    target_results = [r for r in results[0] if r["modality"] == args.target_modality][:args.k]
    print(f"\nTop-{args.k} results:")
    for r in target_results:
        print(f"  Rank {r['rank']}: Scene {r['scene_id']}, Patch {r['patch_id']}, Score (similarity): {r['score']:.4f}")

    # AFTER — reassign rank within target-modality results
    target_results = [r for r in results[0] if r["modality"] == args.target_modality][:args.k]
    print(f"\nTop-{args.k} results:")
    for local_rank, r in enumerate(target_results, start=1):
        match_flag = " ✓" if (r["patch_id"] == Path(args.query).stem.split("_p")[-1]) else ""
        print(f"  Rank {local_rank}: Scene {r['scene_id']}, Patch {r['patch_id']}, "
              f"Score: {r['score']:.4f}{match_flag}")
    ```

    Also update the visualization loop (lines ~138–153) to use `enumerate(target_results, 1)`
    for rank labels on the subplot titles instead of `r['rank']`:

    ```python
    for i, r in enumerate(target_results):
        ...
        axes[i + 1].set_title(f"Rank {i+1}\nScore: {r['score']:.3f}")
    ```
    (This is already correct — just verify it's using `i+1` not `r['rank']`.)

    Also note: the query_path stem parsing for match_flag may vary. Use a simpler check:
    parse the query patch_id from args.query filename using the same regex as the dataset,
    then compare with `r["patch_id"]`.

    ```python
    import re
    _q_match = re.search(r"_p(\d+)\.tif$", args.query)
    query_patch_id = _q_match.group(1) if _q_match else None

    for local_rank, r in enumerate(target_results, start=1):
        match = " ✓ MATCH" if (query_patch_id and r["patch_id"] == query_patch_id) else ""
        print(f"  Rank {local_rank}: Scene {r['scene_id']}, Patch {r['patch_id']}, "
              f"Score: {r['score']:.4f}{match}")
    ```

    DO NOT change the model loading, FAISS search, or visualization rendering logic.
  </action>
  <verify>
    source venv/bin/activate && export KMP_DUPLICATE_LIB_OK=TRUE
    python scripts/demo.py \
      --query data/sen12ms-subset/ROIs2017_winter_s1/s1_21/ROIs2017_winter_s1_21_p100.tif \
      --index-dir outputs/index_trained --save 2>&1 | grep "Rank"
    # Expected output: "Rank 1:", "Rank 2:", "Rank 3:", "Rank 4:", "Rank 5:"
    # NOT "Rank 7:", "Rank 8:", etc.
    # Patch 100 should show "✓ MATCH"
  </verify>
  <done>
    - Demo output shows "Rank 1:", "Rank 2:", ... up to "Rank 5:"
    - The co-located match (patch_id == query patch_id) shows "✓ MATCH" marker
    - Saved demo_result.png still generated without error
  </done>
</task>

## Success Criteria
- [ ] `mean_f1@5` for SAR→SAR and OPT→OPT both > 0.30 in `evaluation_results.json` (both indexes)
- [ ] Cross-modal F1@5 unchanged from pre-fix values (±0.001)
- [ ] `demo.py` prints "Rank 1:" through "Rank 5:" (per-modality rank, not global)
- [ ] Demo correctly marks the co-located match with "✓ MATCH"

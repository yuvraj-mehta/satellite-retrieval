---
phase: 10
plan: 2
wave: 2
---

# Plan 10.2: Semantic Evaluation Run + Dashboard Update

## Objective

Wire the semantic metrics from Plan 10.1 into the evaluation runner and the benchmark
endpoint. After this plan, running `evaluate.py --lc-labels` will produce both
geographic and semantic scores in `evaluation_results.json`, and the UI Benchmarks tab
will render a side-by-side comparison so judges can see the improvement immediately.

## Context

- `backend/evaluation/evaluate.py` — current geographic evaluator
- `backend/evaluation/metrics.py` — now has `mean_semantic_f1_at_k()` (Plan 10.1)
- `backend/outputs/index/lc_labels.json` — created by Plan 10.1
- `backend/api/benchmark.py` — serves /benchmarks; currently returns geographic results only
- `ui/src/components/BenchmarkDashboard.jsx` — renders metric cards (Plan 9.2)

## Tasks

<task type="auto">
  <name>Add --lc-labels flag to evaluate.py for dual-mode evaluation</name>
  <files>
    backend/evaluation/evaluate.py
  </files>
  <action>
    Modify `backend/evaluation/evaluate.py`:

    1. Add argument: `parser.add_argument("--lc-labels", default=None, help="Path to lc_labels.json for semantic evaluation")`
    2. After loading LC labels (if `--lc-labels` path is provided):
       - Load `lc_labels.json` → extract the `"labels"` sub-dict into `lc_labels: Dict[str, int]`
       - Print: `[Semantic] LC labels loaded: {total_patches} patches across {N} classes`
    3. Inside `evaluate_mode()`, after computing geographic metrics, if `lc_labels` is not None:
       - Import and call `mean_semantic_f1_at_k()` for each k value
       - Prefix keys with `"semantic_"` to avoid collision (already done by the function)
       - Merge into the `metrics` dict
    4. Update the printed report table to show `Sem-F1@5` column when lc_labels is provided.
    5. The saved `evaluation_results.json` already gets all merged keys — no extra save logic needed.

    Signature change to `evaluate_mode()`:
    Add optional `lc_labels: Optional[Dict[str, int]] = None` parameter.
    Pass it through from `main()` when the flag is set.

    Do NOT change the geographic logic — only add the semantic branch alongside it.
    Do NOT remove MRR or latency metrics from the output.
  </action>
  <verify>
    cd /Users/yuvrajmehta/Developer/satellite-retrieval/backend
    ../../venv/bin/python evaluation/evaluate.py \
      --index-dir outputs/index \
      --lc-labels outputs/index/lc_labels.json \
      --k 5 10 2>&1 | tail -20
    ../../venv/bin/python -c "
import json
with open('outputs/index/evaluation_results.json') as f:
    d = json.load(f)
# Check semantic keys exist in cross-modal modes
sar_opt = d['SAR -> OPT']
assert 'semantic_mean_f1@5' in sar_opt, f'Missing semantic key: {list(sar_opt.keys())}'
sem_f1 = sar_opt['semantic_mean_f1@5']
geo_f1 = sar_opt['mean_f1@5']
assert sem_f1 > geo_f1, f'Semantic F1 {sem_f1:.4f} should be > geo F1 {geo_f1:.4f}'
print(f'PASS: SAR->OPT geo F1@5={geo_f1:.4f}, semantic F1@5={sem_f1:.4f}')
"
  </verify>
  <done>
    - `evaluate.py --lc-labels` runs without errors
    - `evaluation_results.json` contains `semantic_mean_f1@5` keys for all 4 modes
    - Semantic F1@5 for cross-modal modes (SAR→OPT, OPT→SAR) is strictly greater than geographic F1@5
  </done>
</task>

<task type="auto">
  <name>Update BenchmarkDashboard to render semantic vs geographic comparison</name>
  <files>
    ui/src/components/BenchmarkDashboard.jsx
    ui/src/components/BenchmarkDashboard.css
  </files>
  <action>
    Update `BenchmarkDashboard.jsx` to conditionally display a semantic comparison row
    when `data.has_semantic` is true (set by the benchmark.py router in Plan 9.1):

    1. When `has_semantic` is false: render as before (geographic F1 bars only) with the
       existing caution note about semantic evaluation coming in Phase 10.
    2. When `has_semantic` is true:
       - In each mode card, add a second row of bars labeled "Semantic F1@5" using a
         different color (`#a855f7` — purple) so the improvement is visually obvious.
       - Add a `<div className="semantic-improvement">` showing the improvement ratio:
         `+{Math.round((sem - geo) / geo * 100)}% vs geographic` in green text.
       - Remove the caution note about Phase 10 being incomplete.
       - Add a new note: "✅ Semantic LC evaluation active — patches sharing the same
         land-cover class counted as relevant."

    Update `BenchmarkDashboard.css`:
    - `.semantic-improvement` — color #00ff9d, font-size 0.75rem, margin-top 0.25rem
    - Add purple variant: `.bar-fill.semantic` — background #a855f7

    Do NOT remove geographic bars — show both side by side for comparison.
    Keep all existing card structure — only extend it.
  </action>
  <verify>
    test -f /Users/yuvrajmehta/Developer/satellite-retrieval/ui/src/components/BenchmarkDashboard.jsx
    grep -q "has_semantic" /Users/yuvrajmehta/Developer/satellite-retrieval/ui/src/components/BenchmarkDashboard.jsx && echo "PASS: has_semantic conditional present"
    grep -q "semantic-improvement" /Users/yuvrajmehta/Developer/satellite-retrieval/ui/src/components/BenchmarkDashboard.css && echo "PASS: semantic css class present"
    cd /Users/yuvrajmehta/Developer/satellite-retrieval/ui && npx vite build --outDir /tmp/vite-test-build 2>&1 | tail -3
  </verify>
  <done>
    - `BenchmarkDashboard.jsx` branches on `data.has_semantic`
    - When semantic data exists, purple bars appear alongside cyan geographic bars in each card
    - Improvement percentage displayed per mode card
    - Vite build passes with 0 errors
  </done>
</task>

## Success Criteria
- [ ] `evaluate.py --lc-labels outputs/index/lc_labels.json` runs and prints both geo and semantic columns
- [ ] `evaluation_results.json` contains `semantic_mean_f1@5` keys in all 4 mode objects
- [ ] Cross-modal semantic F1@5 is strictly greater than geographic F1@5
- [ ] BenchmarkDashboard conditionally shows purple semantic bars when `has_semantic=true`
- [ ] Vite build passes with 0 errors after dashboard update

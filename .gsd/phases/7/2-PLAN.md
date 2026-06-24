---
phase: 7
plan: 2
wave: 1
---

# Plan 7.2: Update README with Final v1.1 Metrics + compare_results.py Fix

## Objective

Two submission-readiness issues:

1. **README metrics are stale**: Still shows Phase 4 numbers (SAR→OPT F1@5 = 0.2576,
   same-modal F1 = 0.3333 from OLD evaluation without leave-one-out). After Plan 7.1,
   the correct final numbers are:
   - Same-modal: F1@5 ≈ 0.3333, F1@10 ≈ 0.1818 (self-match included)
   - Cross-modal trained: F1@5 ≈ 0.3008, Recall@5 ≈ 90.2%, MRR ≈ 0.706

2. **compare_results.py doesn't show MRR**: The comparison script only shows F1 deltas.
   MRR is a strong result (0.706) that should be prominently highlighted in the comparison.

## Context
- `README.md` — metrics table to update
- `scripts/compare_results.py` — comparison script
- `outputs/index/evaluation_results.json` — baseline results (post Plan 7.1)
- `outputs/index_trained/evaluation_results.json` — trained results (post Plan 7.1)

---

## Tasks

<task type="auto">
  <name>Update README.md with correct v1.1 final numbers and MRR column</name>
  <files>README.md</files>
  <action>
    Replace BOTH metrics tables in `README.md` (the baseline table and the trained table)
    with the correct numbers from the freshly re-run evaluation JSONs after Plan 7.1.

    **New Baseline (MVP ResNet50 — from `outputs/index/evaluation_results.json`):**
    Note: After Plan 7.1, same-modal now shows ~0.333 F1@5 (self-match included).
    Read the actual numbers from the JSON — do not hardcode guesses.

    **New Trained (DualEncoder v1.1 — from `outputs/index_trained/evaluation_results.json`):**
    Add a MRR column to both tables. Format:

    ```markdown
    | Mode | F1@5 | Recall@5 | F1@10 | Recall@10 | MRR | Latency/query |
    |---|---|---|---|---|---|---|
    | **SAR → SAR** | ... | ... | ... | ... | ... | Xms |
    | **OPT → OPT** | ... | ... | ... | ... | ... | Xms |
    | **SAR → OPT** | ... | ... | ... | ... | ... | Xms |
    | **OPT → SAR** | ... | ... | ... | ... | ... | Xms |
    ```

    Also update the header of the README — line 11 currently says "shared projection head"
    (old v1.0 description). Update it to reflect the v1.1 architecture:
    - torchgeo sensor-native backbones (SENTINEL1_ALL_MOCO + SENTINEL2_RGB_MOCO)
    - Separate CLIP-style projection heads per modality
    - 4-channel optical input (B4, B8, B11, B12)
    - Z-score normalization

    Update the `pip install` line in "Installation" to include torchgeo:
    ```bash
    pip install torch==2.12.1 torchvision==0.27.1 torchgeo faiss-cpu==1.14.3 \
                rasterio==1.4.4 numpy==1.26.4 matplotlib pillow tqdm
    ```

    DO NOT change the project structure section, dataset setup section, or command examples.
  </action>
  <verify>
    python -c "
import json, re
with open('README.md') as f:
    readme = f.read()
# Check MRR appears in README
assert 'MRR' in readme, 'README must contain MRR column'
# Check torchgeo appears in install instructions
assert 'torchgeo' in readme, 'README must mention torchgeo in install'
# Check old stale numbers are gone (0.2576 was old SAR->OPT F1@5)
assert '0.2576' not in readme, 'Stale 0.2576 still in README'
print('PASS: README updated with v1.1 metrics and torchgeo dependency')
"
  </verify>
  <done>
    - README.md shows two tables (baseline + trained) with F1@5, Recall@5, F1@10, Recall@10, MRR, Latency columns
    - Same-modal F1@5 shows ~0.333 (not 0.000)
    - Trained SAR→OPT F1@5 shows ~0.30 (not 0.257)
    - torchgeo included in pip install line
    - Architecture description reflects v1.1 (separate heads, sensor-native weights)
  </done>
</task>

<task type="auto">
  <name>Fix compare_results.py to include MRR in comparison output</name>
  <files>scripts/compare_results.py</files>
  <action>
    The current `compare_results.py` only compares F1@5 and F1@10. Add MRR to the output.

    **In `scripts/compare_results.py`**, extend the improvement summary loop to also
    print MRR delta:

    ```python
    # EXISTING loop (keep this, just add MRR after):
    for mode in modes:
        for k in [5, 10]:
            key = f"mean_f1@{k}"
            if key in baseline[mode] and key in trained[mode]:
                base_f1 = baseline[mode][key]
                train_f1 = trained[mode][key]
                delta = train_f1 - base_f1
                sign = "+" if delta >= 0 else ""
                print(f"{mode:<20} F1@{k}: {base_f1:.4f} -> {train_f1:.4f} ({sign}{delta:.4f})")

    # ADD AFTER THE F1 LOOP:
    print()
    print("MRR (Mean Reciprocal Rank):")
    for mode in modes:
        if "mrr" in baseline.get(mode, {}) and "mrr" in trained.get(mode, {}):
            base_mrr = baseline[mode]["mrr"]
            train_mrr = trained[mode]["mrr"]
            delta = train_mrr - base_mrr
            sign = "+" if delta >= 0 else ""
            print(f"  {mode:<20} MRR: {base_mrr:.4f} -> {train_mrr:.4f} ({sign}{delta:.4f})")
    ```

    Also add a summary line at the end that prints the key headline number:
    ```python
    # KEY HEADLINE NUMBERS
    print()
    print("=" * 70)
    cross_f1_trained = trained.get("SAR -> OPT", {}).get("mean_f1@5", 0)
    cross_mrr_trained = trained.get("SAR -> OPT", {}).get("mrr", 0)
    print(f"HEADLINE: Cross-modal SAR->OPT | F1@5={cross_f1_trained:.4f} | MRR={cross_mrr_trained:.4f}")
    print(f"          (F1@5 ceiling = 0.3333 for 1 ground truth per query)")
    ```

    DO NOT change the existing logic for loading JSONs or running sub-evaluations.
  </action>
  <verify>
    source venv/bin/activate && python scripts/compare_results.py 2>&1 | grep -E "(MRR|HEADLINE)"
    # Expected: lines starting with "MRR (Mean Reciprocal Rank):" and "HEADLINE:"
  </verify>
  <done>
    - `python scripts/compare_results.py` shows MRR comparison for all 4 modes
    - HEADLINE line shows SAR→OPT F1@5 and MRR for the trained model
    - No errors when run after Plan 7.1 re-evaluations are complete
  </done>
</task>

## Success Criteria
- [ ] README baseline table shows SAR→SAR and OPT→OPT F1@5 ≈ 0.333 (not 0.000)
- [ ] README trained table shows SAR→OPT F1@5 ≈ 0.30 and MRR ≈ 0.706
- [ ] `python scripts/compare_results.py` prints MRR section and HEADLINE line
- [ ] `README.md` contains `torchgeo` in pip install instructions
- [ ] Stale number `0.2576` no longer appears in README

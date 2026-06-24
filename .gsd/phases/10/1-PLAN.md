---
phase: 10
plan: 1
wave: 1
---

# Plan 10.1: LC Index Script + Semantic Metrics

## Objective

Build the semantic ground-truth layer by extracting majority Land Cover (LC) class labels
from the SEN12MS IGBP pickle file and computing semantic F1@K metrics. After this plan,
`backend/outputs/index/lc_labels.json` will exist and `metrics.py` will expose a new
`mean_semantic_f1_at_k()` function that declares two patches "relevant" if they share
the same dominant LC class.

The `single_label_IGBPfull_ClsNum.pkl` file already exists at
`backend/SEN12MS-master/labels/` and has been verified to cover all 1,167 dataset patches
with zero missing entries.

## Context

- `backend/SEN12MS-master/labels/single_label_IGBPfull_ClsNum.pkl` — dict mapping
  `"ROIs2017_winter_s2_{scene_id}_p{patch_id}.tif"` → int LC class (IGBP full, 17 classes)
- `backend/datasets/sen12ms_dataset.py` — `SEN12MSDataset` with `.samples` list of
  `(s1_path, s2_path, scene_id, patch_id)` tuples
- `backend/evaluation/metrics.py` — current `mean_f1_at_k()` using geographic gt_key
- `backend/outputs/index/sar_metadata.pkl` + `opt_metadata.pkl` — list of dicts with
  `scene_id`, `patch_id`, `modality` keys used by evaluate.py
- IGBP class names reference (embed in script comments):
  1=Evergreen Needleleaf, 2=Evergreen Broadleaf, 3=Deciduous Needleleaf,
  4=Deciduous Broadleaf, 5=Mixed Forest, 6=Closed Shrubland, 7=Open Shrubland,
  8=Woody Savanna, 9=Savanna, 10=Grassland, 11=Wetland, 12=Cropland,
  13=Urban, 14=Cropland/Natural Mosaic, 15=Snow/Ice, 16=Barren, 17=Water

## Tasks

<task type="auto">
  <name>Write backend/scripts/build_lc_index.py</name>
  <files>
    backend/scripts/build_lc_index.py
  </files>
  <action>
    Create `backend/scripts/build_lc_index.py`. Run from project root as:
    `./venv/bin/python backend/scripts/build_lc_index.py`

    Script logic:
    1. Load `backend/SEN12MS-master/labels/single_label_IGBPfull_ClsNum.pkl` with pickle.
    2. For each entry in the pickle dict, parse the filename:
       `ROIs2017_winter_s2_{scene_id}_p{patch_id}.tif`
       to extract `scene_id` and `patch_id`.
    3. Build output dict: `{ "{scene_id}_{patch_id}": lc_class_int }`.
    4. Also build a summary dict: `{ lc_class_int: count }` — count how many patches
       belong to each class in our winter/scene-21-22 subset.
    5. Write `backend/outputs/index/lc_labels.json` with:
       ```json
       {
         "labels": { "{scene}_{patch}": int, ... },
         "class_counts": { "1": int, ... },
         "igbp_class_names": { "1": "Evergreen Needleleaf", ..., "17": "Water" },
         "total_patches": int
       }
       ```
    6. Print a summary table showing class distribution.

    Filter rule: only include patches that match the winter ROI pattern
    `ROIs2017_winter_s2_*` — ignore spring/summer entries in the pickle.

    Do NOT load the full SEN12MSDataset — just read the pickle file directly.
    Do NOT use rasterio — label data is in the pickle, not tif files.
    Run from project root; use absolute paths derived from `Path(__file__)`.
  </action>
  <verify>
    cd /Users/yuvrajmehta/Developer/satellite-retrieval
    ./venv/bin/python backend/scripts/build_lc_index.py
    ./venv/bin/python -c "
import json
with open('backend/outputs/index/lc_labels.json') as f:
    d = json.load(f)
assert 'labels' in d and 'class_counts' in d and 'igbp_class_names' in d
assert d['total_patches'] >= 1000, f'Too few patches: {d[\"total_patches\"]}'
print('PASS: lc_labels.json has', d['total_patches'], 'patches')
# Verify a known entry
assert '21_100' in d['labels'] or any('_100' in k for k in list(d['labels'].keys())[:20])
print('PASS: sample key present:', [k for k in list(d['labels'].keys())[:3]])
"
  </verify>
  <done>
    - `backend/outputs/index/lc_labels.json` exists with `labels`, `class_counts`, `igbp_class_names`, `total_patches`
    - `total_patches` >= 1000 (all winter patches covered)
    - Script prints a class distribution summary without errors
  </done>
</task>

<task type="auto">
  <name>Add mean_semantic_f1_at_k() to metrics.py</name>
  <files>
    backend/evaluation/metrics.py
  </files>
  <action>
    Append a new function `mean_semantic_f1_at_k()` to the end of
    `backend/evaluation/metrics.py`. Do NOT modify any existing functions.

    Function signature:
    ```python
    def mean_semantic_f1_at_k(
        queries: List[Dict[str, Any]],
        results: List[List[Dict[str, Any]]],
        k: int,
        target_modality: str,
        lc_labels: Dict[str, int],
    ) -> Dict[str, float]:
    ```

    Logic:
    - For each query, look up its LC class: `lc_labels.get(f"{query['scene_id']}_{query['patch_id']}")`
    - If not found, skip this query (don't add to metrics — don't fail).
    - Build `relevant` set: all retrieved-result keys `"{modality}_{scene_id}_{patch_id}"`
      where `lc_labels.get(f"{r['scene_id']}_{r['patch_id']}") == query_lc_class`.
    - Note: `relevant` now has MULTIPLE items (all patches of same class).
    - Compute precision@k, recall@k, f1@k using the existing helper functions above.
    - Return same shape as `mean_f1_at_k()`:
      `{ f"semantic_mean_f1@{k}": float, f"semantic_mean_precision@{k}": float,
         f"semantic_mean_recall@{k}": float, f"semantic_std_f1@{k}": float }`

    Add a unit test at the bottom of the `if __name__ == "__main__"` block:
    - Construct a query with lc_class=9 (Savanna)
    - Two results: one with lc_class=9 (should be relevant), one with lc_class=12 (not)
    - Assert semantic_mean_f1@2 > 0
    - Print "PASS semantic_mean_f1_at_k"
  </action>
  <verify>
    cd /Users/yuvrajmehta/Developer/satellite-retrieval/backend
    ../../venv/bin/python evaluation/metrics.py 2>&1 | grep -E "PASS|FAIL|Error"
    ../../venv/bin/python -c "
from evaluation.metrics import mean_semantic_f1_at_k
q = [{'scene_id': '21', 'patch_id': '100', 'modality': 'sar'}]
res = [[
    {'modality': 'optical', 'scene_id': '21', 'patch_id': '200', 'score': 0.9},
    {'modality': 'optical', 'scene_id': '21', 'patch_id': '300', 'score': 0.8},
]]
lc = {'21_100': 9, '21_200': 9, '21_300': 12}
out = mean_semantic_f1_at_k(q, res, k=2, target_modality='optical', lc_labels=lc)
assert out['semantic_mean_f1@2'] > 0, out
print('PASS import + call:', out)
"
  </verify>
  <done>
    - `mean_semantic_f1_at_k()` is importable from `evaluation.metrics`
    - Returns dict with `semantic_mean_f1@k` key > 0 when a matching-class result is retrieved
    - All existing metrics.py unit tests still pass
  </done>
</task>

## Success Criteria
- [ ] `backend/outputs/index/lc_labels.json` exists with ≥ 1,000 patches
- [ ] `from evaluation.metrics import mean_semantic_f1_at_k` imports cleanly
- [ ] Semantic F1 unit test passes: patches sharing LC class are counted as relevant
- [ ] All original metrics.py unit tests still pass (no regression)

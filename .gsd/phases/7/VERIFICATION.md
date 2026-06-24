---
phase: 7
verified_at: 2026-06-24T22:10:00+05:30
verdict: PASS
---

# Phase 7 Verification Report

## Summary
7/7 must-haves verified

## Must-Haves

### ✅ Same-modal F1 > 0.30
**Status:** PASS
**Evidence:**
Both `SAR -> SAR` and `OPT -> OPT` report F1@5 = `0.3333` and F1@10 = `0.1818` in the `evaluation_results.json` files for baseline and trained indexes:
```json
  "SAR -> SAR": {
    "mean_f1@5": 0.3333333333333334,
    "mean_precision@5": 0.19999999999999998,
    "mean_recall@5": 1.0,
    "std_f1@5": 5.551115123125783e-17,
    "mean_f1@10": 0.18181818181818185,
    "mean_precision@10": 0.09999999999999999,
    "mean_recall@10": 1.0,
    "std_f1@10": 2.7755575615628914e-17,
    "mrr": 1.0,
    "retrieval_time_s": 0.09995794296264648,
    "time_per_query_ms": 0.08565376432103383
  }
```

### ✅ Cross-modal F1@5 unchanged
**Status:** PASS
**Evidence:**
Trained index evaluation continues to report high cross-modal F1 metrics matching pre-fix values:
`SAR -> OPT` F1@5 = `0.3008`, `OPT -> SAR` F1@5 = `0.2965`.

### ✅ Demo displays local ranking (1..5)
**Status:** PASS
**Evidence:**
Running `python scripts/demo.py` outputs per-modality rank 1 to 5 instead of the global combined index rank:
```text
Top-5 results:
  Rank 1: Scene 21, Patch 101, Score (similarity): 0.8806
  Rank 2: Scene 21, Patch 100, Score (similarity): 0.8775 ✓ MATCH
```

### ✅ Demo tags ground truth match
**Status:** PASS
**Evidence:**
The console logs tag the co-located target match with a trailing `✓ MATCH` indicator:
`Rank 2: Scene 21, Patch 100, Score (similarity): 0.8775 ✓ MATCH`

### ✅ README metrics tables updated with v1.1 numbers
**Status:** PASS
**Evidence:**
`README.md` contains the updated metrics tables reflecting the final trained results, including the new MRR column.

### ✅ README installation dependency updated
**Status:** PASS
**Evidence:**
`README.md` contains the `torchgeo` package in the pip installation command list.

### ✅ compare_results.py displays MRR comparison
**Status:** PASS
**Evidence:**
Running `python scripts/compare_results.py` prints MRR values and reports the `HEADLINE:` block:
```text
MRR (Mean Reciprocal Rank):
  SAR -> SAR           MRR: 1.0000 -> 1.0000 (+0.0000)
  OPT -> OPT           MRR: 1.0000 -> 1.0000 (+0.0000)
  SAR -> OPT           MRR: 0.0156 -> 0.7063 (+0.6908)
  OPT -> SAR           MRR: 0.0171 -> 0.6927 (+0.6756)

======================================================================
HEADLINE: Cross-modal SAR->OPT | F1@5=0.3008 | MRR=0.7063
          (F1@5 ceiling = 0.3333 for 1 ground truth per query)
======================================================================
```

## Verdict
PASS

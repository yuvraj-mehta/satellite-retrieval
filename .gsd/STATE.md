# STATE.md — Project Memory

> Last Updated: 2026-06-25
> Session: Phases 9–12 planned (Evaluation Dashboard, Semantic Eval, 3-Modality, Hard Neg Mining)

## Current Position
- **Phase**: 9 — Evaluation Dashboard UI
- **Status**: 🔄 Plans written — ready for /execute 9

## Phase 9–12 Plans
| Phase | Name | Plans | Wave |
|-------|------|-------|------|
| 9  | Evaluation Dashboard UI | `9/1-PLAN.md` (backend router), `9/2-PLAN.md` (React dashboard + tabs) | 1→2 |
| 10 | Semantic Evaluation (LC Labels) | `10/1-PLAN.md` (LC index + metrics.py), `10/2-PLAN.md` (evaluate.py + UI update) | 1→2 |
| 11 | Three-Modality Support | `11/1-PLAN.md` (dataset + encoder), `11/2-PLAN.md` (API + UI dropdown) | 1→2 |
| 12 | Hard Negative Mining | `12/1-PLAN.md` (dataset + loss), `12/2-PLAN.md` (train.py flag) | 1→2 |

## Next Steps
1. `/execute 9` — run Phase 9 plans (no retraining, immediate judge impact)
2. `/execute 10` — run Phase 10 plans (needs LC labels — already available)
3. `/execute 11` — run Phase 11 plans (no retraining needed — Option A shared encoder)
4. `/execute 12` — run Phase 12 plans, then retrain the model (~2hr on GPU)


## Phase 6 Plans
| Plan | Focus | Wave |
|------|-------|------|
| `6/1-PLAN.md` | torchgeo backbones + separate projection heads | 1 |
| `6/2-PLAN.md` | 4-channel optical (NIR+SWIR) + SAR Z-score normalization | 1 |
| `6/3-PLAN.md` | Evaluation leakage fix + MRR metric + LR warmup | 2 |

---

## Previous Position

- **Phase**: Complete 🎉
- **Status**: Milestone COMPLETE ✅ — all 5 phases successfully implemented and verified

## Last Session Summary

Phase 5 executed successfully. 1 plan, 3 tasks completed.

- Implemented `scripts/demo.py` supporting baseline fallback and matplotlib query result visualization.
- Verified demo execution successfully queries baseline index and saves outputs to `outputs/demo_result.png`.
- Created comprehensive documentation in `README.md` detailing the retrieval codebase, datasets, and pipeline guides.

## Milestone Status

All 5 phases of the project have been fully developed:
1. **Phase 1** ✅: fixed Broken SEN12MS dataset loader, verified dB & co-location normalization.
2. **Phase 2** ✅: implemented ResNet50 baseline and FAISS IndexFlatIP retriever.
3. **Phase 3** ✅: implemented co-location metrics (Precision@K, Recall@K, F1@K) and evaluated zero-shot baseline.
4. **Phase 4** ✅: implemented DualEncoder architecture, InfoNCE Loss, and the training loop script.
5. **Phase 5** ✅: implemented the retrieval visualization demo, Timing benchmark, and the usage instructions.

## Next Steps

1. Run contrastive training using the GPU machine when resources permit:
   ```bash
   python train.py --epochs 50 --batch-size 32
   ```
2. Build trained index and evaluate deltas:
   ```bash
   python scripts/build_index.py --checkpoint outputs/checkpoints/best_model.pt
   python scripts/compare_results.py
   ```

## Files That Exist (Non-Empty)

- `datasets/sen12ms_dataset.py` — Fixed pairing logic, dB normalization
- `models/encoder.py` — Pretrained ResNet50 with channel adapter
- `models/dual_encoder.py` — Contrastive DualEncoder and InfoNCELoss
- `retrieval/faiss_utils.py` — FAISSRetriever wrapper for vector search
- `evaluation/metrics.py` — precision_at_k, recall_at_k, f1_at_k, mean_f1_at_k
- `evaluation/evaluate.py` — multi-mode retrieval evaluation runner
- `train.py` — Main dual-encoder contrastive training loop
- `scripts/verify_dataset.py` — Checks dataset assertions
- `scripts/visualize_samples.py` — Save visual side-by-side plots
- `scripts/build_index.py` — Extraction and index generation script (with checkpoint support)
- `scripts/retrieve.py` — Command-line query tool
- `scripts/demo.py` — End-to-end visual retrieval query demo
- `scripts/compare_results.py` — Baseline vs. trained evaluation delta comparison
- `check_dataset.py` — Initial path check
- `test_dataset.py` — Simple load test
- `README.md` — Complete instructions and setup manual

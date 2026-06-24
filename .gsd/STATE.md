# STATE.md — Project Memory

> Last Updated: 2026-06-25
> Session: Phase 8 complete — Web UI

## Current Position
- **Phase**: 8 (verified)
- **Status**: ✅ Complete and verified

## Last Session Summary
Phase 8 executed successfully.
- Restructured the workspace into `backend/` and `ui/` directories to separate concerns.
- Implemented a FastAPI API wrapper (`backend/api/`) around the trained `DualEncoder` model and FAISS vector index.
- Created a Vite + React application (`ui/`) with dropzone file uploading, modality selection, live latencies, and search grids.

## Next Steps
1. All phases of the roadmap are successfully completed and verified! 🎉

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

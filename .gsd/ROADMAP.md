# ROADMAP.md

> **Current Phase**: Phase 10 — Semantic Evaluation (Land Cover Labels)
> **Milestone**: v1.3 — Hackathon Finalist Polish

---

## Must-Haves (from SPEC)

- [x] Virtual environment and all dependencies installed
- [x] Dataset loader correctly pairs all 1167 SAR/optical patch pairs
- [x] Visualization confirms data quality (channels, resolution, value ranges)
- [x] MVP retrieval pipeline (ResNet50 + FAISS) working end-to-end
- [x] Contrastive dual-encoder trained and evaluated
- [x] F1@5 and F1@10 metrics reported for same-modal and cross-modal retrieval
- [x] Retrieval time < 100ms per query

---

## Phases

### Phase 1: Dataset Loader Fix & Validation
**Status**: ✅ Complete
**Objective**: Fix the broken pairing logic in `SEN12MSDataset`, validate all 1167 pairs load correctly, inspect channel statistics, and visualize SAR/optical samples side-by-side. Establish solid data foundation before touching models.

**Key Tasks**:
- Rewrite `datasets/sen12ms_dataset.py` with correct path logic
  - Pattern: `ROIs2017_winter_s1/s1_{scene}/ROIs2017_winter_s1_{scene}_p{patch}.tif`
  - Pair by matching scene + patch ID across s1/s2 directories
- Add normalization (SAR: dB scale → [0,1]; Optical: divide by 10000)
- Add channel inspection and validation
- Implement `scripts/visualize_samples.py` for side-by-side display
- Write `scripts/verify_dataset.py` that asserts exactly 1167 pairs found

**Requirements**: SPEC Goals 1, 5

---

### Phase 2: MVP Retrieval Pipeline (No Training)
**Status**: ✅ Complete
**Objective**: Build a working end-to-end retrieval pipeline using pretrained ResNet50 to extract 2048-d embeddings from both modalities, build a FAISS index, and retrieve Top-5 / Top-10 results. This validates the full pipeline before any training.

**Key Tasks**:
- Implement `models/encoder.py` — ResNet50 feature extractor (strip final FC, return 2048-d pooled features)
- Implement `retrieval/faiss_utils.py` — build `IndexFlatIP` (cosine via L2 normalization), add/search operations
- Implement `scripts/build_index.py` — load dataset, extract all embeddings, save index + metadata
- Implement `scripts/retrieve.py` — query by image path, display Top-K results
- Add channel adapter: SAR (2-ch) → replicate to 3-ch; Optical (13-ch) → select RGB bands (B4, B3, B2)

**Requirements**: SPEC Goals 2, 5

---

### Phase 3: Evaluation Framework
**Status**: ✅ Complete
**Objective**: Implement rigorous evaluation metrics. Since the dataset uses geographically co-located patch pairs, ground truth is defined as: same scene+patch ID across modalities. Measure F1@5 and F1@10 for all four retrieval modes.

**Key Tasks**:
- Define ground truth: for query patch `(scene_id, patch_id)`, relevant results = same `(scene_id, patch_id)` across all modalities
- Implement `evaluation/metrics.py` — Precision@K, Recall@K, F1@K
- Implement `evaluation/evaluate.py` — run all 4 retrieval modes:
  - SAR → SAR (same-modal)
  - Optical → Optical (same-modal)
  - SAR → Optical (cross-modal)
  - Optical → SAR (cross-modal)
- Generate evaluation report with all metrics + retrieval time

**Requirements**: SPEC Goals 4, 5

---

### Phase 4: Contrastive Dual-Encoder Training
**Status**: ✅ Complete
**Objective**: Train a dual-encoder model with contrastive loss to learn a shared embedding space that aligns SAR and optical representations. This is the core competitive differentiator. Train on M1 for prototyping, HP Victus for full training.

**Key Tasks**:
- Implement `models/dual_encoder.py` — two ResNet50 branches (SAR encoder + Optical encoder) with shared projection head (2048→512)
- Implement triplet loss with online hard-negative mining
- Implement `train.py` — training loop with:
  - MPS device support
  - Gradient accumulation for small batches
  - Checkpoint saving every N epochs
  - Validation F1 tracking
- Implement `scripts/train_contrastive.py` entry point

**Requirements**: SPEC Goals 3, 4, 5

---

### Phase 5: Optimization & Submission Polish
**Status**: ✅ Complete
**Objective**: Optimize retrieval speed, improve embedding quality (optionally with DINOv2/foundation models), and produce clean submission-ready code with documentation.

**Key Tasks**:
- Benchmark retrieval time, ensure < 100ms per query
- Try FAISS `IndexIVFFlat` or `IndexHNSW` if flat index is slow
- Add `scripts/demo.py` — end-to-end demo: load model, query, display results
- Write `README.md` with setup, training, evaluation instructions
- Optional: experiment with DINOv2 or remote sensing foundation model (CROMA/Prithvi) as backbone
- Final evaluation run with trained model — capture F1@5 and F1@10 for submission

**Requirements**: SPEC Goals 4, 5

---

### Phase 6: Architectural & Scientific Hardening
**Status**: ✅ Complete
**Objective**: Fix the architectural and scientific flaws identified in the critical evaluation:
1. Replace ImageNet ResNet50 with torchgeo sensor-native weights (SENTINEL1_GRD_MOCO / SENTINEL2_RGB_MOCO)
2. Give each modality its own projection head (CLIP-style, not shared)
3. Expand optical input from 3-ch RGB to 4-ch (B4+B8+B11+B12)
4. Fix SAR normalization to use empirical per-band mean/std instead of hardcoded [-25,0] dB
5. Fix evaluation gallery leakage (exclude self from same-modal search)
6. Add MRR metric, LR warmup, and corrected temperature τ=0.1

**Plans**: `6/1-PLAN.md` (backbone+arch) → `6/2-PLAN.md` (data) → `6/3-PLAN.md` (eval+training)

**Requirements**: SPEC Goals 3, 4, 5

---

### Phase 7: Submission Fixes & Polish
**Status**: ✅ Complete

---

### Phase 8: React UI
**Status**: ✅ Complete
**Objective**: Build a full-stack interactive web UI for the retrieval system. A FastAPI backend exposes the trained model as a REST API. A React (Vite) frontend lets users upload a query `.tif` image, select query/target modalities, view the Top-5 retrieved results as rendered satellite image tiles with similarity scores and match badges.

**Key Tasks**:
- Implement `api/main.py` — FastAPI server exposing `/query` (POST) and `/health` (GET) endpoints
- Scaffold React app (`ui/`) using Vite — file upload, modality selectors, results grid
- Build results display — render SAR (grayscale VV band) and optical (RGB composite) tiles with rank badges and similarity scores

**Plans**: `8/1-PLAN.md` (FastAPI backend) → `8/2-PLAN.md` (React scaffold + upload) → `8/3-PLAN.md` (results display + polish)

**Requirements**: SPEC Goals 5 (clean, presentable code)
**Objective**: Fix two issues that make the system appear broken to hackathon judges:
1. Same-modal F1 shows 0.000 due to incorrect leave-one-out evaluation — judges will see zeros on two of five evaluation criteria.
2. README metrics are stale (Phase 4 numbers, not v1.1); demo shows misleading global ranks.

**Plans**: `7/1-PLAN.md` (eval fix + demo fix) → `7/2-PLAN.md` (README + compare script)

**Requirements**: SPEC Goals 4, 5

---

### Phase 9: Evaluation Dashboard UI
**Status**: ✅ Complete
**Objective**: Surface the existing `evaluation_results.json` benchmark data directly in the React UI so judges see empirical F1@5, F1@10, MRR, and latency metrics front-and-center instead of buried in backend JSON files. Add a `/benchmarks` API endpoint and a `BenchmarkDashboard` tab component with inline SVG charts and a glassmorphism aesthetic matching the existing UI.

**Key Tasks**:
- Add `backend/api/benchmark.py` router with `GET /benchmarks`
- Register the router in `backend/api/main.py`
- Build `ui/src/components/BenchmarkDashboard.jsx` with bar charts and latency gauges
- Add "📊 Benchmarks" tab to `ui/src/App.jsx`

**Plans**: `9/1-PLAN.md` (backend router) → `9/2-PLAN.md` (React dashboard component)

**Requirements**: SPEC Goals 4, 5

---

### Phase 10: Semantic Evaluation (Land Cover Labels)
**Status**: ⬜ Planned
**Objective**: Replace geographic-exact ground truth with semantic class ground truth using the SEN12MS IGBP Land Cover labels that already ship in `backend/SEN12MS-master/labels/`. Two patches are now "relevant" if they share the same dominant LC class (e.g., both Evergreen Broadleaf Forest), regardless of GPS location. This directly matches the problem statement wording: "based on semantic class". Expected to raise cross-modal F1 scores 5–10×.

**Key Tasks**:
- Write `backend/scripts/build_lc_index.py` to extract majority LC class per patch from `single_label_IGBPfull_ClsNum.pkl`
- Add `mean_semantic_f1_at_k()` to `backend/evaluation/metrics.py`
- Add `--lc-labels` flag to `backend/evaluation/evaluate.py` to run both geographic and semantic evaluation
- Extend `/benchmarks` to serve semantic scores; update BenchmarkDashboard to display both

**Plans**: `10/1-PLAN.md` (LC index + metrics) → `10/2-PLAN.md` (evaluate + dashboard update)

**Requirements**: SPEC Goals 4, 5

---

### Phase 11: Three-Modality Support (SAR + Optical RGB + Multispectral)
**Status**: ⬜ Planned
**Objective**: Demonstrate the architecture scales beyond 2 modalities by splitting Sentinel-2 into a distinct RGB Optical modality (B2, B3, B4 — 3-channel true colour) and the existing Multispectral modality (B4, B8, B11, B12 — 4-channel). The RGB encoder reuses the existing `opt_backbone` + `opt_projector` with a band-selection adapter so no retraining is required. Exposes `optical_rgb` as a valid `query_modality` in the API and UI dropdown.

**Key Tasks**:
- Add `optical_rgb_bands` config and normalization constants to `backend/datasets/sen12ms_dataset.py`
- Add `encode_optical_rgb()` method to `backend/models/dual_encoder.py`
- Support `optical_rgb` modality in `backend/api/main.py` query routing and band loading
- Add "Optical RGB (True Colour)" option to `ui/src/components/UploadPanel.jsx` modality dropdowns

**Plans**: `11/1-PLAN.md` (dataset + encoder) → `11/2-PLAN.md` (API + UI)

**Requirements**: SPEC Goals 3, 5

---

### Phase 12: Hard Negative Mining
**Status**: ⬜ Planned
**Objective**: Upgrade the training loop so the InfoNCE loss is computed against hard negatives — patches from different geographic locations that share the same LC class (e.g., Forest A vs Forest B). This forces the model to learn a discriminative embedding space within semantic classes, not just across obviously different biomes. Requires Phase 10 LC labels as a prerequisite. Requires a full model retrain after implementation.

**Key Tasks**:
- Build `backend/scripts/build_negative_pairs.py` using LC labels to pre-compute same-class pools
- Create `backend/datasets/sen12ms_hard_neg_dataset.py` with triplet sampling
- Add `InfoNCEWithHardNegs` loss variant to `backend/models/dual_encoder.py`
- Add `--hard-neg-mining` flag to `backend/train.py`

**Plans**: `12/1-PLAN.md` (dataset + loss) → `12/2-PLAN.md` (training loop)

**Requirements**: SPEC Goals 3, 4

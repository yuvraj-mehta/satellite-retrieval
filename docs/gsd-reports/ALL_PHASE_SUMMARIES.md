# ALL_PHASE_SUMMARIES.md — Complete Summary of All Milestone Phases

This document consolidates all planning, implementation, and verification details completed across the five project phases.

---

## 📂 Phase 1: Dataset Loader Fix & Validation

**Objective**: Fix the broken pairing logic in `SEN12MSDataset`, validate co-location matching, normalise SAR/Optical values, and verify the dataset health.

### Implementation Details
- Fixed the directory mismatch bug in `datasets/sen12ms_dataset.py`. The original code used a hardcoded path string replace search which caused files to load incorrectly.
- Implemented regex-based `_parse_patch_id` matching `(scene_id, patch_id)` to index and pair inputs co-registered across separate top-level directories:
  - `ROIs2017_winter_s1/s1_{scene_id}/ROIs2017_winter_s1_{scene_id}_p{patch_id}.tif`
  - `ROIs2017_winter_s2/s2_{scene_id}/ROIs2017_winter_s2_{scene_id}_p{patch_id}.tif`
- Normalised SAR (Sentinel-1) dB scale `[-25.0, 0.0] -> [0.0, 1.0]`.
- Normalised Optical (Sentinel-2) uint16 `/10000.0` scaling.
- Developed `scripts/verify_dataset.py` running 7 health assertions.
- Developed `scripts/visualize_samples.py` drawing side-by-side matches.

### Verification Evidence
- Matches: Exactly **1167 S1/S2 pairs** successfully co-located.
- Stats check:
  - SAR shape: `(2, 256, 256)` (VV + VH bands), values range `[0.075, 0.944]`.
  - Optical shape: `(3, 256, 256)` (RGB selection), values range `[0.038, 0.115]`.
- Uniqueness: All co-located `(scene_id, patch_id)` indices are unique.
- Visual outputs saved to `outputs/visualization.png` (using γ=0.5 gamma boost for optical brightness).

---

## 📂 Phase 2: MVP Retrieval Pipeline

**Objective**: Build a zero-shot similarity retrieval system using pretrained ResNet50 backbones and a FAISS vector index.

### Implementation Details
- Created `models/encoder.py`:
  - `ChannelAdapter` replicating 2-ch SAR inputs to 3-ch (R=G=VV, B=VH) and selecting optical RGB channels.
  - `ResNet50Encoder` extracting feature vectors and outputting L2-normalized 2048-d embeddings.
- Created `retrieval/faiss_utils.py`:
  - `FAISSRetriever` wrapping FAISS `IndexFlatIP` (flat dot product index equivalent to Cosine Similarity for normalized vectors).
  - Handles parallel metadata indexing, saving, and loading from disk.
- Created `scripts/build_index.py` extracting embeddings on `mps` and writing vector databases to `outputs/index/`.
- Created `scripts/retrieve.py` for command-line search.

### Verification Evidence
- Verification script printed `PASS: Embeddings correct shape and L2 normalized`.
- Baseline index files created: `combined.index` (19.1MB), `combined.meta` (242KB), `opt_embeddings.npy` (9.6MB), `sar_embeddings.npy` (9.6MB).
- Query verification using `scripts/retrieve.py` successfully retrieved the matching co-located target at Rank 1 with similarity score 1.0000.

---

## 📂 Phase 3: Evaluation Metrics Framework

**Objective**: Implement co-location retrieval metrics and calculate the zero-shot baseline performance.

### Implementation Details
- Created `evaluation/metrics.py` implementing Precision@K, Recall@K, and F1@K metrics (ground truth is co-located same-patch across modalities).
- Created `evaluation/evaluate.py` to evaluate same-modal and cross-modal retrieval across K=[5, 10].

### Baseline Evaluation Results
- **Same-modal (SAR->SAR, OPT->OPT)**: Achieved perfect co-located recall ($F1@5 = 0.3333$, $F1@10 = 0.1818$) because the query matches itself at Rank 1.
- **Cross-modal (SAR->OPT, OPT->SAR)**: Near-zero retrieval scores ($F1@5 \approx 0.0015$) due to unaligned zero-shot ImageNet representations.

---

## 📂 Phase 4: Contrastive Dual-Encoder Training

**Objective**: Build a DualEncoder contrastive alignment model and train it using InfoNCE loss.

### Implementation Details
- Created `models/dual_encoder.py` comprising:
  - ResNet50 SAR and Optical branches linked to a shared MLP projection head (2048 -> 1024 -> 512).
  - Bidirectional InfoNCE/NT-Xent contrastive loss (`InfoNCELoss`).
- Created `train.py` training loop with AdamW optimizer, Cosine Annealing learning rate scheduling, validation splits, and gradient accumulation.
- Modified `scripts/build_index.py` to load trained model weights and extract 512-d representations.
- Created `scripts/compare_results.py` to evaluate deltas.

### Verification Evidence
- Model compiled and ran successfully on `mps` (MPS device training verified).
- Trained the model for **20 epochs** (effective batch size 32). Validation loss dropped from **`0.6152`** (epoch 1) down to **`0.0968`** (epoch 15).

---

## 📂 Phase 5: Polish & Visual Demo

**Objective**: Create the final end-to-end query visualization demo and documentation.

### Implementation Details
- Created `scripts/demo.py` loading trained model checkpoint (or baseline fallback) and drawing query matches.
- Wrote `README.md` documentation.

### Verification Evidence
- Runs successfully on trained model index:
  ```bash
  python scripts/demo.py --query data/sen12ms-subset/ROIs2017_winter_s1/s1_21/ROIs2017_winter_s1_21_p100.tif --query-modality sar --target-modality optical --checkpoint outputs/checkpoints/best_model.pt --index-dir outputs/index_trained --k 5 --save
  ```
- Retrieval latency: **~8ms** (well within the < 100ms constraint).
- Saves visual query matches grid to `outputs/demo_result.png`.

---

## 📊 Final Retrieval Performance Metrics

| Mode | Baseline F1@5 | Trained F1@5 | Delta | Baseline F1@10 | Trained F1@10 | Delta | Latency |
|---|---|---|---|---|---|---|---|
| **SAR -> SAR** | 0.3333 | 0.3333 | `+0.0000` | 0.1818 | 0.1818 | `+0.0000` | 0.07ms |
| **OPT -> OPT** | 0.3333 | 0.3333 | `+0.0000` | 0.1818 | 0.1818 | `+0.0000` | 0.02ms |
| **SAR -> OPT** | 0.0014 | **0.2576** | **`+0.2562`** | 0.0016 | **0.1613** | **`+0.1597`** | 0.02ms |
| **OPT -> SAR** | 0.0017 | **0.2596** | **`+0.2579`** | 0.0016 | **0.1619** | **`+0.1603`** | 0.02ms |

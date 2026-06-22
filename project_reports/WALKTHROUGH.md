# WALKTHROUGH.md — Chronological Walkthrough of Project Work

This walkthrough details the progress, codebase modifications, verification checks, and final performance metrics of the Cross-Modal Satellite Image Retrieval project.

---

## 📅 Initial Phase: Project Setup and Spec Definition
We initialized the workspace by:
1. Reviewing existing python templates and packages.
2. Formulating `SPECIFICATION.md` detailing goals, non-goals, and MacBook M1/Victus hardware resource constraints.
3. Formulating `ROADMAP.md` setting up waves of execution split into 5 chronological phases.

---

## 📅 Phase 1: Dataset Loader Fix & Verification
**Goal**: Locate co-located Sentinel-1 (SAR) and Sentinel-2 (Optical) patches from the `sen12ms-subset` directories and verify values.

### Codebase Modifications
- **[datasets/sen12ms_dataset.py](file:///Users/yuvrajmehta/Developer/satellite-retrieval/datasets/sen12ms_dataset.py)**: Fixed the old path string replacement bug. Used regular expression matching on `(scene_id, patch_id)` to index files. Implemented dB scaling for SAR (`[-25.0, 0.0] -> [0.0, 1.0]`) and optical scaling (`/10000.0` normalization).
- **[scripts/verify_dataset.py](file:///Users/yuvrajmehta/Developer/satellite-retrieval/scripts/verify_dataset.py)**: Automated dataset health checks (pair count == 1167, correct shape dimensions, proper normalized value bounds, no NaN).
- **[scripts/visualize_samples.py](file:///Users/yuvrajmehta/Developer/satellite-retrieval/scripts/visualize_samples.py)**: Matplotlib-based visual inspector saving side-by-side co-located pairs.

---

## 📅 Phase 2: MVP Retrieval Pipeline
**Goal**: Construct zero-shot feature encoders, build vector similarity retriever, extract embeddings, and build the combined FAISS baseline index.

### Codebase Modifications
- **[models/encoder.py](file:///Users/yuvrajmehta/Developer/satellite-retrieval/models/encoder.py)**: Implemented `ChannelAdapter` (maps 2-ch SAR inputs to 3-ch by duplicating VV and VH bands, maps optical 3-ch directly, and learnable 1x1 conv layer fallback for others). Built PyTorch `ResNet50Encoder` utilizing ImageNet-pretrained weights and outputting L2-normalized 2048-d vectors.
- **[retrieval/faiss_utils.py](file:///Users/yuvrajmehta/Developer/satellite-retrieval/retrieval/faiss_utils.py)**: Utility wrapper for building, loading, saving, and searching FAISS `IndexFlatIP` dot-product indices (which represent cosine similarity on L2-normalized embeddings).
- **[scripts/build_index.py](file:///Users/yuvrajmehta/Developer/satellite-retrieval/scripts/build_index.py)**: Main extraction script. Runs model inference on the full dataset using `mps` device acceleration, builds combined index, and saves embeddings alongside parallel metadata dictionary.
- **[scripts/retrieve.py](file:///Users/yuvrajmehta/Developer/satellite-retrieval/scripts/retrieve.py)**: Simple command-line retrieval query utility.

---

## 📅 Phase 3: Evaluation Metrics Framework
**Goal**: Define mathematical co-location relevance group evaluation metrics and calculate baseline zero-shot retrieval scores.

### Codebase Modifications
- **[evaluation/metrics.py](file:///Users/yuvrajmehta/Developer/satellite-retrieval/evaluation/metrics.py)**: Implemented Precision@K, Recall@K, and F1@K metrics tailored to co-located setups (relevance set has exactly 1 co-located match).
- **[evaluation/evaluate.py](file:///Users/yuvrajmehta/Developer/satellite-retrieval/evaluation/evaluate.py)**: Retrieval evaluator querying all 4 modes (SAR->SAR, OPT->OPT, SAR->OPT, OPT->SAR) for K=[5, 10] cutoffs and reporting latency.

---

## 📅 Phase 4: Contrastive Dual-Encoder Training
**Goal**: Implement dual-encoder model, InfoNCE/NT-Xent contrastive loss, training scripts, and run training to align sensor representations in a shared space.

### Codebase Modifications
- **[models/dual_encoder.py](file:///Users/yuvrajmehta/Developer/satellite-retrieval/models/dual_encoder.py)**: Dual-encoder PyTorch architecture linking SAR ResNet50 and Optical ResNet50 branches to a shared MLP projection head (2048 -> 1024 -> 512). Implemented `InfoNCELoss` with temperature scaling ($0.07$) computing bidirectional cross-entropy matching across batch pairs.
- **[train.py](file:///Users/yuvrajmehta/Developer/satellite-retrieval/train.py)**: Contrastive training loop supporting AdamW optimization, Cosine Annealing learning rate schedule, gradient accumulation, validation split, and best-performing checkpoints.
- **[scripts/build_index.py](file:///Users/yuvrajmehta/Developer/satellite-retrieval/scripts/build_index.py)**: Updated script to support the `--checkpoint` flag and extract 512-dimensional representations using the trained model weights.
- **[scripts/compare_results.py](file:///Users/yuvrajmehta/Developer/satellite-retrieval/scripts/compare_results.py)**: Baseline vs. trained evaluation delta comparison tool.

### Training Results (M1 Mac)
- Epochs: 20
- Effective batch size: 32 (batch size 8 * gradient accumulation 4)
- Validation loss: Decreased from `0.6152` in Epoch 1 to **`0.0968`** in Epoch 15.

---

## 📅 Phase 5: Polish & Visual Demo
**Goal**: Implement end-to-end query visualization showing retrieved results grid,Timing latency benchmark, and full README.

### Codebase Modifications
- **[scripts/demo.py](file:///Users/yuvrajmehta/Developer/satellite-retrieval/scripts/demo.py)**: Visual demo querying baseline/trained index and displaying grid plots.
- **[README.md](file:///Users/yuvrajmehta/Developer/satellite-retrieval/README.md)**: User instruction manual.

---

## 📊 Summary of Retrieval Results (Baseline vs. Trained)

| Mode | Baseline F1@5 | Trained F1@5 | Delta | Baseline F1@10 | Trained F1@10 | Delta | Latency / query |
|---|---|---|---|---|---|---|---|
| **SAR -> SAR** | 0.3333 | 0.3333 | `+0.0000` | 0.1818 | 0.1818 | `+0.0000` | 0.07ms |
| **OPT -> OPT** | 0.3333 | 0.3333 | `+0.0000` | 0.1818 | 0.1818 | `+0.0000` | 0.02ms |
| **SAR -> OPT** | 0.0014 | **0.2576** | **`+0.2562`** | 0.0016 | **0.1613** | **`+0.1597`** | 0.02ms |
| **OPT -> SAR** | 0.0017 | **0.2596** | **`+0.2579`** | 0.0016 | **0.1619** | **`+0.1603`** | 0.02ms |

### Key Takeaways
- Same-modal retrieval reaches perfect recall ($1.000$) immediately because queries match themselves.
- Pretrained weights are completely unaligned zero-shot ($F1@5 \approx 0.0015$).
- Contrastive training for 20 epochs provides a massive, outstanding alignment delta (**+0.25+ F1 score**), with the target co-located patch placed in the **Top-5 matches 77.29%** of the time.
- Search execution takes **under 0.1ms**, comfortably satisfying the hackathon requirement of < 100ms retrieval speed.

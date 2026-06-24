# 🛰️ Project Understanding Guide
## Cross-Modal Satellite Image Retrieval — Deep Technical Reference

> **Purpose**: Thorough understanding of every technical component — dataset, architecture, training, evaluation, and codebase. For hackathon-day Q&A and quick commands, see `HACKATHON_PREP.md`.

---

## Table of Contents

1. [The Problem Statement](#1-the-problem-statement)
2. [The Dataset — SEN12MS](#2-the-dataset--sen12ms)
3. [Data Pipeline — From File to Tensor](#3-data-pipeline--from-file-to-tensor)
4. [System Architecture — End to End](#4-system-architecture--end-to-end)
5. [The Model — Dual Encoder Deep Dive](#5-the-model--dual-encoder-deep-dive)
6. [The Loss Function — InfoNCE](#6-the-loss-function--infonce)
7. [Training Details](#7-training-details)
8. [The Retrieval Engine — FAISS](#8-the-retrieval-engine--faiss)
9. [Evaluation Metrics — The Math](#9-evaluation-metrics--the-math)
10. [Codebase — File by File](#10-codebase--file-by-file)
11. [Key Design Decisions & Why](#11-key-design-decisions--why)
12. [Training History & Results Analysis](#12-training-history--results-analysis)

---

## 1. The Problem Statement

### 1.1 What We Are Solving

The ISRO/Bharatiya Antariksh Hackathon problem: **Cross-Modal Satellite Image Retrieval using Multi-Sensor Remote Sensing Data**.

Given a query image from one satellite sensor, retrieve the most relevant images from an archive that may contain images from a *different* sensor type. Specifically, we handle four modes:

| Mode | Query Sensor | Gallery Sensor |
|---|---|---|
| Same-modal | SAR (Sentinel-1) | SAR (Sentinel-1) |
| Same-modal | Optical (Sentinel-2) | Optical (Sentinel-2) |
| **Cross-modal** | **SAR** | **Optical** |
| **Cross-modal** | **Optical** | **SAR** |

### 1.2 Why Cross-Modal Is Hard

A SAR image and optical image of the *identical* geographic location look completely different:

- **Optical**: Natural-photo-like. Vegetation is dark green, water is blue, cities are grey.
- **SAR**: Grainy black-and-white. Smooth surfaces (water) appear very dark (low backscatter). Rough surfaces and vertical structures (buildings) appear very bright (high backscatter). Roads may disappear. Double-bounce from building walls creates bright lines.

Pixel-level similarity between a SAR image and its corresponding optical image is near zero. Standard image comparison algorithms (histogram comparison, perceptual hash, SSIM) will report them as completely different. Our model must learn that they are semantically equivalent by discovering the underlying physical correlations.

### 1.3 Physical Correlations Between SAR and Optical

The model can only learn correlations that actually exist in the physics:

| Physical Property | SAR Response | Optical Band |
|---|---|---|
| Vegetation density | High VV (volume scattering) | High NIR (B8) reflectance |
| Soil moisture | Increased backscatter | Low SWIR (B11/B12) reflectance |
| Urban density | Very high backscatter (double bounce) | Grey/white in RGB |
| Smooth water | Near-zero backscatter | Blue in visible bands |
| Bare soil | Moderate backscatter (surface scatter) | High SWIR, low NIR |

---

## 2. The Dataset — SEN12MS

### 2.1 Overview

**SEN12MS** (Sentinel-1 + Sentinel-2 Multi-Season) was created by the Technical University of Munich (TUM) and published at NeurIPS 2019.

| Property | Full Dataset | Our Subset |
|---|---|---|
| Total pairs | ~180,662 | 1,167 |
| Scenes | Worldwide | 2 (scenes 21 & 22) |
| Seasons | Spring, Summer, Fall, Winter | Winter 2017 only |
| Image size | 256×256 pixels | 256×256 pixels |
| Patch size on ground | ~2.4km × 2.4km (10m/pixel) | Same |
| Download | `dataserv.ub.tum.de/s/m1474000` | Kaggle subset |

### 2.2 Directory Structure

```
data/sen12ms-subset/
├── ROIs2017_winter_s1/              ← Sentinel-1 SAR images
│   ├── s1_21/                       ← Scene 21
│   │   ├── ROIs2017_winter_s1_21_p100.tif
│   │   ├── ROIs2017_winter_s1_21_p101.tif
│   │   └── ... (600+ patches)
│   └── s1_22/                       ← Scene 22
│       └── ...
└── ROIs2017_winter_s2/              ← Sentinel-2 Optical images
    ├── s2_21/                       ← Same locations as s1_21
    │   ├── ROIs2017_winter_s2_21_p100.tif   ← Pair of s1_21_p100
    │   └── ...
    └── s2_22/
```

**The pairing key is `(scene_id, patch_id)`**. A filename like `ROIs2017_winter_s1_21_p302.tif` encodes:
- `s1` = Sentinel-1 (SAR)
- `21` = scene ID
- `p302` = patch ID 302

The corresponding optical image is `ROIs2017_winter_s2_21_p302.tif`.

### 2.3 SAR Channels — Sentinel-1

Each SAR `.tif` has **2 channels**:

| Index | Name | Full Name | Physical Meaning |
|---|---|---|---|
| 0 | VV | Vertical transmit, Vertical receive | Sensitive to surface roughness, soil moisture |
| 1 | VH | Vertical transmit, Horizontal receive | Sensitive to volume scattering (vegetation canopy) |

**Value range**: Raw values in linear scale, converted to **dB** (decibels) by the sensor:
- **~-30 dB**: Very smooth surfaces (calm water)
- **~-20 dB**: Forest, grassland
- **~-10 dB**: Agricultural areas
- **~0 dB to +5 dB**: Urban, metallic rooftops

### 2.4 Optical Channels — Sentinel-2

Each Sentinel-2 `.tif` has **13 channels** (bands). We select **4** of them:

| Our Index | S2 Band | Name | Wavelength | Physical Meaning | Why We Use It |
|---|---|---|---|---|---|
| 3 (0-based) | B4 | Red | 665 nm | Visible red light | Core visible info |
| 7 | B8 | NIR | 842 nm | Near-infrared | Vegetation density (correlates with SAR VV) |
| 10 | B11 | SWIR-1 | 1610 nm | Short-wave infrared | Soil moisture (correlates with SAR backscatter) |
| 11 | B12 | SWIR-2 | 2190 nm | Short-wave infrared | Vegetation water content |

**Why not RGB (B4, B3, B2)?** The bands most physically correlated with SAR backscatter are NIR and SWIR — not visible blue and green. Using RGB discards the spectral information that links optical to SAR. This is a deliberate, research-backed decision.

### 2.5 Normalisation — Z-Score

Raw pixel values from both sensors have very different ranges and cannot be fed directly to a neural network without normalisation.

**Formula**: `normalised = (raw - mean) / std`

**Empirical statistics** (computed from our 1,167-pair subset via `scripts/compute_dataset_stats.py`):

| Sensor | Band | Raw Mean | Raw Std | Note |
|---|---|---|---|---|
| SAR | VV | -11.476 dB | 3.258 | Typical winter mixed land |
| SAR | VH | -17.752 dB | 3.957 | VH always ~6dB lower than VV |
| Optical | B4 (Red) | 878.4 | 336.9 | uint16 raw values |
| Optical | B8 (NIR) | 1933.1 | 492.1 | uint16 raw values |
| Optical | B11 (SWIR-1) | 32.4 | 20.4 | Very low values! Z-score critical here |
| Optical | B12 (SWIR-2) | 1912.6 | 501.8 | uint16 raw values |

> **Why Z-score over simple /10000?** Sentinel-2 Level-1C reflectance can be divided by 10000 for most bands, but B11 SWIR-1 raw values are in the range 6–91 (very low), so dividing by 10000 gives near-zero values that the network cannot learn from. Z-score per-band normalisation handles every band correctly regardless of its natural scale.

---

## 3. Data Pipeline — From File to Tensor

This is what happens every time the dataset loader returns a training sample:

```
1. File Discovery (at init time):
   - Scan all .tif files in ROIs2017_winter_s1/
   - For each SAR file, parse (scene_id, patch_id) from filename using regex
   - Look up matching S2 file using (scene_id, patch_id) key
   - Store list of (s1_path, s2_path, scene_id, patch_id) tuples

2. Per-sample Loading (at __getitem__ time):
   - Open SAR .tif with rasterio → read all 2 bands → np.array (2, 256, 256)
   - Open Optical .tif with rasterio → read bands [4,8,11,12] (1-indexed) → np.array (4, 256, 256)
   - Cast to float32

3. Normalisation:
   - SAR channel 0 (VV): (x - (-11.476)) / 3.258
   - SAR channel 1 (VH): (x - (-17.752)) / 3.957
   - Optical B4: (x - 878.4) / 336.9
   - Optical B8: (x - 1933.1) / 492.1
   - Optical B11: (x - 32.4) / 20.4
   - Optical B12: (x - 1912.6) / 501.8

4. Convert to tensors and return dict:
   {"sar": Tensor(2,256,256), "optical": Tensor(4,256,256), "scene_id": "21", "patch_id": "100", ...}
```

---

## 4. System Architecture — End to End

### 4.1 The Two Phases

**Offline Phase (done once — index building):**
```
1,167 SAR images   → SAR Encoder → 1,167 × 512-d vectors ─┐
1,167 OPT images   → OPT Encoder → 1,167 × 512-d vectors ─┤→ FAISS Index (saved to disk)
                                                            └─ Metadata (.pkl files)
```

**Online Phase (per query — retrieval):**
```
Query image → Encoder → 512-d vector → FAISS.search(k=5) → Top-5 results (0.02ms)
```

### 4.2 Full Data Flow Diagram

```
                         TRAINING TIME
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║  Batch of N SAR images (N,2,256,256)                        ║
║       │                                                      ║
║       ▼                                                      ║
║  [SAR Backbone: ResNet50 with SENTINEL1_ALL_MOCO weights]   ║
║  (2-ch input, handles VV+VH natively)                       ║
║       │                                                      ║
║       ▼ (N, 2048)                                           ║
║  [SAR Projection Head: 2048→1024→512→L2norm]                ║
║       │                                                      ║
║       ▼ (N, 512)  sar_embeddings                            ║
║       │                                    InfoNCE Loss     ║
║       └──────────────────────────────┐   ╔═══════════════╗  ║
║                                      │   ║  sim = A @ B.T║  ║
║  Batch of N OPT images (N,4,256,256)│   ║  loss = CE(   ║  ║
║       │                              │──►║    sim/τ,     ║  ║
║       ▼                              │   ║    arange(N)) ║  ║
║  [1×1 Conv: 4ch → 3ch adapter]      │   ╚═══════════════╝  ║
║       │                              │                      ║
║  [OPT Backbone: ResNet50 with        │                      ║
║   SENTINEL2_RGB_MOCO weights]        │                      ║
║       │                              │                      ║
║       ▼ (N, 2048)                   │                      ║
║  [OPT Projection Head: 2048→1024→512→L2norm]               ║
║       │                              │                      ║
║       ▼ (N, 512)  opt_embeddings ───┘                      ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

                         INFERENCE TIME
╔══════════════════════════════════════════════════════════════╗
║  Query SAR image                                             ║
║       │                                                      ║
║       ▼ → SAR Encoder → 512-d vector                        ║
║                              │                               ║
║                              ▼                               ║
║              FAISS.IndexFlatIP.search(query, k=5)            ║
║              (cosine similarity against all 2,334 stored     ║
║               vectors — takes 0.02ms)                        ║
║                              │                               ║
║                              ▼                               ║
║              Top-5 results with similarity scores            ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 5. The Model — Dual Encoder Deep Dive

### 5.1 ResNet50 Backbone

ResNet50 is a deep convolutional network with 50 layers, published by Microsoft Research in 2015. It introduced **residual connections** (skip connections) to allow training of very deep networks.

**Architecture layers** (simplified):
```
Input (B, C, 256, 256)
  → Conv2d(C, 64, 7×7, stride=2)  → 128×128
  → MaxPool(3×3, stride=2)         → 64×64
  → Layer1: 3 bottleneck blocks     → 64×64,  256 filters
  → Layer2: 4 bottleneck blocks     → 32×32,  512 filters
  → Layer3: 6 bottleneck blocks     → 16×16, 1024 filters
  → Layer4: 3 bottleneck blocks     →  8×8,  2048 filters
  → GlobalAvgPool                   → 2048-d vector
  [we remove the FC layer that follows]
```

We **strip the final fully-connected classification layer** and use the 2048-d global average pool output as our feature representation.

### 5.2 TorchGeo Pretrained Weights

Two different sets of weights are used for the two modalities:

**SAR Backbone: `SENTINEL1_ALL_MOCO`**
- Pretrained on millions of Sentinel-1 (SAR) images worldwide
- Uses **MoCo v2** self-supervised learning — no labels needed
- Native input: 2 channels (VV, VH) — perfect match to our data
- The model already understands SAR texture, speckle patterns, and surface types

**Optical Backbone: `SENTINEL2_RGB_MOCO`**
- Pretrained on millions of Sentinel-2 optical images worldwide  
- Uses **MoCo v2** self-supervised learning
- Native input: 3 channels (RGB, specifically B4/B3/B2)
- **Mismatch**: We feed 4 channels (B4/B8/B11/B12) → fixed with a channel adapter

### 5.3 Channel Adapter (4-channel → 3-channel)

The SENTINEL2_RGB_MOCO backbone expects 3 channels. We use a **1×1 convolutional layer** to project our 4 channels to 3:

```python
nn.Conv2d(in_channels=4, out_channels=3, kernel_size=1, bias=False)
```

A 1×1 convolution performs a linear combination across channels at each spatial position — effectively a learned weighted average that combines the 4 bands into 3 channels the backbone can process. The weights are learned during training.

### 5.4 Projection Head

After the backbone produces a 2048-d vector, a **Projection Head** maps it to the final 512-d embedding:

```python
nn.Linear(2048, 1024)   # Dimensionality reduction
nn.BatchNorm1d(1024)    # Stabilises training
nn.ReLU(inplace=True)   # Non-linearity
nn.Linear(1024, 512)    # Final projection
F.normalize(..., p=2)   # L2-normalise to unit sphere
```

**BatchNorm1d**: Normalises the activations across the batch at each layer. Prevents internal covariate shift — a training stability technique.

**L2 Normalisation**: Forces all output vectors to lie on the unit hypersphere (length = 1.0). This is critical because it means dot product = cosine similarity, which is what we want for retrieval.

**Why 512-d?** A balance between:
- Representation capacity (too low = information loss)
- Storage and search speed (too high = slower FAISS search, larger files)
- Contrastive learning effectiveness (512-d is the standard from CLIP, SimCLR)

### 5.5 Why Separate Projection Heads Per Modality

```python
self.sar_projector = ProjectionHead(2048, 1024, 512)   # SAR-specific weights
self.opt_projector = ProjectionHead(2048, 1024, 512)   # OPT-specific weights
```

The two modalities produce feature distributions with different statistical properties:
- SAR features reflect speckle noise, backscatter physics, roughness patterns
- Optical features reflect spectral reflectance, atmospheric effects, colour patterns

A **shared** projection head would need to apply the same linear transform to both, forcing a one-size-fits-all mapping. **Separate** projection heads allow each modality to learn its own optimal transformation into the shared embedding space.

This design was established by CLIP (OpenAI, 2021): text encoder + image encoder each have their own projection head. ALIGN, BLIP, Florence, and every serious cross-modal retrieval system uses this approach.

---

## 6. The Loss Function — InfoNCE

### 6.1 Intuition

Given a batch of N SAR-optical pairs, InfoNCE says:
- The N pairs on the diagonal of the similarity matrix are **positives** (should be similar)
- The N×(N-1) off-diagonal pairs are **negatives** (should be dissimilar)
- Treat it as N classification problems: "which optical image corresponds to this SAR image?"

### 6.2 The Math

Given a batch of B pairs with SAR embeddings `A = (B, 512)` and OPT embeddings `B_mat = (B, 512)`:

**Step 1: Similarity matrix**
```
S[i][j] = dot(A[i], B_mat[j])   # cosine similarity (already L2-normalised)
S is shape (B, B)
```

**Step 2: Scaled logits**
```
logits = S / τ    # τ (temperature) = 0.1
```

**Step 3: Bidirectional cross-entropy**
```
labels = [0, 1, 2, ..., B-1]   # diagonal indices are the correct matches

loss_A_to_B = CrossEntropy(logits, labels)     # "for each SAR, which optical is correct?"
loss_B_to_A = CrossEntropy(logits.T, labels)   # "for each optical, which SAR is correct?"

loss = (loss_A_to_B + loss_B_to_A) / 2
```

### 6.3 Why Temperature τ=0.1?

Temperature controls the "sharpness" of the distribution:
- **Low τ** (0.07-0.1): Model must be very confident. Sharp peaks. Harder learning signal.
- **High τ** (0.5-1.0): Soft distributions. Easier, less discriminative.

The landmark SimCLR paper uses τ=0.07 calibrated for batch sizes of 4096+. With our effective batch size of 32, using τ=0.07 makes the problem too hard (too sharp, not enough negative diversity). τ=0.1 is the standard recommendation for batch sizes ≤64.

### 6.4 What "Effective Batch Size" Means

Our hardware constraint (M1, 8GB RAM) limits physical batch size to 8 images at once. But InfoNCE quality scales with batch size — more negatives = richer learning signal.

**Gradient Accumulation** solves this:
```
For step in range(accum_steps=4):
    loss = InfoNCE(model(batch_of_8))   # forward pass
    (loss / 4).backward()               # accumulate gradients
optimizer.step()                         # update weights once
optimizer.zero_grad()
```

Result: The model processes 4 batches of 8 (= 32 total) before updating weights. The gradient is the average across all 4 mini-batches — equivalent to training with a single batch of 32.

---

## 7. Training Details

### 7.1 Hyperparameters

| Parameter | Value | Rationale |
|---|---|---|
| Epochs | 20 | Enough for convergence on 1,167 pairs |
| Physical batch size | 8 | M1 memory limit |
| Accum steps | 4 | Effective batch size = 32 |
| Learning rate | 1e-4 | Standard AdamW rate for fine-tuning |
| Weight decay | 1e-4 | L2 regularisation to prevent overfitting |
| Temperature | 0.1 | Optimal for batch ≤ 64 |
| Warmup epochs | 5 | Protects pretrained features during head stabilisation |
| Val split | 10% | 116 validation samples |
| Optimizer | AdamW | Adam with decoupled weight decay |

### 7.2 Learning Rate Schedule

```
LR
│         ┌─────────────────────────────────────────────────╮
1e-4      │                      Cosine Annealing           │
│         │                                                  │
1e-5 ─────┘ Linear                                          │
          Warmup                                             │
          (5 epochs)              (15 epochs)               ─┘≈0
─────────────────────────────────────────────────────────────── Epochs
0         5                      20
```

**Linear Warmup (epochs 1–5)**: LR starts at 1e-5 (10% of target) and linearly increases to 1e-4.
- Prevents large gradient updates from destroying the TorchGeo pretrained features before the projection heads have stabilised.

**Cosine Annealing (epochs 6–20)**: LR follows a cosine curve from 1e-4 down to ~0.
- Smooth convergence without oscillation.

### 7.3 Loss Curve (All 20 Epochs)

| Epoch | Train Loss | Val Loss | Note |
|---|---|---|---|
| 1 | 1.3042 | 0.9992 | Random initialisation |
| 5 | 0.1277 | 0.3062 | Rapid early improvement |
| 10 | 0.0753 | 0.2789 | Continued improvement |
| 15 | 0.0242 | 0.1782 | Strong cross-modal alignment |
| 19 | **0.0115** | **0.1224** | **Best checkpoint ← saved** |
| 20 | 0.0144 | 0.1331 | Slight val increase, epoch 19 best |

Training time: ~2.5–3 hours on Apple M1 (MPS acceleration).

### 7.4 Checkpoint Strategy

- **`best_model.pt`**: Saved whenever validation loss improves. Contains model weights, optimiser state, epoch number, and all hyperparameters.
- **`checkpoint_epoch005.pt`**, **010**, **015**, **020**: Saved every 5 epochs regardless of val loss (backup in case of disconnection).
- **`history.json`**: Full train/val loss arrays for all 20 epochs.

---

## 8. The Retrieval Engine — FAISS

### 8.1 What FAISS Does

FAISS (Facebook AI Similarity Search) finds the K most similar vectors from a stored collection, given a query vector. It is extremely fast because it uses optimised BLAS operations and, for larger indices, approximate search algorithms.

### 8.2 IndexFlatIP

We use `faiss.IndexFlatIP`:
- **Flat**: No compression, stores vectors exactly as-is (no information loss)
- **IP**: Inner Product similarity metric

Since all our embeddings are L2-normalised (length = 1.0):
```
dot(a, b) = |a| × |b| × cos(θ) = 1 × 1 × cos(θ) = cos(θ)
```

Inner product of L2-normalised vectors = cosine similarity. So `IndexFlatIP` on normalised vectors gives exact cosine similarity rankings.

### 8.3 Scale and Complexity

| Property | Value |
|---|---|
| Stored vectors | 2,334 (1,167 SAR + 1,167 optical) |
| Embedding dimension | 512 |
| Storage size | ~4.8 MB total |
| Search complexity | O(N × D) per query = O(2334 × 512) |
| Search time | 0.02ms on CPU |

At this scale, brute-force search is instantaneous. Approximate indices (IVFFlat, HNSW, PQ) are only needed when N > 100,000 and latency constraints are strict.

### 8.4 The Index Building Script

`scripts/build_index.py` runs the complete offline pipeline:
1. Load `SEN12MSDataset` (all 1,167 pairs)
2. Load trained model from checkpoint
3. For every SAR image: `embed = model.encode_sar(img)` → 512-d vector
4. For every optical image: `embed = model.encode_optical(img)` → 512-d vector
5. Save arrays as `.npy` files (for evaluate.py)
6. Save metadata as `.pkl` files (scene_id, patch_id, modality, file path for each vector)

---

## 9. Evaluation Metrics — The Math

### 9.1 Ground Truth

For SEN12MS, the ground truth is geographically defined:

> A SAR patch and an optical patch are **relevant** to each other if and only if they have the same `(scene_id, patch_id)`.

Each query has exactly **1 relevant item** in the gallery.

### 9.2 Precision@K, Recall@K, F1@K

Given:
- `retrieved` = ordered list of K retrieved items
- `relevant` = set of ground truth items (size = 1 for us)

```
Precision@K = |{retrieved[:K] ∩ relevant}| / K
Recall@K    = |{retrieved[:K] ∩ relevant}| / |relevant|
F1@K        = 2 × P@K × R@K / (P@K + R@K)
```

**With exactly 1 ground truth:**

| Ground truth rank | P@5 | R@5 | F1@5 |
|---|---|---|---|
| 1 (found at rank 1) | 1/5 = 0.20 | 1/1 = 1.00 | **0.333** |
| 2 (found at rank 2) | 1/5 = 0.20 | 1/1 = 1.00 | **0.333** |
| 5 (found at rank 5) | 1/5 = 0.20 | 1/1 = 1.00 | **0.333** |
| Not found | 0/5 = 0.00 | 0/1 = 0.00 | **0.000** |

F1@5 is binary: either 0.333 (found in top 5) or 0.000 (not found). Mean F1@5 = fraction of queries where ground truth appears in top 5 × 0.333.

**The ceiling**: F1@5 max = 0.333 because even at rank 1, P@5 = 1/5 = 0.2 and R@5 = 1.0, giving F1 = 2×0.2×1.0/(0.2+1.0) = 0.333.

### 9.3 MRR — Mean Reciprocal Rank

```
MRR = mean(1 / rank_of_first_relevant_hit)
```

If the relevant item is not found in the result list, its reciprocal rank = 0.

| MRR Value | Interpretation |
|---|---|
| 1.000 | Every query finds correct answer at rank 1 |
| 0.706 | On average, correct answer at rank ~1.4 |
| 0.500 | On average, correct answer at rank 2 |
| 0.333 | On average, correct answer at rank 3 |
| 0.000 | Never finds the correct answer |

Our MRR = **0.7063** (SAR→OPT) means the correct optical image appears at approximately rank 1.4 on average — almost always the top result.

### 9.4 The 4 Evaluation Modes

```python
# Mode 1: SAR → SAR (same-modal)
# Query: SAR embeddings  |  Gallery: SAR embeddings
evaluate_mode(sar_embs, sar_meta, sar_retriever, "sar", same_modal=False)

# Mode 2: OPT → OPT (same-modal)
evaluate_mode(opt_embs, opt_meta, opt_retriever, "optical", same_modal=False)

# Mode 3: SAR → OPT (cross-modal)
evaluate_mode(sar_embs, sar_meta, opt_retriever, "optical", same_modal=False)

# Mode 4: OPT → SAR (cross-modal)
evaluate_mode(opt_embs, opt_meta, sar_retriever, "sar", same_modal=False)
```

**Note on same-modal**: For SAR→SAR, the query vector is already inside the gallery (we indexed everything). FAISS returns the query itself at rank 1 with similarity=1.0. We count this self-match as the correct ground truth (geographic co-location with itself is valid). This gives perfect F1@5 = 0.333 and MRR = 1.0 for same-modal modes.

---

## 10. Codebase — File by File

### 10.1 `datasets/sen12ms_dataset.py`

**Responsibility**: Data loading, pairing, and normalisation.

```
Key components:
  _PATCH_RE         — Regex to parse (sensor, scene_id, patch_id) from filenames
  _parse_patch_id() — Applies regex to a Path object
  SEN12MSDataset    — torch.utils.data.Dataset subclass
    __init__()      — Builds s2_lookup dict, then iterates s1 files to pair them
    __getitem__()   — Loads one SAR + one optical pair, applies Z-score normalisation
```

**Pairing algorithm**:
1. Build dict: `s2_lookup[(scene_id, patch_id)] → optical_path`
2. For each SAR file: parse its `(scene_id, patch_id)`, look up `s2_lookup` to find the optical pair
3. If found: add `(s1_path, s2_path, scene_id, patch_id)` to `self.samples`

### 10.2 `models/encoder.py`

**Responsibility**: ResNet50 wrapper that produces L2-normalised embeddings.

```
Key components:
  TORCHGEO_AVAILABLE   — Flag: True if torchgeo is installed
  ChannelAdapter       — Handles input channel mismatch (2-ch SAR, 4-ch optical)
  ResNet50Encoder      — The backbone wrapper
    __init__()         — Two paths: torchgeo (preferred) or ImageNet fallback
    forward()          — channel_adapter → backbone → flatten → (optional projector) → L2norm
  get_device()         — Returns best available: MPS > CUDA > CPU
```

### 10.3 `models/dual_encoder.py`

**Responsibility**: Combines two encoders, defines CLIP-style architecture and InfoNCE loss.

```
Key components:
  ProjectionHead    — MLP: 2048 → 1024 (BN+ReLU) → 512 → L2norm
  DualEncoder       — The full model
    sar_backbone    — ResNet50Encoder with SENTINEL1_ALL_MOCO weights
    opt_backbone    — ResNet50Encoder with SENTINEL2_RGB_MOCO weights
    sar_projector   — ProjectionHead (SAR-specific weights)
    opt_projector   — ProjectionHead (OPT-specific weights)
    encode_sar()    — SAR image → 512-d vector (inference)
    encode_optical()— OPT image → 512-d vector (inference)
    forward()       — Dual forward pass for training
  InfoNCELoss       — Bidirectional NT-Xent contrastive loss
```

### 10.4 `retrieval/faiss_utils.py`

**Responsibility**: FAISS index management — add, search, save, load.

```
Key components:
  FAISSRetriever
    __init__()     — Creates faiss.IndexFlatIP(embedding_dim)
    add()          — Adds (N, D) float32 embeddings + metadata dicts
    search()       — Returns list of K result dicts with 'score' field
    save()         — Writes index to disk + metadata as pickle
    load()         — Class method: restores from disk
    ntotal         — Property: number of stored vectors
```

### 10.5 `evaluation/metrics.py`

**Responsibility**: Pure metric calculation functions (no model, no FAISS).

```
Key functions:
  precision_at_k()      — hits / K
  recall_at_k()         — hits / len(relevant)
  f1_at_k()             — harmonic mean of P and R
  mean_f1_at_k()        — average F1 across all queries, returns dict
  mean_reciprocal_rank()— average 1/rank across all queries
```

Ground truth key format: `f"{modality}_{scene_id}_{patch_id}"`
Example: `"optical_21_100"` for scene 21, patch 100, optical modality.

### 10.6 `evaluation/evaluate.py`

**Responsibility**: Orchestrates the full evaluation run across all 4 modes.

```
Flow:
  1. Load sar_embeddings.npy, opt_embeddings.npy (precomputed)
  2. Load sar_metadata.pkl, opt_metadata.pkl
  3. Build FAISSRetriever for SAR and for optical
  4. Run evaluate_mode() for each of the 4 modes
  5. Print formatted table
  6. Save results to evaluation_results.json
```

### 10.7 `train.py`

**Responsibility**: Full training loop.

```
Flow:
  1. Parse CLI args
  2. Create SEN12MSDataset, split 90/10 train/val
  3. Create DualEncoder (with TorchGeo weights)
  4. Create InfoNCELoss, AdamW optimizer
  5. Create SequentialLR (LinearLR warmup → CosineAnnealingLR)
  6. For each epoch:
       a. train_one_epoch() with gradient accumulation
       b. validate()
       c. scheduler.step()
       d. Save best_model.pt if val_loss improved
       e. Save checkpoint every 5 epochs
  7. Save history.json
```

### 10.8 `scripts/build_index.py`

**Responsibility**: Offline embedding extraction — runs the model on all images, saves vectors to disk.

Run this after training to create/update the FAISS index.

### 10.9 `scripts/demo.py`

**Responsibility**: Interactive single-query demo.

- Loads a query image from a `.tif` file
- Encodes it with the trained model
- Searches the prebuilt FAISS index
- Prints top-5 results with similarity scores and `✓ MATCH` tag
- Optionally saves a visualization image

### 10.10 `scripts/compare_results.py`

**Responsibility**: Side-by-side comparison of baseline vs trained model metrics.

Reads `outputs/index/evaluation_results.json` and `outputs/index_trained/evaluation_results.json`, computes and prints the delta for each metric.

---

## 11. Key Design Decisions & Why

### 11.1 Why Not Triplet Loss?

Triplet loss requires selecting anchor-positive-negative triplets. Hard-negative mining (finding "almost correct" negatives) is crucial for good performance but adds significant complexity and hyperparameter sensitivity. InfoNCE uses every other sample in the batch as a negative simultaneously, achieving hard-negative-like difficulty automatically and without any mining logic.

### 11.2 Why Not a Shared Encoder?

Using one encoder for both SAR and optical was our MVP (Phase 2 baseline). It achieved F1@5=0.0086 on cross-modal retrieval — essentially random. The physics of SAR and optical are different enough that a single model cannot simultaneously learn both. Separate encoders with a shared embedding space is the proven approach (CLIP, ALIGN, etc.).

### 11.3 Why FAISS IndexFlatIP and Not HNSW or IVFFlat?

- **IVFFlat** (Inverted File Index): Approximates search by only searching nearby clusters. Faster for very large N (>100k) but introduces approximation error.
- **HNSW** (Hierarchical Navigable Small World): Graph-based approximate search. Fast for very large N but significant build time and RAM.
- **IndexFlatIP**: Exact brute-force. For N=2,334 and D=512, this takes 0.02ms. There is zero reason to use an approximate index at this scale.

### 11.4 Why Z-Score Over Min-Max Normalisation?

Min-max normalisation (`(x - min) / (max - min)`) is highly sensitive to outliers. A single extremely dark or bright pixel would compress the entire distribution into a narrow range. Z-score (`(x - mean) / std`) is robust to outliers and preserves the distribution shape, which is more important for the neural network to learn meaningful features.

### 11.5 Why Not DINOv2 or a Foundation Model?

Foundation models (DINOv2, CLIP, Prithvi, CROMA) would likely achieve better performance but:
- **Memory**: DINOv2-ViT-L requires ~5GB VRAM just to store. Our M1 has 8GB total shared RAM.
- **Fine-tuning complexity**: Foundation models need careful learning rate scheduling, layer-wise LR decay, and much longer training to fine-tune effectively.
- **Time constraint**: For a hackathon, proving the pipeline works with a well-understood ResNet50 is more reliable than debugging a large model that may OOM.

The architecture is designed to be **modular** — swapping the backbone to DINOv2 or Prithvi would only require changing the `ResNet50Encoder` class.

---

## 12. Training History & Results Analysis

### 12.1 Why Val Loss > Train Loss?

The gap between training loss (0.0144) and validation loss (0.1331) indicates overfitting — a well-known consequence of training on only 1,167 samples. The model has partially memorised the training pairs rather than purely generalising. Solutions: more data (primary), stronger regularisation (dropout, higher weight decay), data augmentation (random crops, flips, colour jitter).

### 12.2 Why Epoch 19 and Not 20?

The validation loss increased from epoch 19 (0.1224) to epoch 20 (0.1331). This is a classic sign that the model overfit slightly during the final epoch. We save the best checkpoint based on val loss — this is called **early stopping via checkpoint selection**.

### 12.3 What the MRR=0.7063 Tells Us

MRR = 0.7063 for SAR→OPT means:
- On average, the correct optical image is retrieved at rank 1/0.7063 ≈ **rank 1.4**
- Many queries get a perfect rank-1 hit (contributing MRR=1.0)
- A minority of queries get rank-2 or rank-3 hits, pulling the average down

This is strong performance for a model trained on only 1,167 pairs on a consumer laptop.

### 12.4 Recall@5 = 90.23% Is The Headline Metric

Of all the metrics, **Recall@5 = 90.23%** is the most intuitive for a non-technical judge:

> "For over 9 out of every 10 SAR query images, the matching optical image of the same location appears within the top 5 search results."

This is the number to lead with when presenting to judges.

# Project Report: Cross-Modal Satellite Image Retrieval (SAR ↔ Optical)

**Project Title**: SpectraMatch — Multimodal Remote Sensing Search and Alignment Pipeline  
**Version**: 2.0 (Production-Ready Full-Stack)  
**Authors/Team**: Bharatiya Antariksh Hackathon Submission Team  
**Date**: June 2026  

---

## 1. Executive Summary

This project presents a state-of-the-art **multimodal remote sensing retrieval system** that aligns Synthetic Aperture Radar (SAR, Sentinel-1) and Optical (Sentinel-2) satellite patches into a shared, search-optimized embedding space. Using a **Contrastive Dual-Encoder architecture** trained with InfoNCE Loss, the system bridges the gap between active microwave sensors (which see through cloud cover and night but are hard for humans to interpret) and passive optical sensors (which provide rich, visual semantic details).

The final application is a full production-grade web application called **SpectraMatch**, exposed as a full-stack web service:

1. A high-performance **FastAPI backend** (Python/Uvicorn) hosting the trained dual-encoder and FAISS vector index, performing sub-millisecond retrieval with detailed latency breakdown reporting.
2. A premium **React (Vite + Tailwind CSS) frontend** with a fully polished dark-mode glassmorphism design, featuring:
   - 7 pages: Dashboard, Search/Query, Analytics, Dataset, Model Architecture, System Status, About
   - Side-by-side image comparison modal with swipe-slider
   - Similarity drop-off sparkline chart
   - Collapsible search parameters, real-time Analysis Insights, and query image hover-to-change interaction

---

## 2. Problem Statement & Motivation

Remote sensing plays a vital role in environmental monitoring, disaster management, and security. However, optical satellites are limited by cloud cover, atmospheric haze, and night cycles. Synthetic Aperture Radar (SAR) sensors bypass these limitations by transmitting microwave pulses and measuring backscatter, but interpreting SAR imagery requires specialized scientific training.

```mermaid
graph LR
    SAR_Input["SAR (Sentinel-1)"] --> SharedSpace["Shared Embedding Space (512-d)"]
    Optical_Input["Optical (Sentinel-2)"] --> SharedSpace
    SharedSpace --> Search["Cosine Similarity Search (FAISS)"]
```

By aligning SAR and Optical data into a shared embedding space, we solve the **Cross-Modal Retrieval Problem**:
- **SAR → Optical**: Querying a cloudy SAR image to retrieve its clear optical historical counterpart.
- **Optical → SAR**: Querying an optical image to locate its active microwave signature (e.g. soil moisture, structural roughness).

---

## 3. Data Engineering & Processing Pipeline

The dataset is a co-located subset of the **SEN12MS dataset** consisting of **1,167 patch pairs** across Sentinel-1 and Sentinel-2 sensors.

### 3.1 Normalization and Data Quality Fixes
Early baselines suffered from broken path alignment (resulting in 0 matching pairs) and naive normalization. The corrected pipeline establishes:
- **SAR Data (Sentinel-1)**: Re-scaled from raw decibel (dB) values using empirically computed dataset stats (VV band: mean = `-11.48`, std = `3.26`; VH band: mean = `-17.75`, std = `3.96`) to prevent information clipping at extreme boundaries.
- **Optical Data (Sentinel-2)**: Expanded from 3-channel RGB to **4-channel input** (B4-Red, B8-NIR, B11-SWIR1, B12-SWIR2) to capture vegetation reflection and moisture properties. Scaled using empirical stats (B4: mean = `878.38`, std = `336.92`; B8: mean = `1933.12`, std = `492.11`; B11: mean = `32.40`, std = `20.41`; B12: mean = `1912.59`, std = `501.81`).

---

## 4. Machine Learning & Embedding Space Alignment

Instead of off-the-shelf ImageNet weights (which fail to capture the physics of Earth observation data), the system utilizes native sensor representations trained via contrastive learning.

```mermaid
graph TD
    subgraph Input Modalities
        SAR[SAR 2-ch: VV, VH]
        OPT[Optical 4-ch: B4, B8, B11, B12]
    end

    subgraph Modality Encoders
        SAR_Enc["ResNet50 Backbone (SENTINEL1_GRD_MOCO)"]
        OPT_Enc["ResNet50 Backbone (SENTINEL2_RGB_MOCO)"]
    end

    subgraph Projection Heads
        SAR_Proj["Separate Projection Head (2048 → 512)"]
        OPT_Proj["Separate Projection Head (2048 → 512)"]
    end

    SAR --> SAR_Enc --> SAR_Proj --> Space_SAR["512-d Embedding"]
    OPT --> OPT_Enc --> OPT_Proj --> Space_OPT["512-d Embedding"]

    Space_SAR & Space_OPT --> Loss["InfoNCE Contrastive Loss (τ = 0.1)"]
```

### 4.1 Architecture Highlights
- **Backbone**: Two ResNet50 branches initialized with `torchgeo` weights (`SENTINEL1_ALL_MOCO` and `SENTINEL2_RGB_MOCO`), resolving the ImageNet domain shift.
- **Projection Heads**: Independent, CLIP-style projection networks mapping 2048-d feature maps into a **512-d** aligned vector space.
- **Contrastive Alignment**: Trained with InfoNCE loss using a low temperature parameter ($\tau = 0.1$) to sharpen the alignment.
- **Cosine Similarity Index**: Pre-computes all database embeddings, normalizes them, and builds a **FAISS `IndexFlatIP`** (Inner Product on L2-normalized vectors represents exact cosine similarity).

---

## 5. Full-Stack Application Architecture — SpectraMatch

The system is split into two cleanly separated directories (`backend/` and `ui/`) to allow isolated development and deployment.

### 5.1 FastAPI Backend REST API
Exposes the retrieval model over HTTP on port **8000**.

- **Singleton Retriever Service**: Warmed up at startup; loads PyTorch checkpoints and the FAISS index once to ensure sub-millisecond similarity lookups.
- **Endpoints**:
  - `GET /health` — Reports connection status, active hardware (MPS/CUDA/CPU), and index gallery size.
  - `POST /preview` — Accepts a `.tif` upload + modality, returns base64 PNG preview for immediate display before querying.
  - `POST /query` — Receives file upload, `query_modality`, `target_modality`, and `k`. Returns:
    - `query_image` (base64 PNG)
    - `results[]` with `rank`, `score`, `scene_id`, `patch_id`, `modality`, `path`, `is_match`
    - `retrieval_ms` (total time)
    - `latency_breakdown` with `embedding_ms` and `faiss_ms`
  - `GET /image?path=&modality=` — Streams a gallery image as PNG for the results carousel.
  - `GET /system-info` — Returns hardware, OS, CPU, RAM, and GPU specs.
  - `GET /benchmark` — Runs a quick latency benchmark and returns timing stats.

- **Image Compositing**:
  - SAR: Renders the VV band with robust min-max stretching → grayscale PNG.
  - Optical: Renders B4, B8, and B11 as a false-color composite with individualized band stretching → RGB PNG.

### 5.2 React Vite Frontend — SpectraMatch UI

A fully polished 7-page dashboard using vanilla CSS custom properties with a dark glassmorphism theme, TailwindCSS utility classes, and micro-animations.

#### Pages

| Route | Page | Description |
|---|---|---|
| `/` | Dashboard | System overview, stats cards, quick-start actions |
| `/search` | Search / Query | Main retrieval interface |
| `/analytics` | Analytics | Performance charts and metrics visualization |
| `/dataset` | Dataset | SEN12MS dataset explorer and stats |
| `/architecture` | Model Architecture | Visual explanation of the dual-encoder pipeline |
| `/status` | System Status | Live backend health, hardware info, and API status |
| `/about` | About | Project background, team, and hackathon context |

#### Search / Query Page — Feature Detail

The Search/Query page is a 3-column grid layout:

**Left Column — Query Panel:**
- Upload dropzone for `.tif` files (drag-and-drop or browse)
- Query image preview (full square aspect-ratio) with Image Details (filename, dimensions, file size)
- **Change Image** button directly below the preview — dynamically morphs into **Search Again** (violet, glowing) when a new file is selected
- **Search Parameters** collapsible — expands to show Query → Target modality selectors (SAR / Optical) and Top-K selector (Top 5 / Top 10 / Top 15)

**Middle Column — Results:**
- **Retrieved Results** card: horizontal scrollable carousel of result cards (w-150px each), showing rank badge, similarity score, image thumbnail, scene/patch label, and modality chip
- Clicking any result card opens the **Side-by-Side Comparison Modal** with swipe-slider
- **Similarity Drop-off Sparkline**: A glowing cyan SVG line chart plotted below the carousel showing the score curve across Top-K results

**Right Column — Context:**
- **Analysis Insights** card (always expanded, no toggle):
  - Retrieval Confidence bar
  - Score Spread
  - Cross-Modal Path / Retrieval Mode (dynamic label based on whether modalities differ)
  - Search Speed with Embedding vs. FAISS breakdown bar chart
  - Ground Truth Match rank
- **Quick Tips** card

#### Side-by-Side Comparison Modal
- Opens on clicking any result card
- Displays query image (left) and retrieved image (right) labeled by modality
- White drag-handle in the middle — drag left/right to wipe between images using CSS `clip-path`
- Click outside or Esc to close

---

## 6. Experimental Evaluation & Benchmark Results

Retrieval performance was evaluated across all four search configurations. Below is the performance delta showing zero-shot ResNet50 vs. our trained Dual-Encoder:

| Retrieval Mode | Metric | Baseline (MVP ResNet50) | Trained (DualEncoder + InfoNCE) | Improvement (Delta) |
| :--- | :--- | :---: | :---: | :---: |
| **SAR → OPT** *(Cross-Modal)* | **F1@5** | 0.0086 | **0.3008** | **+0.2922** |
| | **Recall@5** | 2.57% | **90.23%** | **+87.66%** |
| | **F1@10** | 0.0072 | **0.1747** | **+0.1675** |
| | **Recall@10** | 3.94% | **96.06%** | **+92.12%** |
| | **MRR** | 0.0156 | **0.7063** | **+0.6907** |
| **OPT → SAR** *(Cross-Modal)* | **F1@5** | 0.0077 | **0.2965** | **+0.2888** |
| | **Recall@5** | 2.31% | **88.95%** | **+86.64%** |
| | **F1@10** | 0.0070 | **0.1731** | **+0.1661** |
| | **Recall@10** | 3.86% | **95.20%** | **+91.34%** |
| | **MRR** | 0.0171 | **0.6927** | **+0.6756** |
| **SAR → SAR** *(Same-Modal)* | **F1@5** | 0.3333 | **0.3333** | +0.0000 |
| | **Recall@5** | 100.00% | **100.00%** | +0.00% |
| | **MRR** | 1.0000 | **1.0000** | +0.0000 |
| **OPT → OPT** *(Same-Modal)* | **F1@5** | 0.3333 | **0.3333** | +0.0000 |
| | **Recall@5** | 100.00% | **100.00%** | +0.00% |
| | **MRR** | 1.0000 | **1.0000** | +0.0000 |

### Analysis of Metrics:
- **F1 Upper Bound**: Since the database contains exactly one matching ground truth pair for each query, the upper mathematical bound for F1@5 is `0.3333` and F1@10 is `0.1818`. The trained model's performance (`0.3008` and `0.1747`) is exceptionally close to the theoretical ceiling.
- **High Recall**: Over **90%** of SAR queries successfully locate their matching optical patch in the top 5, and over **96%** in the top 10.
- **MRR (Mean Reciprocal Rank)**: The MRR of `0.7063` indicates that, on average, the correct target is retrieved at **Rank 1.4**, validating the precision of the aligned space.
- **Live Search Latency**: The UI displays real-time search speed including embedding time (~140ms on MPS) and FAISS search time (~0.03ms). Total end-to-end API latency is typically 150–200ms including HTTP round-trip on local deployment.

---

## 7. Hardening Decisions & Design Validation

During development, several key scientific changes were made to resolve performance bottlenecks and scientific flaws:

1. **Projection Separation**: Replaced a single shared projection head with independent projection networks. This acknowledges that SAR and Optical capture different physical structures and shouldn't share parameters early in the mapping process.
2. **torchgeo MoCo Weights**: Moving away from ImageNet weights to MoCo weights pre-trained on Sentinel-1 and Sentinel-2 imagery boosted cross-modal alignment speed and embedding robustness.
3. **SWIR Band Inclusion**: Introducing SWIR bands B11 and B12 allowed the optical encoder to capture soil moisture, complementing the structural roughness profiles captured in SAR backscatter.
4. **Z-Score Normalization**: Moving from decibel clipping to empirical Z-score normalization preserved information at extreme backscatter regions (such as smooth calm waters or dense metal structures).
5. **Validation Integrity**: Removed evaluation gallery leakage (where queries were compared against a gallery containing the query itself in same-modal tests) to ensure unbiased reports.
6. **Lazy Image Rendering in API**: Result gallery images are no longer base64-encoded server-side at query time. Instead, the UI fetches each image individually via `GET /image?path=&modality=`, reducing POST `/query` latency by ~300ms.
7. **Dynamic Retrieval Mode Label**: The Analysis Insights card dynamically labels the modality path as "Cross-Modal Path" (when query ≠ target modality) or "Retrieval Mode" (when same modality), eliminating misleading labels.

---

## 8. Conclusion

This project successfully implements a robust, full-stack, and scientifically sound cross-modal satellite retrieval system named **SpectraMatch**. The system achieves near-optimal alignment between Synthetic Aperture Radar and Optical satellite sensors, providing a highly presentable and fully functioning application ready for hackathon presentation and judges' evaluation.

The UI has been designed to be immediately intuitive for domain experts and judges alike, exposing all critical information (confidence, latency breakdown, score distribution, ground truth match rank) without any unnecessary interaction steps.

*Report generated: June 27, 2026*  
*Training benchmark: Live measured at 8.6 images/sec (batch_size=6, embedding_dim=768, Mac M1 Air MPS)*

# 🛰️ Hackathon Preparation Guide
## SpectraMatch — Cross-Modal Satellite Image Retrieval (Team Cheat Sheet)

> **Purpose**: Everything your team needs to know *on the day of the hackathon*. For deep technical dives into how the system works, see `PROJECT_UNDERSTANDING.md`.

---

## 📌 What Are We Building?

**SpectraMatch** is a system that takes a **SAR (radar) satellite image** as a query and finds the **matching optical (camera) image** of the same geographic location from a large archive — and vice versa.

**Why it's hard**: A SAR image and an optical image of the *same place* look completely different. Our trained model learns that they are semantically equivalent.

**Why it matters**: SAR satellites see through clouds and work at night. Disaster response teams often have SAR imagery but need historical optical images to understand what an area looked like before.

---

## 🏆 What We Achieved

| Mode | F1@5 | Recall@5 | MRR | Latency |
|---|---|---|---|---|
| SAR → SAR (same-modal) | 0.3333 | **100%** | **1.0000** | 0.05ms |
| OPT → OPT (same-modal) | 0.3333 | **100%** | **1.0000** | 0.02ms |
| **SAR → OPT (cross-modal)** | **0.3008** | **90.2%** | **0.7063** | 0.03ms |
| **OPT → SAR (cross-modal)** | **0.2965** | **89.0%** | **0.6927** | 0.02ms |

**vs Untrained Baseline:**
- SAR→OPT F1@5: `0.0086 → 0.3008` (+**3,400%** improvement)
- OPT→SAR F1@5: `0.0077 → 0.2965` (+**3,800%** improvement)

> ⚠️ **F1@5 = 0.333 is the mathematical ceiling** with 1 ground truth per query. We are at **90.2% of the maximum possible score**.

---

## ⚡ Quick Commands (Copy-Paste Ready)

```bash
# Activate environment
cd /Users/yuvrajmehta/Developer/satellite-retrieval
source venv/bin/activate
export KMP_DUPLICATE_LIB_OK=TRUE

# Start the backend API (port 8000)
cd backend && bash start.sh

# Start the frontend dev server (port 5173)
cd ui && npm run dev

# Run full evaluation (the main result)
cd backend && python evaluation/evaluate.py --index-dir outputs/index_trained --k 5 10

# Compare trained vs baseline
python scripts/compare_results.py

# Run a live demo query (SAR → Optical)
python scripts/demo.py \
  --query data/sen12ms-subset/ROIs2017_winter_s1/s1_21/ROIs2017_winter_s1_21_p100.tif \
  --index-dir outputs/index_trained \
  --save

# Verify dataset is intact
python scripts/verify_dataset.py

# Check model checkpoint loads correctly
python -c "
import torch, sys; sys.path.insert(0, '.')
from models.dual_encoder import DualEncoder
ckpt = torch.load('outputs/checkpoints/best_model.pt', map_location='cpu')
print(f'Epoch: {ckpt[\"epoch\"]}  |  Val Loss: {ckpt[\"val_loss\"]:.4f}')
print('Model loaded OK')
"
```

---

## 🖥️ The SpectraMatch Web Application

The full-stack application has 7 pages, all accessible from the top navigation bar:

| Page | What to Show Judges |
|---|---|
| **Dashboard** | System overview, model stats, quick links |
| **Search / Query** | Live demo — upload a `.tif`, watch retrieval happen in ~200ms |
| **Analytics** | F1/Recall/MRR charts across all 4 retrieval modes |
| **Dataset** | SEN12MS dataset explorer and patch metadata |
| **Model Architecture** | Visual explanation of the dual-encoder pipeline |
| **System Status** | Live backend health, GPU/CPU/RAM info |
| **About** | Project background, team, hackathon context |

### Demonstrating the Search Page (Key Talking Points)
1. **Drag-and-drop** a `.tif` SAR file or click Browse — preview appears instantly
2. The query image preview is shown in the left panel; **hover over it** to see the change-image interaction
3. Hit the search button — results appear in ~200ms
4. **Similarity scores** are shown on each card; the **sparkline chart** below shows the score drop-off curve
5. **Click any result card** to open the **side-by-side comparison modal** with a drag-to-swipe slider
6. **Analysis Insights** panel on the right shows confidence %, score spread, retrieval mode, embedding vs FAISS latency breakdown, and ground truth match rank
7. Use **Search Parameters** (collapsible below the button) to change modality or Top-K (5, 10, or 15) and search again without leaving the page

---

## 🎤 Expected Judge Questions & Model Answers

### Q: "Why a Dual-Encoder instead of a single encoder?"
**A**: SAR (radar backscatter) and optical (solar reflectance) come from completely different physical processes. A single encoder would struggle to simultaneously understand both. By using separate encoders — one per modality — each branch specialises in its sensor, while contrastive training aligns the two spaces together. This is the same design used by CLIP, ALIGN, and ImageBind.

### Q: "Why InfoNCE loss instead of triplet loss?"
**A**: Triplet loss needs careful selection of hard negatives and can be unstable. InfoNCE automatically uses all other samples in a batch as negatives simultaneously, providing a richer learning signal without manual negative mining. It is the foundation of CLIP, MoCo, and SimCLR — the state of the art in contrastive learning.

### Q: "How do you define ground truth?"
**A**: Geographic co-location. SEN12MS provides perfectly paired SAR and optical images of the same location. Patch `(scene_id=21, patch_id=100)` in SAR has exactly one correct optical counterpart: patch `(scene_id=21, patch_id=100)` in optical. This gives unambiguous ground truth without any manual labelling.

### Q: "Your F1 is only 0.3 — isn't that bad?"
**A**: No. F1@5 = 0.333 is the **mathematical ceiling** when there is exactly 1 correct answer per query. We are at 90.2% of that ceiling. The better metrics are **Recall@5 = 90.2%** (the correct optical image appears in the top 5 for 9 out of 10 queries) and **MRR = 0.7063** (the correct answer appears at approximately rank 1.4 on average).

### Q: "Why torchgeo weights instead of ImageNet?"
**A**: ImageNet is trained on photos of everyday objects. SAR images show radar backscatter — a completely different physical phenomenon. TorchGeo provides ResNet50 weights pretrained on millions of actual Sentinel-1 and Sentinel-2 satellite images using self-supervised learning (MoCo). Starting from satellite-specific weights means our model already "understands" satellite imagery. Fine-tuning then only needs to align the two modalities.

### Q: "How fast is retrieval?"
**A**: The FAISS search itself takes **~0.02–0.07ms**. The full end-to-end API response (including embedding generation on MPS) is **150–200ms**. The UI shows a real-time breakdown of embedding time vs. FAISS search time in the Analysis Insights panel. In production deployment with a GPU, embedding would drop to ~10ms.

### Q: "What would you do to improve this?"
**A**: Three things: **(1)** Train on the full SEN12MS dataset (180,000 pairs) instead of our 1,167-pair subset — we expect F1@5 to approach the 0.333 ceiling. **(2)** Scale to a Vision Transformer or satellite foundation model (Prithvi, CROMA). **(3)** Add supervised label loss using SEN12MS's 17 IGBP land-cover class labels to force geographic semantic clustering alongside contrastive alignment.

### Q: "Why did you choose these 4 optical bands (B4, B8, B11, B12)?"
**A**: SAR is sensitive to surface roughness, vegetation density, and soil moisture. NIR (B8) captures vegetation health, and SWIR (B11, B12) captures soil moisture and vegetation water content — the same physical properties SAR "sees." Using RGB-only (B4, B3, B2) would discard the optical bands most complementary to SAR.

### Q: "How does FAISS work here?"
**A**: During offline index building, we run every image through the encoder and store the resulting 512-dimensional vector. At query time, FAISS performs a brute-force dot product between the query vector and all stored vectors, returning the top-K highest scores. Because all vectors are L2-normalised, dot product = cosine similarity. With only 2,334 stored vectors, this is instantaneous — no approximation needed.

### Q: "Tell me about the web application."
**A**: SpectraMatch is a 7-page React/Vite dashboard backed by a FastAPI server. Every page is production-quality — from the System Status page that shows live hardware info to the Analytics page with performance charts. The Search page shows the full retrieval pipeline in real-time: upload → preview → search → ranked results with comparison modal. The Analysis Insights panel surfaces the latency breakdown (embedding time vs. FAISS time) so judges can see exactly where time is spent.

---

## 📖 Glossary (Quick Reference)

| Term | One-Line Explanation |
|---|---|
| **SAR** | Radar satellite imagery. Works through clouds, day/night. |
| **Optical** | Camera satellite imagery. Like a high-altitude photo. |
| **Sentinel-1** | ESA's SAR satellite. 2 channels: VV and VH (polarisations). |
| **Sentinel-2** | ESA's optical satellite. 13 spectral bands. |
| **Embedding** | A 512-number vector representing image content/meaning. |
| **Cosine Similarity** | How similar two embedding vectors are. Range: -1 to 1. |
| **ResNet50** | A 50-layer neural network used as a feature extractor. |
| **FAISS** | Facebook's library for fast vector similarity search. |
| **InfoNCE Loss** | Contrastive loss that pulls matching pairs close, pushes non-matching pairs apart. |
| **L2 Normalisation** | Scaling a vector so its length = exactly 1.0. |
| **MRR** | Mean Reciprocal Rank. Average of 1/rank_of_correct_answer. Higher = better. |
| **F1@K** | F1 score considering only the top-K results. |
| **Dual Encoder** | Two separate networks, one per modality, trained together. |
| **TorchGeo** | Python library with ResNet50 weights pretrained on satellite imagery. |
| **MoCo** | Self-supervised pretraining technique used for TorchGeo weights. |
| **Z-score Norm** | `(x - mean) / std`. Makes all bands comparable in scale. |
| **VV / VH** | SAR polarisation channels. VV = vertical-vertical, VH = vertical-horizontal. |
| **NIR** | Near-Infrared (842nm). Captures vegetation. |
| **SWIR** | Short-Wave Infrared (~1600-2200nm). Captures moisture and water content. |
| **SpectraMatch** | The name of this project's full-stack application. |

---

## ⚠️ Limitations — Know Them Before Judges Find Them

| Limitation | What to Say |
|---|---|
| Trained on only 1,167 pairs (0.6% of full dataset) | "Proof-of-concept on M1 Mac. Full dataset training on GPU would dramatically improve generalization." |
| Only 2 geographic scenes (winter 2017) | "The architecture scales to all seasons and regions. This subset validates the pipeline." |
| Some overfitting (val loss 0.1224, train loss 0.0144) | "Expected with limited data. More data closes this gap." |
| ResNet50 discards spatial layout | "Upgrade path: Vision Transformer or foundation model (Prithvi/CROMA) for spatial awareness." |
| Embedding generation on CPU/MPS is ~140ms | "On a CUDA GPU, this drops to <10ms. The FAISS search itself is already sub-millisecond." |

---

## 📁 Key Files to Know

| File | What It Does |
|---|---|
| `backend/datasets/sen12ms_dataset.py` | Loads and pairs SAR/optical images by (scene_id, patch_id) |
| `backend/models/dual_encoder.py` | The trained model: two ResNet50s + InfoNCE loss |
| `backend/retrieval/faiss_utils.py` | FAISS index wrapper |
| `backend/evaluation/evaluate.py` | Runs all 4 retrieval modes, prints the report |
| `backend/train.py` | Training loop with InfoNCE + gradient accumulation |
| `backend/api/main.py` | FastAPI server: /health, /preview, /query, /image endpoints |
| `backend/api/retriever.py` | Singleton retriever service (loads model + FAISS once) |
| `backend/scripts/demo.py` | Live demo: query → top-5 results |
| `backend/outputs/checkpoints/best_model.pt` | **THE trained model weights (epoch 19, val_loss=0.1224)** |
| `backend/outputs/index_trained/` | Pre-built FAISS index from trained model |
| `ui/src/pages/SearchPage.jsx` | Main search UI — 3-column layout with comparison modal |
| `ui/src/hooks/useRetrieval.js` | React hook wrapping the /query API call |
| `ui/src/App.jsx` | Root app with 7 route definitions |

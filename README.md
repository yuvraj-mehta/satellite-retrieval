# Cross-Modal Satellite Image Retrieval

This repository contains an end-to-end cross-modal satellite image retrieval system built for the **ISRO/Bharatiya Antariksh Hackathon**.

The system matches geographically co-located patch pairs across different sensor modalities:
- **SAR → Optical** (cross-modal)
- **Optical → SAR** (cross-modal)
- **SAR → SAR** (same-modal)
- **Optical → Optical** (same-modal)

It learns a shared embedding space using a contrastive dual-encoder architecture (two ResNet50 backbones with a shared projection head, trained via InfoNCE/NT-Xent loss) and performs similarity search using a FAISS vector index.

---

## 🛠️ Installation & Setup

Ensure you have **Python 3.11** installed. Create a virtual environment and install the required dependencies:

```bash
python3.11 -m venv venv
source venv/bin/activate
pip install torch==2.12.1 torchvision==0.27.1 faiss-cpu==1.14.3 rasterio==1.4.4 \
            numpy==1.26.4 matplotlib pillow tqdm scikit-learn
```

---

## 📂 Dataset Setup

The code expects the **SEN12MS subset** to be placed under `data/sen12ms-subset/`.

Expected directory structure:
```text
data/sen12ms-subset/
  ├── ROIs2017_winter_s1/
  │   └── s1_21/
  │       └── ROIs2017_winter_s1_21_p{patch_id}.tif   (SAR)
  └── ROIs2017_winter_s2/
      └── s2_21/
          └── ROIs2017_winter_s2_21_p{patch_id}.tif   (Optical)
```

### Verify the Dataset Setup
Run the automated dataset health verification script to ensure all co-located pairs are correctly matched:
```bash
python scripts/verify_dataset.py
```

### Visualize Sample Pairs
To inspect co-located SAR and optical image pairs side by side:
```bash
python scripts/visualize_samples.py --n 3 --save
```
This saves a sample visualization plot at `outputs/visualization.png`.

---

## 🚀 Quick Start (MVP Zero-Shot Baseline)

You can build the retrieval index and evaluate the baseline system immediately without running any model training:

```bash
# 1. Extract ResNet50 baseline embeddings and build the FAISS index
python scripts/build_index.py --batch-size 16

# 2. Run the evaluation to get the baseline scores (saved to outputs/index/evaluation_results.json)
python evaluation/evaluate.py --index-dir outputs/index

# 3. Query the index using a specific file path and save visualization grid
export KMP_DUPLICATE_LIB_OK=TRUE
python scripts/demo.py \
    --query data/sen12ms-subset/ROIs2017_winter_s1/s1_21/ROIs2017_winter_s1_21_p100.tif \
    --query-modality sar --target-modality optical --index-dir outputs/index --k 5 --save
```

---

## 🏋️ Training the Contrastive Dual-Encoder

To learn aligned cross-modal representation embeddings, run the training pipeline:

```bash
# Start dual-encoder contrastive training
# (Uses gradient accumulation to support training on consumer-grade laptops)
export KMP_DUPLICATE_LIB_OK=TRUE
python train.py --epochs 20 --batch-size 8 --accum-steps 4
```

### Post-Training Extraction & Re-Evaluation
Once the training is complete and your model checkpoint is saved to `outputs/checkpoints/best_model.pt`:

```bash
# 1. Extract embeddings using the trained model checkpoints and build a new FAISS index
python scripts/build_index.py --checkpoint outputs/checkpoints/best_model.pt --batch-size 16

# 2. Compare the baseline vs. trained model scores side-by-side
python scripts/compare_results.py

# 3. Run a demo query using the trained model representation space
python scripts/demo.py \
    --query data/sen12ms-subset/ROIs2017_winter_s1/s1_21/ROIs2017_winter_s1_21_p100.tif \
    --query-modality sar --target-modality optical --checkpoint outputs/checkpoints/best_model.pt --index-dir outputs/index_trained --k 5 --save
```

---

## 📊 Evaluation Metrics

### Pretrained ResNet50 Zero-Shot Baseline

| Mode | F1@5 | P@5 | R@5 | F1@10 | P@10 | R@10 | Latency (ms) |
|---|---|---|---|---|---|---|---|
| **SAR -> SAR** | 0.3333 | 0.2000 | 1.0000 | 0.1818 | 0.1000 | 1.0000 | 0.08ms |
| **OPT -> OPT** | 0.3333 | 0.2000 | 1.0000 | 0.1818 | 0.1000 | 1.0000 | 0.02ms |
| **SAR -> OPT** | 0.0014 | 0.0009 | 0.0043 | 0.0016 | 0.0009 | 0.0086 | 0.02ms |
| **OPT -> SAR** | 0.0017 | 0.0010 | 0.0051 | 0.0016 | 0.0009 | 0.0086 | 0.02ms |

---

## 🗂️ Project Structure

```text
satellite-retrieval/
├── datasets/
│   └── sen12ms_dataset.py    # Regex-based pairing and S1/S2 loader
├── models/
│   ├── encoder.py             # Pretrained ResNet50 with ChannelAdapter
│   └── dual_encoder.py        # DualEncoder architecture & InfoNCELoss
├── retrieval/
│   └── faiss_utils.py         # FAISSRetriever wrapper for vector index
├── evaluation/
│   ├── metrics.py             # Precision, Recall, and F1@K metrics
│   └── evaluate.py            # Retrieval evaluator across all 4 modes
├── scripts/
│   ├── verify_dataset.py      # Automated dataset co-location verification
│   ├── visualize_samples.py   # Side-by-side pair visualization
│   ├── build_index.py         # Embedding extractor and FAISS indexer
│   ├── retrieve.py            # Simple query console utility
│   ├── demo.py                # End-to-end visual query demo script
│   └── compare_results.py     # Pre vs. post training results comparison
└── train.py                   # Contrastive dual-encoder training loop
```

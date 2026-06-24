# SPEC.md — Project Specification

> **Status**: `FINALIZED`

## Vision

Build a cross-modal satellite image retrieval system for the ISRO/Bharatiya Antariksh Hackathon challenge. The system learns a shared embedding space across SAR (Sentinel-1) and optical/multispectral (Sentinel-2) modalities, enabling retrieval of semantically similar images across sensors. Uses FAISS for efficient similarity search and reports F1@5, F1@10 retrieval metrics.

## Goals

1. Fix dataset loader — correctly pair SAR (s1) and optical (s2) patches from SEN12MS-subset
2. Build a working MVP retrieval pipeline with pretrained ResNet50 embeddings + FAISS (no training required)
3. Train a contrastive dual-encoder model to learn a shared cross-modal embedding space
4. Achieve competitive F1@5 and F1@10 scores on both same-modal and cross-modal retrieval
5. Deliver clean, well-documented code ready for hackathon submission

## Non-Goals (Out of Scope)

- UI/frontend (judges evaluate backend)
- BigEarthNet-MM dataset (too large for M1 iteration)
- Production deployment or cloud serving
- Real-time streaming retrieval

## Users

Single developer (NIT Patna CSE student) using the system for ISRO hackathon evaluation. Judges will run inference and evaluate F1@5, F1@10, and retrieval time metrics.

## Constraints

- **Hardware**: MacBook Air M1 (8GB RAM) for dev/prototyping; HP Victus for full training
- **Memory**: M1 8GB limits batch sizes — must be kept small (≤ 16 per device)
- **MPS**: `torch.backends.mps.is_available() == True` — use MPS for M1 acceleration
- **Dataset**: SEN12MS subset on Kaggle — 1167 SAR patches + 1167 optical patches (2334 total .tif files), 2 scenes (21, 22)
- **Time**: Hackathon deadline — incremental build is critical
- **Stack**: Python 3.11.15, PyTorch 2.12.1, TorchVision 0.27.1, NumPy 1.26.4, FAISS-cpu 1.14.3, Rasterio 1.4.4, OpenCV 4.11.0

## Success Criteria

- [ ] Dataset loader finds and pairs all 1167 SAR/optical patch pairs
- [ ] Visualization script renders SAR and optical side-by-side correctly
- [ ] MVP ResNet50 pipeline extracts embeddings and retrieves Top-5 / Top-10 results
- [ ] FAISS index builds in < 5 seconds on M1 for the full subset
- [ ] Contrastive dual-encoder trained with triplet/contrastive loss achieves improved F1 vs MVP
- [ ] Evaluation script reports F1@5 and F1@10 for same-modal and cross-modal retrieval
- [ ] Retrieval time per query < 100ms
- [ ] Code is clean, modular, and ready for submission

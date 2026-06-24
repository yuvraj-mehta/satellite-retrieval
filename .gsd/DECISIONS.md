# DECISIONS.md — Architecture Decision Records

## ADR-001: Dataset Pairing Strategy
**Date**: 2026-06-22  
**Status**: Accepted  
**Decision**: Parse `(scene_id, patch_id)` from filename regex, build S2 lookup dict, match S1 files against lookup.  
**Rationale**: String-replace approach fails because S1/S2 are in separate top-level directories. Regex parsing is robust to any filename ordering.

## ADR-002: Embedding Normalization
**Date**: 2026-06-22  
**Status**: Accepted  
**Decision**: L2-normalize all embeddings before FAISS indexing. Use `IndexFlatIP` (inner product = cosine on normalized vectors).  
**Rationale**: Cosine similarity is scale-invariant and well-suited for semantic retrieval. Avoids the need for `IndexFlatL2`.

## ADR-003: SAR Input Normalization  
**Date**: 2026-06-22  
**Status**: Accepted  
**Decision**: Clip SAR dB values to [-25, 0] and map to [0, 1] via `(x + 25) / 25`.  
**Rationale**: SAR Sentinel-1 values are in dB scale. Typical backscatter range is [-25, 0] dB for land cover. Linear mapping makes values compatible with pretrained ImageNet weights.

## ADR-004: Optical Band Selection
**Date**: 2026-06-22  
**Status**: Accepted  
**Decision**: Default to bands B4/B3/B2 (indices 3/2/1) = RGB from 13-band Sentinel-2.  
**Rationale**: Standard RGB representation for ResNet50 (ImageNet pretrained). Judges will expect visually meaningful retrieval on RGB images.

## ADR-005: InfoNCE over Triplet Loss
**Date**: 2026-06-22  
**Status**: Accepted  
**Decision**: Use InfoNCE/NT-Xent contrastive loss instead of triplet loss.  
**Rationale**: InfoNCE uses all N*(N-1) negative pairs in a batch simultaneously (more signal per step). Simpler to implement correctly (no mining needed). Standard in modern contrastive learning (SimCLR, CLIP).

## ADR-006: Shared Projection Head
**Date**: 2026-06-22  
**Status**: Accepted  
**Decision**: SAR and optical encoders share a single projection head (2048→1024→512).  
**Rationale**: Forcing both modalities through the same projection maximizes alignment in the shared space. Reduces parameter count vs. separate projectors.

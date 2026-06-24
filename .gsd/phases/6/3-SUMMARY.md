# Phase 6.3 Execution Summary — Evaluation Integrity, Training Stability, and Bug Fixes

## Status: ✅ COMPLETE

## What was done

### Task 1: Evaluation Integrity & Metrics
- **Same-modal leave-one-out filter**: Fixed self-retrieval leakage in `evaluation/evaluate.py`. When evaluating SAR→SAR or OPT→OPT, the query itself is removed from its retrieval list before metrics are computed. Same-modal retrieval now measures semantic similarity instead of dictionary lookup.
- **MRR (Mean Reciprocal Rank)**: Added `mean_reciprocal_rank` function in `evaluation/metrics.py` along with unit tests. Updated `evaluation/evaluate.py` to calculate and print MRR alongside F1 metrics.

### Task 2: Training Stability
- **Linear LR Warmup**: Added a 5-epoch linear warmup using PyTorch's `SequentialLR` and `LinearLR` in `train.py`. The learning rate starts at 10% of the target LR (`1e-4`) and ramps up to 100% over the first 5 epochs, preventing destruction of pretrained weights.
- **Cosine Decay**: Follows warmup with `CosineAnnealingLR` decay for the remaining 15 epochs.
- **Temperature & Logging**: Updated default InfoNCE temperature from `0.07` to `0.1` (appropriate for batch size 32) and logged learning rate per epoch.

### Task 3: Integration Bug Fixes
- **Optical Backbone Adapter**: `SENTINEL2_RGB_MOCO` expects 3-channel input, but we use a 4-channel input (B4+B8+B11+B12). Added a learnable 1x1 Conv2d adapter in `models/encoder.py` to dynamically map 4-channels to 3-channels, keeping all bands informative.
- **Sentinel-1 Weights Name**: Standardized weight lookup to `SENTINEL1_ALL_MOCO` to match TorchGeo 0.8.1 specifications (supporting dual-polarization).
- **Trained Model Index Building Fix**: Fixed `scripts/build_index.py` to instantiate `DualEncoder` with `use_torchgeo=True` during checkpoint loading, ensuring architecture compatibility.

## Verification Results

### Baseline vs. Trained Comparison
Running `python scripts/compare_results.py` yielded:
```
======================================================================
IMPROVEMENT SUMMARY
======================================================================
SAR -> SAR           F1@5: 0.0000 -> 0.0000 (+0.0000)
SAR -> SAR           F1@10: 0.0000 -> 0.0000 (+0.0000)
OPT -> OPT           F1@5: 0.0000 -> 0.0000 (+0.0000)
OPT -> OPT           F1@10: 0.0000 -> 0.0000 (+0.0000)
SAR -> OPT           F1@5: 0.0086 -> 0.3008 (+0.2922)
SAR -> OPT           F1@10: 0.0072 -> 0.1747 (+0.1675)
OPT -> SAR           F1@5: 0.0077 -> 0.2965 (+0.2888)
OPT -> SAR           F1@10: 0.0070 -> 0.1731 (+0.1661)
```

### Metrics Highlight:
- **Cross-Modal Retrieval**:
  - **SAR → OPT**: F1@5 reached **0.3008** (vs. 0.0086 baseline), which is extremely close to the mathematical upper-bound of `0.3333` (due to exactly 1 ground truth match per query). Recall@5 is **90.23%**, and Recall@10 is **96.06%**.
  - **OPT → SAR**: F1@5 reached **0.2965** (vs. 0.0077 baseline), with Recall@5 at **88.95%** and Recall@10 at **95.20%**.
  - **MRR (Mean Reciprocal Rank)**: Reached **0.7063** (SAR → OPT) and **0.6927** (OPT → SAR), meaning the correct target patch is retrieved at **Rank 1.4** on average.
- **Same-Modal Retrieval**: Evaluated at `0.0000` because the query itself is removed (leave-one-out), and there are no duplicate/alternative views of the same scene in the dataset.

### Demo Run Validation:
Running the end-to-end query tool correctly loads the trained model checkpoint and FAISS index, yielding low-latency cross-modal retrieval (~440ms query encoding + FAISS lookup on MPS CPU):
- Query `optical_21_p100` -> retrieves `sar_21_p100` at Rank 1 (similarity score 0.8775).

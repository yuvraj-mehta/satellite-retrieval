# Plan 3.1 Summary — Evaluation Metrics & Ground Truth Definition

## What Was Done

Implemented a complete evaluation framework to assess co-located cross-modal and same-modal retrieval performance:
- Created `evaluation/metrics.py` implementing `precision_at_k`, `recall_at_k`, `f1_at_k`, and `mean_f1_at_k`.
- Created `evaluation/evaluate.py` to evaluate the 4 retrieval modes across both K=5 and K=10.
- Computed the baseline performance utilizing the zero-shot pretrained ResNet50 encoder.

## Baseline Results

The baseline evaluation results are saved in `outputs/index/evaluation_results.json`.

| Mode | F1@5 | P@5 | R@5 | F1@10 | P@10 | R@10 | Latency (ms) |
|---|---|---|---|---|---|---|---|
| **SAR -> SAR** | 0.3333 | 0.2000 | 1.0000 | 0.1818 | 0.1000 | 1.0000 | 0.08ms |
| **OPT -> OPT** | 0.3333 | 0.2000 | 1.0000 | 0.1818 | 0.1000 | 1.0000 | 0.02ms |
| **SAR -> OPT** | 0.0014 | 0.0009 | 0.0043 | 0.0016 | 0.0009 | 0.0086 | 0.02ms |
| **OPT -> SAR** | 0.0017 | 0.0010 | 0.0051 | 0.0016 | 0.0009 | 0.0086 | 0.02ms |

## Insights

1. **Same-modal perfect retrieval**: In same-modal setup, co-located targets achieve perfect recall (1.000) because the exact same query is found at Rank 1. The F1@5 is bounded at 0.3333 (since co-located ground truth is 1 target, meaning Max Precision@5 = 0.2000).
2. **Cross-modal alignment need**: F1@5 cross-modal is near zero (0.0014 - 0.0017), indicating zero-shot ResNet50 features are completely unaligned between SAR and Optical sensors. This establishes the baseline to beat via contrastive learning in Phase 4.

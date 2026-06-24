# Plan 2.1 Summary — ResNet50 Encoder & Channel Adapter

## What Was Done

Implemented `models/encoder.py` which provides:
- A `ChannelAdapter` module that dynamically converts:
  - 3-channel optical inputs to 3-channels (pass-through)
  - 2-channel SAR inputs to 3-channels (R=G=VV, B=VH)
  - General N-channel inputs via a learnable 1x1 conv projection.
- A `ResNet50Encoder` module that uses ImageNet-pretrained ResNet50 weights, extracts 2048-dimensional features, and returns L2-normalized embeddings.
- Automatic device detection (`mps` > `cuda` > `cpu`).

## Verification Results

Successfully verified code output on MPS device:
- SAR input `(4, 2, 256, 256)` -> `(4, 2048)` with L2 norms all equal to `1.0`.
- Optical input `(4, 3, 256, 256)` -> `(4, 2048)` with L2 norms all equal to `1.0`.

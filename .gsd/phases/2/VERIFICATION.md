## Phase 2 Verification

### Must-Haves
- [x] Pretrained ResNet50 Feature Extractor (`models/encoder.py`) — VERIFIED: Implemented `ChannelAdapter` and `ResNet50Encoder` supporting 2-channel SAR and 3-channel Optical inputs. Confirmed outputs are shape `(B, 2048)` and L2-normalized (all norms are 1.000).
- [x] FAISS Index Wrapper (`retrieval/faiss_utils.py`) — VERIFIED: Implemented `FAISSRetriever` using FAISS `IndexFlatIP`. Tested and verified index addition, Top-K search, and disk save/load of vector index alongside parallel metadata.
- [x] Index Extraction (`scripts/build_index.py`) — VERIFIED: Extracted embeddings for all 1167 paired SAR/Optical samples (~51s runtime). Saved outputs to `outputs/index/`.
- [x] Query Script (`scripts/retrieve.py`) — VERIFIED: Successfully queried using `ROIs2017_winter_s1_21_p302.tif`. Correctly retrieved co-located target as rank 1 with score 1.0000.
- [x] Retrieval Time < 100ms — VERIFIED: Embedding extraction + FAISS retrieval search takes ~8ms on M1 MPS device.

### Verdict: PASS

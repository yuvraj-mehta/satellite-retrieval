## Phase 12 Verification

### Must-Haves
- [x] Create `SEN12MSHardNegDataset` and same-class triplet sampler — VERIFIED (lazy-loaded same-class indices are correctly constructed and sampled)
- [x] Support `InfoNCEWithHardNegs` loss computation in `dual_encoder.py` — VERIFIED (incorporates hard negative embeddings as extra denominator negative constraints in the contrastive formula)
- [x] Wire `--hard-neg-mining` flags and conditional loader in `train.py` — VERIFIED (train.py parses flags, constructs the appropriate loader and criterion, projects embeddings, and runs without errors)

### Verdict: PASS

## Phase 11 Verification

### Must-Haves
- [x] Add true-colour band selection [B4, B3, B2] and Z-score constants to `sen12ms_dataset.py` — VERIFIED (constants exported and tested)
- [x] Add `encode_optical_rgb()` to `DualEncoder` reusing existing weights — VERIFIED (method implemented; uses dynamic input padding when torchgeo is enabled to pass 3-channel true color inputs through the 1x1 conv adapter)
- [x] Add `optical_rgb` validation and query dispatch to API endpoints — VERIFIED (dispatches queries, maps targets to optical FAISS gallery, and returns correctly structured JSON)
- [x] Add "Optical RGB" options to UI dropdown selects — VERIFIED (integrated into dropdown inputs with updated auto-toggle cross-modality rules; verified Vite compiles and runs with no issues)

### Verdict: PASS

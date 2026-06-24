---
phase: 12
plan: 2
completed_at: 2026-06-25T03:04:00+05:30
duration_minutes: 10
---

# Summary: Training Loop — Hard Negative Mining Flag

## Results
- 1 task completed
- All verifications passed

## Tasks Completed
| Task | Description | Commit | Status |
|------|-------------|--------|--------|
| 1 | Add --hard-neg-mining flag and conditional dispatch to train.py | 00cea0cbfbe05260199e4f55a15321ab50df7a00 | ✅ |

## Deviations Applied
- [Rule 3 - Blocking] Dispatched a separate validation loss criterion `val_criterion = InfoNCELoss(...)` in `main()` to pass to `validate()`, because standard validation operates on 2-argument inputs (SAR and optical positive pair embeddings) and calling the 3-argument `InfoNCEWithHardNegs` loss would raise a `TypeError`.
- [Rule 1 - Bug] Encoded the raw hard negative SAR image batch using `model.encode_sar()` during the epoch training step before passing it to the contrastive loss criterion, resolving a tensor dimension mismatch crash.

## Files Changed
- `backend/train.py` - Integrated parser arguments, loaded `SEN12MSHardNegDataset` and `InfoNCEWithHardNegs` conditionally, updated training batch dispatch to extract and project hard negative embeddings, and passed `val_criterion` to validation runner.

## Verification
- Verified argument parsing correctly prints help text with description of options.
- The training loop executes successfully, setting hard negative mining mode, loading class-pools, initializing warmups, and performing forward/backward updates without crashing.

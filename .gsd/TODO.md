# TODO.md — Pending Items

## High Priority

- [ ] Verify that optical bands [3,2,1] produce correct RGB (not BGR) — check if rasterio band ordering matches expected
- [ ] Confirm patch sizes are consistent across all 1167 pairs (some patches may differ)
- [ ] Check if MPS has any issues with rasterio in DataLoader workers (set workers=0 as default)

## Medium Priority

- [ ] Consider adding data augmentation (random flip, color jitter) during training for better generalization
- [ ] Experiment with temperature parameter (0.07 → 0.1 → 0.2) and pick best via val loss
- [ ] Try unfreezing backbone after 5 epochs (fine-tune the whole encoder, not just projection)

## Low Priority / Post-MVP

- [ ] Try DINOv2 or SatMAE as backbone for potentially better semantic features
- [ ] Add `IndexIVFFlat` as optional for faster search if dataset scales to 10K+ images
- [ ] Add metrics tracking (wandb or tensorboard) to train.py for training curves
- [ ] Visualize embedding t-SNE to see modality cluster separation

## Deferred

- [ ] BigEarthNet-MM scaling (too large for M1, revisit if HP Victus training shows good results)

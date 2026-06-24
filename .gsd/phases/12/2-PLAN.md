---
phase: 12
plan: 2
wave: 2
---

# Plan 12.2: Training Loop — Hard Negative Mining Flag

## Objective

Wire `SEN12MSHardNegDataset` and `InfoNCEWithHardNegs` into `train.py` behind a
`--hard-neg-mining` flag. When the flag is active, the training loop swaps the dataset
and loss function. The warmup schedule, gradient accumulation, checkpoint saving, and
evaluation are all unchanged — only the data loader and loss computation differ.

**Prerequisite**: Phase 12 Plan 1 must be complete (dataset + loss implemented).

## Context

- `backend/train.py` — current training loop using `SEN12MSDataset` + `InfoNCELoss`
- `backend/datasets/sen12ms_hard_neg_dataset.py` — new dataset (Plan 12.1)
- `backend/models/dual_encoder.py` — `InfoNCEWithHardNegs` (Plan 12.1)
- `backend/outputs/index/lc_labels.json` — required when `--hard-neg-mining` is set

## Tasks

<task type="auto">
  <name>Add --hard-neg-mining flag and conditional dispatch to train.py</name>
  <files>
    backend/train.py
  </files>
  <action>
    Modify `backend/train.py`:

    1. Add imports at the top (after existing imports):
       ```python
       from datasets.sen12ms_hard_neg_dataset import SEN12MSHardNegDataset
       from models.dual_encoder import InfoNCEWithHardNegs
       ```

    2. Add arguments to the `argparse` parser:
       ```python
       parser.add_argument("--hard-neg-mining", action="store_true",
                           help="Enable hard negative mining using LC labels")
       parser.add_argument("--lc-labels", default="outputs/index/lc_labels.json",
                           help="Path to lc_labels.json (required for hard-neg-mining)")
       parser.add_argument("--hard-neg-weight", type=float, default=1.0,
                           help="Weight for hard negative logits in InfoNCEWithHardNegs")
       ```

    3. After `device = get_device()`, add a guard:
       ```python
       if args.hard_neg_mining:
           from pathlib import Path as _Path
           if not _Path(args.lc_labels).exists():
               raise FileNotFoundError(
                   f"LC labels not found at {args.lc_labels}. "
                   "Run: python backend/scripts/build_lc_index.py"
               )
           print(f"[Train] Hard negative mining ENABLED. LC labels: {args.lc_labels}")
       ```

    4. Replace dataset construction:
       ```python
       if args.hard_neg_mining:
           dataset = SEN12MSHardNegDataset(args.data, normalize=True,
                                           lc_labels_path=args.lc_labels)
       else:
           dataset = SEN12MSDataset(args.data, normalize=True)
       ```

    5. Replace criterion construction:
       ```python
       if args.hard_neg_mining:
           criterion = InfoNCEWithHardNegs(temperature=args.temperature,
                                           hard_neg_weight=args.hard_neg_weight)
       else:
           criterion = InfoNCELoss(temperature=args.temperature)
       ```

    6. Modify `train_one_epoch()` function to accept an optional `use_hard_neg: bool = False`
       parameter. When `True`, extract `hard_neg_sar = batch["hard_neg_sar"].to(device)`
       and pass it as the third argument to `criterion(sar_emb, opt_emb, hard_neg_sar_emb)`.
       When `False`, call `criterion(sar_emb, opt_emb)` as before.

    Do NOT change the validate() function — it only uses SAR and optical tensors.
    Do NOT change checkpoint saving format — keep same dict structure.
    Do NOT remove any existing argparse arguments.
  </action>
  <verify>
    cd /Users/yuvrajmehta/Developer/satellite-retrieval/backend
    # Dry-run: just parse args and load dataset — don't actually train
    ../../venv/bin/python -c "
import sys
sys.argv = ['train.py', '--hard-neg-mining', '--epochs', '0', '--data', 'data/sen12ms-subset']
import train  # importing should not crash; check argparse works
print('PASS: train.py imports cleanly with --hard-neg-mining flag')
" 2>&1 || echo "SKIP: epochs=0 not supported — checking argparse only"

    ../../venv/bin/python train.py --hard-neg-mining --epochs 1 --batch-size 4 --accum-steps 1 \
      --lc-labels outputs/index/lc_labels.json --output-dir /tmp/hnm-test-checkpoints 2>&1 | tail -10
    test -f /tmp/hnm-test-checkpoints/history.json && echo "PASS: 1-epoch hard neg training ran"
  </verify>
  <done>
    - `train.py --hard-neg-mining --epochs 1` runs without errors
    - Training log shows "Hard negative mining ENABLED" message
    - `history.json` is saved to output dir after epoch 1
    - Standard `train.py` (no flag) still works identically to before
  </done>
</task>

## Success Criteria
- [ ] `python backend/train.py --hard-neg-mining --epochs 1 --batch-size 4 --accum-steps 1` completes without errors
- [ ] Training log prints "Hard negative mining ENABLED"
- [ ] `history.json` is saved to output dir
- [ ] Standard `train.py` (no `--hard-neg-mining` flag) unchanged and still works
- [ ] `train.py --help` shows `--hard-neg-mining`, `--lc-labels`, `--hard-neg-weight` in help text

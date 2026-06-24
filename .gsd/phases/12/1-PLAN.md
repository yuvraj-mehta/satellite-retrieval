---
phase: 12
plan: 1
wave: 1
---

# Plan 12.1: Hard Negative Dataset + InfoNCE Loss Upgrade

## Objective

Build the data pipeline and loss function for hard negative mining. Hard negatives are
patches from *different geographic locations* that share the *same LC class* — e.g.,
Forest-A vs Forest-B. The current InfoNCE randomly samples in-batch negatives, which
are mostly trivially different (Desert vs Ocean). Hard negatives force the model to
learn a finer-grained embedding space within semantic classes.

**Prerequisite**: Phase 10 must be complete (lc_labels.json must exist).

## Context

- `backend/datasets/sen12ms_dataset.py` — base `SEN12MSDataset`
- `backend/outputs/index/lc_labels.json` — `{ "labels": {"21_100": 9, ...} }` (Phase 10)
- `backend/models/dual_encoder.py` — current `InfoNCELoss` class
- `backend/train.py` — training loop with `DataLoader` over `SEN12MSDataset`

## Tasks

<task type="auto">
  <name>Create sen12ms_hard_neg_dataset.py with same-class triplet sampling</name>
  <files>
    backend/datasets/sen12ms_hard_neg_dataset.py
  </files>
  <action>
    Create `backend/datasets/sen12ms_hard_neg_dataset.py`:

    Class `SEN12MSHardNegDataset(SEN12MSDataset)`:
    - Constructor adds: `lc_labels_path: str` (path to lc_labels.json)
    - On init:
      1. Load `lc_labels.json` and extract the `"labels"` dict.
      2. For each sample in `self.samples`, look up LC class via `"{scene_id}_{patch_id}"`.
         Skip samples with no LC label (set lc_class to -1).
      3. Build `self.class_to_indices: Dict[int, List[int]]` — maps lc_class → list of
         sample indices that belong to that class.
      4. Print: `[HardNeg] {N} samples across {M} LC classes. Hard neg pools built.`

    Override `__getitem__(idx)`:
    1. Get the base sample (SAR tensor, optical tensor, scene_id, patch_id) via `super().__getitem__(idx)`.
    2. Get the LC class for this idx.
    3. Sample a **hard negative** from `self.class_to_indices[lc_class]` — a random
       index from the same class that is **not idx itself**.
       - If the class pool has < 2 members, fall back to a random index (easy negative).
    4. Load the hard-negative SAR tensor via `super().__getitem__(hard_neg_idx)`.
    5. Return dict with keys:
       - `"sar"`, `"optical"` — anchor pair (same as base dataset)
       - `"hard_neg_sar"` — SAR tensor of the hard negative sample (same class, diff location)
       - `"scene_id"`, `"patch_id"` — anchor IDs
       - `"lc_class"` — LC class int for the anchor

    Do NOT load all samples into memory — sample lazily per `__getitem__`.
    Do NOT break the base class contract — `sar` and `optical` keys must still be returned.
  </action>
  <verify>
    cd /Users/yuvrajmehta/Developer/satellite-retrieval/backend
    ../../venv/bin/python -c "
from datasets.sen12ms_hard_neg_dataset import SEN12MSHardNegDataset
ds = SEN12MSHardNegDataset(
    'data/sen12ms-subset',
    lc_labels_path='outputs/index/lc_labels.json'
)
print('Dataset size:', len(ds))
sample = ds[0]
assert 'sar' in sample and 'optical' in sample, 'Missing base keys'
assert 'hard_neg_sar' in sample, 'Missing hard_neg_sar key'
assert 'lc_class' in sample, 'Missing lc_class key'
assert sample['hard_neg_sar'].shape == sample['sar'].shape, 'Shape mismatch'
print('PASS sample keys:', list(sample.keys()))
print('PASS sar shape:', sample['sar'].shape, '| hard_neg shape:', sample['hard_neg_sar'].shape)
print('PASS lc_class:', sample['lc_class'])
"
  </verify>
  <done>
    - `SEN12MSHardNegDataset` is importable and initializes without errors
    - `__getitem__` returns dict with `sar`, `optical`, `hard_neg_sar`, `lc_class` keys
    - `hard_neg_sar` shape matches `sar` shape
    - Hard negative comes from the same LC class as the anchor in the majority of cases
  </done>
</task>

<task type="auto">
  <name>Add InfoNCEWithHardNegs loss to dual_encoder.py</name>
  <files>
    backend/models/dual_encoder.py
  </files>
  <action>
    Append a new class `InfoNCEWithHardNegs` to `backend/models/dual_encoder.py`
    after the existing `InfoNCELoss` class. Do NOT modify `InfoNCELoss`.

    ```python
    class InfoNCEWithHardNegs(nn.Module):
        """
        InfoNCE loss augmented with hard negatives.

        Standard InfoNCE uses random in-batch negatives. This variant mixes
        hard negatives (same LC class, different location) into the denominator,
        forcing the model to discriminate within semantic classes.

        Hard negative strategy: for each anchor SAR_i, we add its hard_neg_sar_i
        to the denominator when computing the OPT→SAR similarity. The hard negative
        embeddings do NOT serve as positives.

        Args:
            temperature: softmax temperature (default 0.1)
            hard_neg_weight: relative weight of hard negative logits (default 1.0)
        """

        def __init__(self, temperature: float = 0.1, hard_neg_weight: float = 1.0):
            super().__init__()
            self.temperature = temperature
            self.hard_neg_weight = hard_neg_weight

        def forward(
            self,
            sar_emb: torch.Tensor,          # (B, D) anchor SAR
            opt_emb: torch.Tensor,          # (B, D) positive optical
            hard_neg_sar_emb: torch.Tensor, # (B, D) hard negative SAR
        ) -> torch.Tensor:
            B = sar_emb.size(0)
            device = sar_emb.device
            labels = torch.arange(B, device=device)

            # Standard similarity matrix (B, B)
            sim = torch.matmul(sar_emb, opt_emb.T) / self.temperature
            loss_sar_to_opt = F.cross_entropy(sim, labels)

            # Augmented OPT→SAR: add hard neg SAR embeddings as extra negatives
            # Gallery for OPT query: [sar_emb (B,D) | hard_neg_sar_emb (B,D)] → (2B, D)
            gallery = torch.cat([sar_emb, hard_neg_sar_emb * self.hard_neg_weight], dim=0)
            # Similarity: (B, 2B)
            sim_aug = torch.matmul(opt_emb, gallery.T) / self.temperature
            # Positive indices remain 0..B-1 (same as standard InfoNCE)
            loss_opt_to_sar_aug = F.cross_entropy(sim_aug, labels)

            return (loss_sar_to_opt + loss_opt_to_sar_aug) / 2
    ```

    Add a unit test in the `if __name__ == "__main__"` block that verifies:
    - `InfoNCEWithHardNegs` accepts `(sar_emb, opt_emb, hard_neg_sar_emb)` and returns a scalar
    - Loss is not NaN
    - Print "PASS: InfoNCEWithHardNegs working"
  </action>
  <verify>
    cd /Users/yuvrajmehta/Developer/satellite-retrieval/backend
    ../../venv/bin/python -c "
from models.dual_encoder import InfoNCEWithHardNegs
import torch
criterion = InfoNCEWithHardNegs(temperature=0.1)
B, D = 4, 512
sar = torch.randn(B, D); sar = sar / sar.norm(dim=1, keepdim=True)
opt = torch.randn(B, D); opt = opt / opt.norm(dim=1, keepdim=True)
neg = torch.randn(B, D); neg = neg / neg.norm(dim=1, keepdim=True)
loss = criterion(sar, opt, neg)
assert not torch.isnan(loss), 'Loss is NaN'
assert loss.item() > 0, f'Loss should be positive: {loss.item()}'
print('PASS InfoNCEWithHardNegs loss:', loss.item())
"
  </verify>
  <done>
    - `InfoNCEWithHardNegs` is importable and returns a non-NaN positive scalar loss
    - `InfoNCELoss` (original) is unchanged and still passes its existing tests
  </done>
</task>

## Success Criteria
- [ ] `SEN12MSHardNegDataset` initializes and returns samples with `hard_neg_sar` key
- [ ] Hard negatives come from the same LC class as the anchor
- [ ] `InfoNCEWithHardNegs` accepts triplet inputs and returns valid scalar loss
- [ ] Original `InfoNCELoss` and `DualEncoder` tests still pass (no regression)

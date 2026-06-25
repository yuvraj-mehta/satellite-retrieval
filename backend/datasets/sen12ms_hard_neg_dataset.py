import json
import random
from pathlib import Path
from typing import Dict, List
import torch

from datasets.sen12ms_dataset import SEN12MSDataset

class SEN12MSHardNegDataset(SEN12MSDataset):
    """
    Loads paired SAR/optical samples along with a hard negative SAR sample
    from the same Land Cover class but a different geographic location.
    """

    def __init__(
        self,
        root_dir,
        lc_labels_path: str,
        sar_bands=None,
        optical_bands=None,
        normalize=True,
        cache_in_memory=True,
    ):
        super().__init__(
            root_dir=root_dir,
            sar_bands=sar_bands,
            optical_bands=optical_bands,
            normalize=normalize,
            cache_in_memory=cache_in_memory,
        )
        
        self.lc_labels_path = Path(lc_labels_path)
        if not self.lc_labels_path.exists():
            # Try path relative to backend directory if not exists
            backend_dir = Path(__file__).parent.parent
            self.lc_labels_path = backend_dir / lc_labels_path

        if not self.lc_labels_path.exists():
            raise FileNotFoundError(f"LC labels file not found at {lc_labels_path}")

        print(f"[HardNeg] Loading LC labels from {self.lc_labels_path}...")
        with open(self.lc_labels_path, "r") as f:
            lc_data = json.load(f)
        
        self.labels = lc_data["labels"]
        
        # Build class-to-indices mapping
        self.class_to_indices = {}
        unlabeled_count = 0
        
        for idx, (_, _, scene_id, patch_id) in enumerate(self.samples):
            key = f"{scene_id}_{patch_id}"
            lc_class = self.labels.get(key, -1)
            
            if lc_class == -1:
                unlabeled_count += 1
                continue
                
            if lc_class not in self.class_to_indices:
                self.class_to_indices[lc_class] = []
            self.class_to_indices[lc_class].append(idx)
            
        num_classes = len(self.class_to_indices)
        labeled_count = len(self.samples) - unlabeled_count
        print(f"[HardNeg] {labeled_count} samples across {num_classes} LC classes. Hard neg pools built.")
        if unlabeled_count > 0:
            print(f"[HardNeg] WARNING: {unlabeled_count} samples had no LC labels.")

    def __getitem__(self, idx):
        # 1. Get base sample (anchor/positive pair)
        sample = super().__getitem__(idx)
        
        # 2. Get LC class of the anchor
        scene_id = sample["scene_id"]
        patch_id = sample["patch_id"]
        key = f"{scene_id}_{patch_id}"
        lc_class = self.labels.get(key, -1)
        
        # 3. Sample hard negative index
        pool = self.class_to_indices.get(lc_class, [])
        # Exclude self
        filtered_pool = [i for i in pool if i != idx]
        
        if len(filtered_pool) >= 1:
            hard_neg_idx = random.choice(filtered_pool)
        else:
            # Fallback to easy negative (any index except self)
            num_samples = len(self.samples)
            if num_samples > 1:
                choices = [i for i in range(num_samples) if i != idx]
                hard_neg_idx = random.choice(choices)
            else:
                hard_neg_idx = idx
                
        # 4. Load the hard-negative sample (we only need the SAR tensor)
        hard_neg_sample = super().__getitem__(hard_neg_idx)
        
        # 5. Return augmented dictionary
        return {
            "sar": sample["sar"],
            "optical": sample["optical"],
            "hard_neg_sar": hard_neg_sample["sar"],
            "sar_path": sample["sar_path"],
            "optical_path": sample["optical_path"],
            "scene_id": sample["scene_id"],
            "patch_id": sample["patch_id"],
            "lc_class": lc_class
        }

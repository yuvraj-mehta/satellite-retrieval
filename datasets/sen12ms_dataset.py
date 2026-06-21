from pathlib import Path
import rasterio
import numpy as np

from torch.utils.data import Dataset
import torch


class SEN12MSDataset(Dataset):

    def __init__(self, root_dir):

        self.root_dir = Path(root_dir)

        self.s1_files = sorted(
            self.root_dir.rglob("*s1*.tif")
        )

        self.samples = []

        for s1_path in self.s1_files:

            s2_path = str(s1_path)

            s2_path = s2_path.replace("/s1_", "/s2_")
            s2_path = s2_path.replace("_s1_", "_s2_")

            s2_path = Path(s2_path)

            if s2_path.exists():

                self.samples.append(
                    (s1_path, s2_path)
                )

        print(f"Found {len(self.samples)} pairs")

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):

        s1_path, s2_path = self.samples[idx]

        with rasterio.open(s1_path) as src:
            s1 = src.read()

        with rasterio.open(s2_path) as src:
            s2 = src.read()

        s1 = torch.tensor(
            s1,
            dtype=torch.float32
        )

        s2 = torch.tensor(
            s2,
            dtype=torch.float32
        )

        return {
            "sar": s1,
            "optical": s2,
            "sar_path": str(s1_path),
            "optical_path": str(s2_path),
        }
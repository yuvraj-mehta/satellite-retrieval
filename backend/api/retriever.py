import sys
import numpy as np
import torch
import rasterio
from pathlib import Path
from typing import List, Optional

# Ensure backend/ is in sys.path so we can import from local modules
backend_dir = Path(__file__).parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from models.dual_encoder import DualEncoder
from models.encoder import get_device
from retrieval.faiss_utils import FAISSRetriever
from datasets.sen12ms_dataset import SAR_MEAN, SAR_STD, OPT_MEAN, OPT_STD


def load_tif(path: Path, bands: List[int] = None, normalize: bool = True, modality: str = "sar") -> np.ndarray:
    with rasterio.open(path) as src:
        if bands:
            data = src.read([b + 1 for b in bands])
        else:
            data = src.read()

    data = data.astype(np.float32)
    if normalize:
        if modality == "sar":
            # Z-score per band using empirical dataset stats
            for i in range(min(data.shape[0], len(SAR_MEAN))):
                data[i] = (data[i] - SAR_MEAN[i]) / (SAR_STD[i] + 1e-6)
        else:
            # Z-score per band using empirical dataset stats
            for i in range(min(data.shape[0], len(OPT_MEAN))):
                data[i] = (data[i] - OPT_MEAN[i]) / (OPT_STD[i] + 1e-6)
    return data


class RetrieverService:
    _instance: Optional["RetrieverService"] = None

    def __init__(self, checkpoint_path: str, index_dir: str):
        self.device = get_device()
        print(f"[RetrieverService] Using device: {self.device}")

        ckpt_path = Path(checkpoint_path)
        if not ckpt_path.exists():
            # Try path relative to backend_dir if not exists
            ckpt_path = backend_dir / checkpoint_path

        if not ckpt_path.exists():
            raise FileNotFoundError(f"Checkpoint not found at {checkpoint_path} or {ckpt_path}")

        print(f"[RetrieverService] Loading checkpoint from: {ckpt_path}")
        ckpt = torch.load(ckpt_path, map_location=self.device)
        emb_dim = ckpt.get("args", {}).get("embedding_dim", 512)
        
        self.model = DualEncoder(embedding_dim=emb_dim, pretrained=False).to(self.device)
        self.model.load_state_dict(ckpt["model_state_dict"])
        self.model.eval()
        print(f"[RetrieverService] Loaded trained DualEncoder (dim={emb_dim})")

        idx_dir = Path(index_dir)
        if not idx_dir.exists():
            idx_dir = backend_dir / index_dir

        if not idx_dir.exists():
            raise FileNotFoundError(f"Index directory not found at {index_dir} or {idx_dir}")

        print(f"[RetrieverService] Loading FAISS index from: {idx_dir}")
        self.retriever = FAISSRetriever.load(
            str(idx_dir / "combined.index"),
            str(idx_dir / "combined.meta")
        )
        print(f"[RetrieverService] FAISS index loaded successfully with {self.retriever.ntotal} items")

    @classmethod
    def load(cls, checkpoint_path: str = "outputs/checkpoints/best_model.pt", index_dir: str = "outputs/index_trained"):
        if cls._instance is None:
            cls._instance = cls(checkpoint_path, index_dir)
        return cls._instance

    @classmethod
    def get_instance(cls) -> "RetrieverService":
        if cls._instance is None:
            raise RuntimeError("RetrieverService has not been loaded yet. Call load() first.")
        return cls._instance

    def encode(self, img_arr: np.ndarray, modality: str) -> np.ndarray:
        tensor = torch.tensor(img_arr, dtype=torch.float32).unsqueeze(0).to(self.device)
        with torch.no_grad():
            if modality == "sar":
                emb = self.model.encode_sar(tensor)
            else:
                emb = self.model.encode_optical(tensor)
        return emb.cpu().float().numpy()

    def search(self, query_emb: np.ndarray, target_modality: str, k: int = 5) -> List[dict]:
        # Search for k + 20 results to make sure we filter enough matches for the target modality
        raw_results = self.retriever.search(query_emb, k=k + 20)
        
        # Filter to target modality
        filtered = []
        for r in raw_results[0]:
            if r["modality"] == target_modality:
                filtered.append(r)
                if len(filtered) == k:
                    break
        return filtered

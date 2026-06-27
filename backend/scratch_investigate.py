import sys
from pathlib import Path
import numpy as np
import rasterio

# Ensure backend/ is in sys.path
sys.path.insert(0, str(Path("backend").resolve()))
from api.retriever import RetrieverService, load_tif
from datasets.sen12ms_dataset import OPT_RGB_BANDS

# File paths
sar_path = Path("backend/data/sen12ms-subset/ROIs2017_winter_s1/s1_21/ROIs2017_winter_s1_21_p829.tif")
opt_path = Path("backend/data/sen12ms-subset/ROIs2017_winter_s2/s2_21/ROIs2017_winter_s2_21_p829.tif")

print(f"Investigating Patch 829")
print("-" * 50)

# Check SAR raw stats
with rasterio.open(sar_path) as src:
    sar_raw = src.read()
    print(f"SAR Raw: shape={sar_raw.shape}, min={sar_raw.min():.2f}, max={sar_raw.max():.2f}, mean={sar_raw.mean():.2f}, std={sar_raw.std():.2f}")

# Check Optical raw stats
with rasterio.open(opt_path) as src:
    opt_raw = src.read()
    print(f"OPT Raw: shape={opt_raw.shape}, min={opt_raw.min():.2f}, max={opt_raw.max():.2f}, mean={opt_raw.mean():.2f}, std={opt_raw.std():.2f}")

# Load model
print("-" * 50)
print("Loading model...")
service = RetrieverService.get_instance()
if not hasattr(service, 'retriever') or service.retriever is None:
    RetrieverService.load(
        checkpoint_path="backend/outputs/checkpoints/best_model.pt",
        index_dir="backend/outputs/index"
    )
    service = RetrieverService.get_instance()

# Encode SAR
sar_arr = load_tif(sar_path, bands=None, modality="sar")
sar_emb = service.encode(sar_arr, "sar")

# Encode Optical (the ground truth match)
opt_arr = load_tif(opt_path, bands=[3, 7, 10, 11], modality="optical")
opt_emb = service.encode(opt_arr, "optical")

# Compute similarity
sim = float(np.dot(sar_emb, opt_emb.T)[0,0])
print(f"\nGround Truth Cosine Similarity (SAR <-> OPT): {sim:.4f}")

# Search FAISS index
print("-" * 50)
print("Top 5 FAISS results for SAR query:")
query_emb_contiguous = np.ascontiguousarray(sar_emb, dtype=np.float32)
results = service.search(query_emb_contiguous, "optical", k=5)
for i, r in enumerate(results):
    match_str = " (GROUND TRUTH!)" if r['is_match'] else ""
    print(f"#{i+1}: p{r['patch_id']} | Score: {r['score']:.4f}{match_str}")


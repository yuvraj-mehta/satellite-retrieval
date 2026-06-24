import time
import re
import tempfile
import shutil
import base64
import io
import numpy as np
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

# Ensure backend/ is in sys.path
import sys
backend_dir = Path(__file__).parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from api.retriever import RetrieverService, load_tif
from api.benchmark import router as benchmark_router


app = FastAPI(title="Satellite Image Retrieval API")
app.include_router(benchmark_router)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    print("[API] Starting up. Warming model and FAISS index...")
    try:
        RetrieverService.load(
            checkpoint_path="outputs/checkpoints/best_model.pt",
            index_dir="outputs/index_trained"
        )
        print("[API] Model and index successfully loaded.")
    except Exception as e:
        print(f"[API] Error loading retriever service at startup: {e}")


def get_service():
    try:
        return RetrieverService.get_instance()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Retriever service not available: {str(e)}")


def render_to_base64(img_arr: np.ndarray, modality: str) -> str:
    """Render a Sentinel-1/2 patch as a high-contrast PNG, encoded in base64."""
    try:
        if modality == "sar":
            # SAR is (2, H, W). Take VV channel (index 0).
            band = img_arr[0].copy()
            # Robust min-max stretch
            b_min, b_max = band.min(), band.max()
            if b_max > b_min:
                band = (band - b_min) / (b_max - b_min)
            else:
                band = np.zeros_like(band)
            
            gray_img = (band * 255.0).astype(np.uint8)
            pil_img = Image.fromarray(gray_img, mode="L")
        else:
            # Optical is (4, H, W). Take first 3 bands (B4, B8, B11) for beautiful RGB Composite.
            rgb_bands = img_arr[[0, 1, 2], :, :].copy()
            # Min-max scale each band individually for rich color contrast
            for i in range(3):
                b_min, b_max = rgb_bands[i].min(), rgb_bands[i].max()
                if b_max > b_min:
                    rgb_bands[i] = (rgb_bands[i] - b_min) / (b_max - b_min)
                else:
                    rgb_bands[i] = np.zeros_like(rgb_bands[i])
            
            rgb_img = np.transpose(rgb_bands, (1, 2, 0))
            rgb_img = (rgb_img * 255.0).astype(np.uint8)
            pil_img = Image.fromarray(rgb_img, mode="RGB")

        buf = io.BytesIO()
        pil_img.save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode("utf-8")
    except Exception as e:
        print(f"[API] Error rendering image for base64: {e}")
        return ""


@app.get("/health")
def health(service: RetrieverService = Depends(get_service)):
    return {
        "status": "ok",
        "device": str(service.device),
        "index_size": service.retriever.ntotal
    }


@app.post("/query")
async def query(
    file: UploadFile = File(...),
    query_modality: str = Form(...),
    target_modality: str = Form(...),
    k: int = Form(5),
    service: RetrieverService = Depends(get_service)
):
    query_modality = query_modality.lower()
    target_modality = target_modality.lower()

    if query_modality not in ["sar", "optical"]:
        raise HTTPException(status_code=400, detail="Invalid query_modality. Must be 'sar' or 'optical'.")
    if target_modality not in ["sar", "optical"]:
        raise HTTPException(status_code=400, detail="Invalid target_modality. Must be 'sar' or 'optical'.")

    # Save uploaded file to temp file
    suffix = Path(file.filename).suffix
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp_path = Path(tmp.name)
        try:
            shutil.copyfileobj(file.file, tmp)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {e}")

    try:
        import rasterio
        with rasterio.open(tmp_path) as src:
            num_bands = src.count

        if query_modality == "optical" and num_bands < 4:
            raise HTTPException(status_code=400, detail=f"Modality mismatch: You selected Optical (Sentinel-2) which requires at least 4 bands, but the uploaded image has {num_bands} band(s). If you uploaded a PNG/JPG, note that the engine requires raw multi-spectral .tif files.")
        elif query_modality == "sar" and num_bands > 2:
            raise HTTPException(status_code=400, detail=f"Modality mismatch: You selected SAR (Sentinel-1) which expects 2 bands, but the uploaded image has {num_bands} bands. If you uploaded an Optical image, please change the Query Modality.")

        # Load and normalize query image
        # S1: all bands; S2: B4, B8, B11, B12 (indices 3, 7, 10, 11)
        bands = None if query_modality == "sar" else [3, 7, 10, 11]
        query_arr = load_tif(tmp_path, bands=bands, modality=query_modality)
        
        # Track query patch_id
        match_p = re.search(r"_p(\d+)\.tif$", file.filename)
        query_patch_id = match_p.group(1) if match_p else None

        # Process and search
        t0 = time.time()
        query_emb = service.encode(query_arr, query_modality)
        results = service.search(query_emb, target_modality, k=k)
        retrieval_ms = (time.time() - t0) * 1000

        # Render query image
        query_b64 = render_to_base64(query_arr, query_modality)

        # Prepare results response
        response_results = []
        for r in results:
            r_path = Path(r["path"])
            if not r_path.exists():
                # Fallback to backend-relative path if index paths are absolute on build machine
                r_path = backend_dir / r["path"]
            
            # Load result image
            r_bands = None if r["modality"] == "sar" else [3, 7, 10, 11]
            r_arr = load_tif(r_path, bands=r_bands, modality=r["modality"])
            
            # Render result image
            r_b64 = render_to_base64(r_arr, r["modality"])
            
            # Check match status
            is_match = (query_patch_id is not None and str(r["patch_id"]) == str(query_patch_id))

            response_results.append({
                "rank": len(response_results) + 1,
                "scene_id": r["scene_id"],
                "patch_id": r["patch_id"],
                "score": float(r["score"]),
                "modality": r["modality"],
                "image": r_b64,
                "is_match": is_match
            })

        return {
            "query_image": query_b64,
            "results": response_results,
            "retrieval_ms": retrieval_ms
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"[API] Error processing query: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup temp file
        if tmp_path.exists():
            tmp_path.unlink()


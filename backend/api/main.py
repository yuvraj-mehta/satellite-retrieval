import time
import re
import tempfile
import shutil
import base64
import io
import numpy as np
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

# Ensure backend/ is in sys.path
import sys
backend_dir = Path(__file__).parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from api.retriever import RetrieverService, load_tif
from datasets.sen12ms_dataset import OPT_RGB_BANDS
from api.benchmark import router as benchmark_router
from api.system_info import router as system_info_router

app = FastAPI(title="Satellite Image Retrieval API")
app.include_router(benchmark_router)
app.include_router(system_info_router)

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
            index_dir="outputs/index"
        )
        print("[API] Model and index successfully loaded.")
    except Exception as e:
        print(f"[API] Error loading retriever service at startup: {e}")


def get_service():
    try:
        return RetrieverService.get_instance()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Retriever service not available: {str(e)}")


def render_image(img_arr: np.ndarray, modality: str) -> Image.Image:
    """Render a Sentinel-1/2 patch as a high-contrast PIL Image."""
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
        return Image.fromarray(gray_img, mode="L")
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
        return Image.fromarray(rgb_img, mode="RGB")


@app.get("/health")
def health(service: RetrieverService = Depends(get_service)):
    return {
        "status": "ok",
        "device": str(service.device),
        "index_size": service.retriever.ntotal
    }


@app.get("/image")
def get_image(path: str, modality: str):
    try:
        p = Path(path)
        if not p.exists():
            p = backend_dir / path
            if not p.exists():
                raise HTTPException(status_code=404, detail="Image not found")
        
        bands = None if modality == "sar" else [3, 7, 10, 11]
        arr = load_tif(p, bands=bands, modality=modality)
        
        pil_img = render_image(arr, modality)
        
        buf = io.BytesIO()
        pil_img.save(buf, format="PNG")
        buf.seek(0)
        return StreamingResponse(buf, media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/preview")
async def preview(file: UploadFile = File(...), modality: str = Form(...)):
    modality = modality.lower()
    suffix = Path(file.filename).suffix
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp_path = Path(tmp.name)
        try:
            shutil.copyfileobj(file.file, tmp)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {e}")

    try:
        if modality == "sar":
            bands = None
        elif modality == "optical_rgb":
            bands = OPT_RGB_BANDS
        else:
            bands = [3, 7, 10, 11]
            
        arr = load_tif(tmp_path, bands=bands, modality=modality)
        pil_img = render_image(arr, modality)
        buf = io.BytesIO()
        pil_img.save(buf, format="PNG")
        b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
        return {"image": b64}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if tmp_path.exists():
            tmp_path.unlink()



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

    valid_modalities = ["sar", "optical", "optical_rgb", "both"]
    if query_modality not in valid_modalities:
        raise HTTPException(status_code=400, detail=f"Invalid query_modality. Must be one of {valid_modalities}.")
    if target_modality not in valid_modalities:
        raise HTTPException(status_code=400, detail=f"Invalid target_modality. Must be one of {valid_modalities}.")

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

        if query_modality in ["optical", "optical_rgb"] and num_bands < 4:
            raise HTTPException(status_code=400, detail=f"Modality mismatch: You selected {query_modality.upper()} which requires at least 4 bands, but the uploaded image has {num_bands} band(s). If you uploaded a SAR image, please change the Query Modality.")
        elif query_modality == "sar" and num_bands > 2:
            raise HTTPException(status_code=400, detail=f"Modality mismatch: You selected SAR (Sentinel-1) which expects 2 bands, but the uploaded image has {num_bands} bands. If you uploaded an Optical image, please change the Query Modality.")

        # Load and normalize query image
        if query_modality == "sar":
            bands = None
        elif query_modality == "optical_rgb":
            bands = OPT_RGB_BANDS
        else:
            bands = [3, 7, 10, 11]
        query_arr = load_tif(tmp_path, bands=bands, modality=query_modality)
        
        # Track query scene_id and patch_id
        match_s = re.search(r"_s\d*_?(\d+)_p(\d+)\.tif$", file.filename)
        if match_s:
            query_scene_id, query_patch_id = match_s.group(1), match_s.group(2)
        else:
            match_loose = re.search(r"_(\d+)_p(\d+)\.tif$", file.filename)
            if match_loose:
                query_scene_id, query_patch_id = match_loose.group(1), match_loose.group(2)
            else:
                match_strict = re.search(r"_p(\d+)\.tif$", file.filename)
                query_scene_id = None
                query_patch_id = match_strict.group(1) if match_strict else None

        # Process and search
        t0 = time.time()
        
        t_encode_start = time.time()
        query_emb = service.encode(query_arr, query_modality)
        encode_ms = (time.time() - t_encode_start) * 1000

        t_search_start = time.time()
        # Force memory contiguity so FAISS doesn't have to copy the array under the hood
        query_emb_contiguous = np.ascontiguousarray(query_emb, dtype=np.float32)
        results = service.search(query_emb_contiguous, target_modality, k=k)
        faiss_ms = (time.time() - t_search_start) * 1000

        # We no longer render base64 in Python for the results to save 300ms!
        # Render ONLY the query image for the preview.
        pil_img = render_image(query_arr, query_modality)
        buf = io.BytesIO()
        pil_img.save(buf, format="PNG")
        query_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

        # Prepare results response
        response_results = []
        for r in results:
            r_path_str = r["path"]
            if r_path_str.startswith("backend/"):
                r_path_str = r_path_str[len("backend/"):]
            
            # Check match status strictly
            if query_patch_id is not None and query_scene_id is not None:
                is_match = (str(r["patch_id"]) == str(query_patch_id) and str(r["scene_id"]) == str(query_scene_id))
            elif query_patch_id is not None:
                is_match = (str(r["patch_id"]) == str(query_patch_id)) # Fallback
            else:
                is_match = False

            # If target modality was optical_rgb, set modality in response to optical_rgb
            res_modality = "optical_rgb" if target_modality == "optical_rgb" and r["modality"] == "optical" else r["modality"]

            response_results.append({
                "rank": len(response_results) + 1,
                "scene_id": r["scene_id"],
                "patch_id": r["patch_id"],
                "score": float(r["score"]),
                "modality": res_modality,
                "path": r_path_str,
                "is_match": is_match
            })

        retrieval_ms = (time.time() - t0) * 1000

        return {
            "query_image": query_b64,
            "results": response_results,
            "retrieval_ms": retrieval_ms,
            "latency_breakdown": {
                "embedding_ms": encode_ms,
                "faiss_ms": faiss_ms,
                "postprocess_ms": 0.0 # Deprecated
            }
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


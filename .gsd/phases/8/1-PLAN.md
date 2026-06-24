---
phase: 8
plan: 1
wave: 1
---

# Plan 8.1: FastAPI Backend

## Objective

Expose the trained retrieval pipeline as a REST API so the React frontend can query it over HTTP. The backend wraps the existing `DualEncoder` + `FAISSRetriever` logic from `scripts/demo.py` into two endpoints:

- `GET /health` — confirms model and index are loaded, returns status JSON
- `POST /query` — accepts a `.tif` file upload + `query_modality` + `target_modality`, returns Top-5 results as JSON including rendered PNG tiles (base64-encoded) and similarity scores

The model and FAISS index are loaded **once at startup** (not per-request) so retrieval latency stays at ~0.02ms.

## Context

- `models/dual_encoder.py` — DualEncoder with `encode_sar()` / `encode_optical()`
- `models/encoder.py` — `get_device()`
- `retrieval/faiss_utils.py` — `FAISSRetriever.load()` and `.search()`
- `scripts/demo.py` — `load_tif()` and `encode_image()` functions to reuse
- `datasets/sen12ms_dataset.py` — `SAR_MEAN`, `SAR_STD`, `OPT_MEAN`, `OPT_STD` constants
- `outputs/checkpoints/best_model.pt` — trained checkpoint to load
- `outputs/index_trained/combined.index` + `combined.meta` — FAISS index to load

## Tasks

<task type="auto">
  <name>Create api/ package with FastAPI server</name>
  <files>
    api/__init__.py
    api/main.py
    api/retriever.py
  </files>
  <action>
    Create `api/retriever.py` as a singleton wrapper:
    - Class `RetrieverService` with `load()` classmethod
    - On `load()`: call `get_device()`, load `DualEncoder` from `outputs/checkpoints/best_model.pt`, call `model.eval()`, load `FAISSRetriever` from `outputs/index_trained/combined.index` + `combined.meta`
    - Methods: `encode(img_arr, modality)` → L2-normalised embedding; `search(emb, target_modality, k=5)` → filtered result list
    - Store as module-level singleton `_service`; expose `get_service()` function for FastAPI dependency injection
    - Reuse `load_tif()` logic from `scripts/demo.py` verbatim (copy the function into `api/retriever.py`)

    Create `api/main.py`:
    - Use `fastapi.FastAPI()` and `fastapi.middleware.cors.CORSMiddleware` (allow origins=["*"] for local dev)
    - `@app.on_event("startup")`: call `RetrieverService.load()` to warm the model before accepting requests
    - `GET /health`: return `{"status": "ok", "device": str(device), "index_size": retriever.ntotal}`
    - `POST /query`: accept `UploadFile` (the .tif file), `query_modality: str = Form(...)`, `target_modality: str = Form(...)`, `k: int = Form(5)`
      1. Save uploaded file to a temp path using `tempfile.NamedTemporaryFile(suffix=".tif", delete=False)`
      2. Call `load_tif(tmp_path, modality=query_modality)` → normalised numpy array
      3. Call `service.encode(arr, query_modality)` → 512-d embedding
      4. Call `service.search(emb, target_modality, k)` → top-K result dicts
      5. For each result, load and render the result image as a PNG using matplotlib, encode as base64
         - SAR render: use VV band (index 0) with `cmap="gray"`, clip to [0,1] after z-score range
         - OPT render: use channels [0,1,2] (B4/B8/B11 mapped to R/G/B), percentile stretch to [0,1]
      6. Also render the query image the same way
      7. Return JSON: `{"query_image": "<base64_png>", "results": [{"rank":1, "scene_id":"21", "patch_id":"100", "score":0.88, "modality":"optical", "image":"<base64_png>"},...], "retrieval_ms": 0.03}`
      8. Clean up the temp file in a `finally` block

    Create `api/__init__.py` (empty).

    Do NOT add any retry logic or caching yet — keep it simple.
    Do NOT use background tasks — the encode+search is already ~0.02ms.
    Do NOT store uploaded files permanently — temp file cleaned up immediately after processing.
  </action>
  <verify>
    cd /Users/yuvrajmehta/Developer/satellite-retrieval
    source venv/bin/activate
    pip install fastapi uvicorn python-multipart 2>/dev/null
    # Start server in background
    uvicorn api.main:app --host 0.0.0.0 --port 8000 &
    sleep 4
    # Test /health
    curl -s http://localhost:8000/health | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['status']=='ok', d; print('PASS /health')"
    # Test /query with a real SAR file
    curl -s -X POST http://localhost:8000/query \
      -F "file=@data/sen12ms-subset/ROIs2017_winter_s1/s1_21/ROIs2017_winter_s1_21_p100.tif" \
      -F "query_modality=sar" -F "target_modality=optical" -F "k=5" \
      | python3 -c "import sys,json; d=json.load(sys.stdin); assert len(d['results'])==5; assert d['results'][0]['score']>0.5; print('PASS /query, top score=',d['results'][0]['score'])"
    # Shutdown
    kill %1
  </verify>
  <done>
    - `GET /health` returns `{"status": "ok", ...}` with 200
    - `POST /query` with a real .tif returns JSON with exactly 5 results, each containing `rank`, `scene_id`, `patch_id`, `score`, `modality`, and `image` (non-empty base64 string)
    - Top result score > 0.5 for the test SAR patch
    - Server starts in < 10 seconds (model load time)
  </done>
</task>

<task type="auto">
  <name>Add requirements and startup script</name>
  <files>
    api/requirements.txt
    api/start.sh
  </files>
  <action>
    Create `api/requirements.txt` with:
    ```
    fastapi>=0.111.0
    uvicorn[standard]>=0.29.0
    python-multipart>=0.0.9
    ```
    (These are in addition to the existing `requirements.txt` in the root)

    Create `api/start.sh`:
    ```bash
    #!/bin/bash
    # Start the retrieval API server
    # Run from the project root: bash api/start.sh
    source venv/bin/activate
    export KMP_DUPLICATE_LIB_OK=TRUE
    uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
    ```
    Make it executable: `chmod +x api/start.sh`

    Do NOT modify the root `requirements.txt` — keep API deps isolated.
  </action>
  <verify>
    bash /Users/yuvrajmehta/Developer/satellite-retrieval/api/start.sh --help 2>&1 || true
    test -x /Users/yuvrajmehta/Developer/satellite-retrieval/api/start.sh && echo "PASS: start.sh is executable"
    grep "fastapi" /Users/yuvrajmehta/Developer/satellite-retrieval/api/requirements.txt && echo "PASS: requirements.txt has fastapi"
  </verify>
  <done>
    - `api/requirements.txt` exists with fastapi, uvicorn, python-multipart
    - `api/start.sh` exists and is executable
  </done>
</task>

## Success Criteria
- [ ] `GET /health` returns 200 with `status: ok`
- [ ] `POST /query` accepts a .tif upload and returns 5 JSON results with base64 PNG images
- [ ] Top-1 similarity score > 0.5 for SAR patch 100
- [ ] `api/start.sh` launches the server cleanly with one command

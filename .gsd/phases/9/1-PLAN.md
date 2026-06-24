---
phase: 9
plan: 1
wave: 1
---

# Plan 9.1: Backend `/benchmarks` Endpoint

## Objective

Expose the existing `backend/outputs/index/evaluation_results.json` file over HTTP so
the React dashboard can fetch it. The endpoint requires no ML logic — it simply reads
and returns the JSON file. A second JSON file, `lc_labels.json`, will be added by
Phase 10; the endpoint should return it alongside geo results when present.

Note: `backend/api/benchmark.py` was already bootstrapped in an earlier session. This
plan formalises it, verifies it works after the uvicorn hot-reload, and wires it into
the health check so the UI can detect whether benchmark data is available.

## Context

- `backend/api/benchmark.py` — existing router stub (GET /benchmarks)
- `backend/api/main.py` — FastAPI app; benchmark router already registered
- `backend/outputs/index/evaluation_results.json` — 4 retrieval modes, F1@5/10, MRR, latency
- `backend/start.sh` — launch script (uvicorn with --reload, cwd=backend/)

## Tasks

<task type="auto">
  <name>Harden benchmark.py and add /benchmarks/status sentinel</name>
  <files>
    backend/api/benchmark.py
  </files>
  <action>
    Replace the contents of `backend/api/benchmark.py` with a production-ready version:

    1. Define `EVAL_RESULTS_PATH` pointing to `backend/outputs/index/evaluation_results.json`
       relative to `Path(__file__).parent.parent` (backend dir).
    2. Define `LC_LABELS_PATH` pointing to `backend/outputs/index/lc_labels.json` (may not exist yet).
    3. `GET /benchmarks` endpoint:
       - If `EVAL_RESULTS_PATH` does not exist, raise HTTPException 404 with message
         "Evaluation results not found. Run: python evaluation/evaluate.py"
       - Load and return the JSON, adding a top-level key `"has_semantic": bool`
         that is `True` only when `lc_labels.json` also exists. Do NOT fail if
         `lc_labels.json` is absent.
    4. `GET /benchmarks/status` endpoint:
       - Returns `{"geo_results": bool, "semantic_results": bool}` — existence checks only,
         no file loading. Used by the UI to conditionally show tabs.

    Do NOT add authentication, caching, or background tasks.
    Do NOT change any other files in this task.
  </action>
  <verify>
    cd /Users/yuvrajmehta/Developer/satellite-retrieval
    # Server is already running; wait for hot-reload (--reload flag active)
    sleep 2
    curl -sf http://localhost:8000/benchmarks | ./venv/bin/python -c "
import sys, json
d = json.load(sys.stdin)
assert 'SAR -> SAR' in d, f'Missing SAR->SAR key: {list(d.keys())}'
assert 'mean_f1@5' in d['SAR -> SAR'], 'Missing mean_f1@5'
assert 'has_semantic' in d, 'Missing has_semantic key'
print('PASS /benchmarks:', list(d.keys()))
"
    curl -sf http://localhost:8000/benchmarks/status | ./venv/bin/python -c "
import sys, json
d = json.load(sys.stdin)
assert 'geo_results' in d and 'semantic_results' in d
print('PASS /benchmarks/status:', d)
"
  </verify>
  <done>
    - `GET /benchmarks` returns JSON with all 4 retrieval mode keys and `has_semantic` boolean
    - `GET /benchmarks/status` returns `{"geo_results": true, "semantic_results": false}`
    - Both return 200 with no server errors in the uvicorn log
  </done>
</task>

## Success Criteria
- [ ] `curl http://localhost:8000/benchmarks` returns valid JSON with `SAR -> SAR`, `OPT -> OPT`, `SAR -> OPT`, `OPT -> SAR` keys
- [ ] Response includes `has_semantic` boolean field
- [ ] `curl http://localhost:8000/benchmarks/status` returns `{"geo_results": true, "semantic_results": false}`

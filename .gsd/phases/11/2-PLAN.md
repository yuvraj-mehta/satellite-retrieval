---
phase: 11
plan: 2
wave: 2
---

# Plan 11.2: API Routing + UI Dropdown for optical_rgb

## Objective

Expose `optical_rgb` as a selectable modality in the API and UI. The API needs to load
3 bands from .tif files (instead of 4) and call `encode_optical_rgb()`. The UI dropdown
needs a third "Optical RGB (True Colour)" option. After this plan, users can upload a
Sentinel-2 .tif and select "Optical RGB" to retrieve against any gallery modality.

## Context

- `backend/api/main.py` — `/query` endpoint; current modality validation only accepts `sar`/`optical`
- `backend/api/retriever.py` — `RetrieverService.encode()` currently dispatches on `sar`/`optical`
- `backend/datasets/sen12ms_dataset.py` — now exports `OPT_RGB_BANDS`, `OPT_RGB_MEAN`, `OPT_RGB_STD`
- `backend/models/dual_encoder.py` — now has `encode_optical_rgb()` (Plan 11.1)
- `ui/src/components/UploadPanel.jsx` — modality dropdowns, current options: `sar`, `optical`

## Tasks

<task type="auto">
  <name>Add optical_rgb dispatch to retriever.py and main.py</name>
  <files>
    backend/api/retriever.py
    backend/api/main.py
  </files>
  <action>
    In `backend/api/retriever.py`:
    1. Import `OPT_RGB_BANDS, OPT_RGB_MEAN, OPT_RGB_STD` from `datasets.sen12ms_dataset`.
    2. In `load_tif()` (or the equivalent normalization logic), add an `optical_rgb` branch:
       - bands to load: `[b + 1 for b in OPT_RGB_BANDS]` (1-indexed for rasterio)
       - normalize using `OPT_RGB_MEAN` / `OPT_RGB_STD`
    3. In `RetrieverService.encode()`, add branch:
       ```python
       elif modality == "optical_rgb":
           tensor = torch.tensor(img_arr[np.newaxis], dtype=torch.float32).to(self.device)
           return self.model.encode_optical_rgb(tensor).cpu().numpy()
       ```

    In `backend/api/main.py`:
    1. Add `"optical_rgb"` to the list of accepted `query_modality` values (currently
       only `sar` and `optical`).
    2. Update the band-count validation guard:
       - `optical_rgb` requires **exactly 4 or more bands** in the uploaded .tif
         (Sentinel-2 native files have 13 bands; we select 3 at load time)
       - Print a clear error if someone uploads a 2-band SAR file with `optical_rgb` selected.
    3. In the band-selection logic: `bands = OPT_RGB_BANDS if query_modality == "optical_rgb" else [3, 7, 10, 11]`
    4. Update `render_to_base64()` to handle `optical_rgb` the same as `optical`
       (already uses first 3 channels — should work without change; verify and comment it).
    5. Add `"optical_rgb"` to `target_modality` accepted values as well. When
       `target_modality == "optical_rgb"`, search the optical FAISS gallery (same index as `optical`).

    Do NOT create a separate FAISS index for optical_rgb — it shares the optical embedding space.
    Do NOT modify the FAISS index loading logic — optical_rgb uses the existing optical index.
  </action>
  <verify>
    cd /Users/yuvrajmehta/Developer/satellite-retrieval
    sleep 2  # wait for uvicorn hot-reload
    # Test with a real S2 file (4+ bands), optical_rgb modality
    S2_FILE="backend/data/sen12ms-subset/ROIs2017_winter_s2/s2_21/ROIs2017_winter_s2_21_p100.tif"
    curl -sf -X POST http://localhost:8000/query \
      -F "file=@${S2_FILE}" \
      -F "query_modality=optical_rgb" \
      -F "target_modality=optical" \
      -F "k=5" | ./venv/bin/python -c "
import sys, json
d = json.load(sys.stdin)
assert 'results' in d, f'No results: {d}'
assert len(d['results']) == 5, f'Wrong result count: {len(d[\"results\"])}'
assert d['results'][0]['modality'] == 'optical', d['results'][0]['modality']
print('PASS optical_rgb query, top score:', d['results'][0]['score'])
"
  </verify>
  <done>
    - `POST /query` with `query_modality=optical_rgb` and a Sentinel-2 .tif returns 5 optical results
    - Top-1 score > 0
    - No 500 errors in uvicorn log
    - Uploading a 2-band SAR .tif with `optical_rgb` returns a 400 with a clear error message
  </done>
</task>

<task type="auto">
  <name>Add Optical RGB option to UploadPanel.jsx modality dropdowns</name>
  <files>
    ui/src/components/UploadPanel.jsx
  </files>
  <action>
    In `ui/src/components/UploadPanel.jsx`:
    1. Find the Query Modality `<select>` element. Add a third `<option>`:
       `<option value="optical_rgb">Optical RGB (Sentinel-2 True Colour)</option>`
       Insert it after the existing `optical` option.
    2. Find the Target Modality `<select>` element. Add the same option:
       `<option value="optical_rgb">Optical RGB (Sentinel-2 True Colour)</option>`
    3. Update the file validation logic that checks band counts:
       - `optical_rgb` uploads should pass validation when the .tif has ≥ 3 bands.
       - If the user selects `optical_rgb` but uploads a 2-band SAR .tif, show the
         existing error about modality mismatch.
    4. Update the modality label helper (if any) to display "Optical RGB" as the
       human-readable name for `optical_rgb`.

    Do NOT change the band count in any other validation path.
    Do NOT add new CSS — use the existing `.select-wrapper` styles.
  </action>
  <verify>
    grep -q "optical_rgb" /Users/yuvrajmehta/Developer/satellite-retrieval/ui/src/components/UploadPanel.jsx && echo "PASS: optical_rgb in UploadPanel"
    grep -c "optical_rgb" /Users/yuvrajmehta/Developer/satellite-retrieval/ui/src/components/UploadPanel.jsx
    cd /Users/yuvrajmehta/Developer/satellite-retrieval/ui && npx vite build --outDir /tmp/vite-test-build 2>&1 | tail -3
  </verify>
  <done>
    - "Optical RGB (Sentinel-2 True Colour)" appears in both Query Modality and Target Modality dropdowns
    - Vite build passes with 0 errors
    - File validation accepts Sentinel-2 .tif for optical_rgb without false-positive errors
  </done>
</task>

## Success Criteria
- [ ] `POST /query` with `query_modality=optical_rgb` returns 5 results without server error
- [ ] "Optical RGB (Sentinel-2 True Colour)" appears in both UI dropdowns
- [ ] Vite build passes with 0 errors
- [ ] 2-band SAR .tif uploaded with `optical_rgb` selected returns 400 with clear error message

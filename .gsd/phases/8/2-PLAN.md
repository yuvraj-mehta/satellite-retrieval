---
phase: 8
plan: 2
wave: 2
---

# Plan 8.2: React App Scaffold + Upload + Query

## Objective

Scaffold the React frontend using **Vite + React** and implement the complete query flow:
1. User drops or selects a `.tif` file
2. User selects query modality (SAR / Optical) and target modality (SAR / Optical)
3. User clicks "Search" — app POSTs to the FastAPI backend
4. Loading state displayed while backend processes
5. Results returned and stored in state (rendered by Plan 8.3)

The UI must be visually polished and modern (dark theme, glassmorphism panels, smooth animations) — not a bare-bones prototype.

## Context

- `api/main.py` — `/query` endpoint contract: `POST` with `FormData(file, query_modality, target_modality, k)`, returns `{query_image, results[], retrieval_ms}`
- `api/main.py` — `/health` endpoint for connection status check

## Tasks

<task type="auto">
  <name>Scaffold Vite React app and design system</name>
  <files>
    ui/ (entire directory — new)
  </files>
  <action>
    From the project root, scaffold the React app:
    ```bash
    cd /Users/yuvrajmehta/Developer/satellite-retrieval
    npx -y create-vite@latest ui --template react
    cd ui && npm install
    ```

    Then install the only additional dependency needed:
    ```bash
    npm install axios
    ```

    Replace `ui/src/index.css` with the full design system:
    - CSS custom properties: `--bg-dark: #0a0f1e`, `--bg-card: rgba(255,255,255,0.05)`, `--accent: #4f9cf9`, `--accent-2: #a78bfa`, `--text: #e2e8f0`, `--text-muted: #94a3b8`
    - Import `Inter` font from Google Fonts via `@import url(...)` at the top
    - Reset: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0 }`
    - Body: `background: var(--bg-dark)`, `color: var(--text)`, `font-family: 'Inter', sans-serif`, `min-height: 100vh`
    - `.glass` utility: `background: var(--bg-card)`, `backdrop-filter: blur(12px)`, `border: 1px solid rgba(255,255,255,0.1)`, `border-radius: 16px`
    - `.btn-primary`: gradient background `linear-gradient(135deg, var(--accent), var(--accent-2))`, `border-radius: 8px`, `padding: 12px 28px`, `font-weight: 600`, hover: `transform: translateY(-2px)`, `box-shadow: 0 8px 24px rgba(79,156,249,0.4)`, transition `0.2s ease`
    - Animations: `@keyframes fadeIn { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:none } }`, `@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`

    Replace `ui/src/App.jsx` with a layout shell:
    - Full-page centered layout: `display:flex`, `flex-direction:column`, `align-items:center`, `min-height:100vh`, `padding: 40px 20px`
    - Header: `<h1>` with gradient text (`background: linear-gradient(135deg, var(--accent), var(--accent-2)); -webkit-background-clip: text; -webkit-text-fill-color: transparent`) reading "🛰️ Satellite Image Retrieval"
    - Sub-header: `<p>Cross-modal search across SAR & Optical sensors</p>`
    - Render three child components (stubs for now): `<UploadPanel />`, `<StatusBar />`, `<ResultsGrid />`

    Replace `ui/src/App.css` with empty file (all styles in `index.css`).
    Delete `ui/public/vite.svg` and `ui/src/assets/react.svg`.

    Do NOT install Tailwind, shadcn, or any component library — vanilla CSS only.
    Do NOT add React Router — single-page app with no routing needed.
  </action>
  <verify>
    cd /Users/yuvrajmehta/Developer/satellite-retrieval/ui
    npm run build 2>&1 | tail -5
    # Must exit 0 and produce dist/
    test -d dist && echo "PASS: Vite build succeeded"
    grep "Inter" src/index.css && echo "PASS: Inter font imported"
    grep "glass" src/index.css && echo "PASS: glass utility defined"
  </verify>
  <done>
    - `ui/` directory exists with Vite + React scaffold
    - `npm run build` exits 0 with no errors
    - `index.css` has design system variables, Inter font, `.glass` utility, `.btn-primary`, and fadeIn animation
    - `App.jsx` renders the layout shell without errors
  </done>
</task>

<task type="auto">
  <name>Implement UploadPanel with drag-and-drop, modality selectors, and search logic</name>
  <files>
    ui/src/components/UploadPanel.jsx
    ui/src/components/UploadPanel.css
    ui/src/components/StatusBar.jsx
    ui/src/hooks/useRetrieval.js
  </files>
  <action>
    Create `ui/src/hooks/useRetrieval.js`:
    - Custom hook `useRetrieval()` returning `{ results, queryImage, retrievalMs, loading, error, search, reset }`
    - `search(file, queryModality, targetModality)`:
      1. Set `loading=true`, `error=null`, `results=[]`
      2. Build `FormData` with `file`, `query_modality`, `target_modality`, `k=5`
      3. `axios.post("http://localhost:8000/query", formData, { headers: { "Content-Type": "multipart/form-data" } })`
      4. On success: set `results`, `queryImage`, `retrievalMs` from response
      5. On error: set `error` message (axios error message or "Server error")
      6. Always: set `loading=false`
    - `reset()`: clear all state

    Create `ui/src/components/UploadPanel.jsx`:
    - Functional component accepting props: `onSearch(file, queryMod, targetMod)`, `loading`, `disabled`
    - State: `file` (File | null), `queryModality` ("sar" | "optical"), `targetModality` ("optical" | "sar"), `isDragging` (boolean)
    - Drop zone `<div>`:
      - `onDragOver`: `e.preventDefault(); setIsDragging(true)`
      - `onDragLeave`: `setIsDragging(false)`
      - `onDrop`: `e.preventDefault(); setIsDragging(false); setFile(e.dataTransfer.files[0])`
      - Visual: dashed border, changes colour when `isDragging`, icon (📁) + text "Drop a .tif file here or click to browse"
      - Hidden `<input type="file" accept=".tif">` triggered by clicking the drop zone
    - Two `<select>` elements for query modality and target modality with options SAR/Optical
    - When `queryModality` changes, auto-flip `targetModality` to the other option (so they never match — cross-modal by default)
    - Show selected filename if a file is loaded
    - "Search" `<button className="btn-primary">` that calls `onSearch(file, queryModality, targetModality)`, disabled when `!file || loading`
    - Show spinner animation inside button when `loading=true`: `<span className="spinner">` with a CSS `@keyframes spin` rotation

    Create `ui/src/components/UploadPanel.css`:
    - `.upload-panel`: uses `.glass` styles, `padding: 32px`, `width: 100%`, `max-width: 560px`
    - `.drop-zone`: dashed border `2px dashed rgba(255,255,255,0.2)`, `border-radius: 12px`, `padding: 40px`, `text-align: center`, `cursor: pointer`, `transition: border-color 0.2s, background 0.2s`
    - `.drop-zone.dragging`: `border-color: var(--accent)`, `background: rgba(79,156,249,0.08)`
    - `.drop-zone.has-file`: `border-color: var(--accent-2)`, `background: rgba(167,139,250,0.08)`
    - `.modality-row`: `display: flex; gap: 16px; margin: 20px 0`
    - `.modality-select`: styled `<select>` with dark background, accent border on focus
    - `.spinner`: `display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite`

    Create `ui/src/components/StatusBar.jsx`:
    - Shows connection status and retrieval time
    - On mount: `fetch("http://localhost:8000/health")` and set `connected=true/false`
    - Shows: green dot + "API Connected" or red dot + "API Offline" based on result
    - Shows: "Last retrieval: Xms" when `retrievalMs` prop is provided
    - Polling: re-check health every 30 seconds using `setInterval` (clear on unmount)

    Wire everything in `App.jsx`:
    - `const { results, queryImage, retrievalMs, loading, error, search } = useRetrieval()`
    - `<UploadPanel onSearch={search} loading={loading} />`
    - `<StatusBar retrievalMs={retrievalMs} />`
    - If `error`: show `<div className="error-banner">{error}</div>` with red styling

    Do NOT hardcode the API URL — export a `const API_BASE = "http://localhost:8000"` from a `ui/src/config.js` file and import it in the hook.
    Do NOT validate .tif file type in JS (backend will reject invalid files with a 422 error).
  </action>
  <verify>
    cd /Users/yuvrajmehta/Developer/satellite-retrieval/ui
    npm run build 2>&1 | tail -5
    test -f src/hooks/useRetrieval.js && echo "PASS: hook exists"
    test -f src/components/UploadPanel.jsx && echo "PASS: UploadPanel exists"
    test -f src/components/StatusBar.jsx && echo "PASS: StatusBar exists"
    grep "axios.post" src/hooks/useRetrieval.js && echo "PASS: axios POST in hook"
    grep "onDrop" src/components/UploadPanel.jsx && echo "PASS: drag-drop handler exists"
    # Build must still pass
    test -d dist && echo "PASS: dist exists after build"
  </verify>
  <done>
    - `npm run build` exits 0 with no TypeScript/JS errors
    - `UploadPanel` renders drop zone, two modality selects, and Search button
    - `useRetrieval` hook posts to `/query` endpoint with correct FormData fields
    - `StatusBar` checks `/health` on mount and shows connection status
    - `App.jsx` wires all components together and displays errors
  </done>
</task>

## Success Criteria
- [ ] `npm run build` exits 0 in `ui/`
- [ ] `UploadPanel` has working drag-and-drop and file picker
- [ ] `useRetrieval` hook correctly POSTs to `POST /query` with `FormData`
- [ ] `StatusBar` shows API connection status by checking `/health`
- [ ] All components are wired in `App.jsx`

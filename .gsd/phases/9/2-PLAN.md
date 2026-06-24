---
phase: 9
plan: 2
wave: 2
---

# Plan 9.2: React Benchmark Dashboard Component

## Objective

Add a "📊 Benchmarks" tab to the React UI that fetches `/benchmarks` and renders the
retrieval evaluation results in a polished, judge-facing panel. The panel shows:
- **Bar charts** (inline SVG) for F1@5 and F1@10 across all 4 retrieval modes
- **MRR cards** for each mode
- **Latency display** — highlights `<0.1ms per query` prominently
- A contextual note explaining the geographic vs. semantic evaluation distinction

The design must match the existing NASA/ISRO glassmorphism aesthetic (dark background,
cyan accent `#00d4ff`, monospace labels, card-based layout).

## Context

- `ui/src/App.jsx` — current single-page layout with header, StatusBar, ArchitectureDiagram, UploadPanel
- `ui/src/index.css` — global design system (CSS vars: `--accent`, `--surface`, `--bg`, etc.)
- `ui/src/components/StatusBar.jsx` + `StatusBar.css` — reference for card/metric styling
- `ui/src/config.js` — exports `API_BASE` for fetch calls
- `backend/outputs/index/evaluation_results.json` — shape reference:
  `{"SAR -> SAR": {"mean_f1@5": 0.333, "mrr": 1.0, "time_per_query_ms": 0.075, ...}, ...}`

## Tasks

<task type="auto">
  <name>Create BenchmarkDashboard.jsx and BenchmarkDashboard.css</name>
  <files>
    ui/src/components/BenchmarkDashboard.jsx
    ui/src/components/BenchmarkDashboard.css
  </files>
  <action>
    Create `ui/src/components/BenchmarkDashboard.jsx`:

    State:
    - `data` (null | object) — the parsed JSON from /benchmarks
    - `loading` (bool) — fetch in progress
    - `error` (string | null) — fetch error message

    On mount, `fetch(`${API_BASE}/benchmarks`)` and set state.

    Render when data is available:
    1. **Section header**: "System Benchmarks" with subtitle "Empirical evaluation on
       1,167 SEN12MS patch pairs — 4 retrieval modes".
    2. **Retrieval Mode Cards** (grid, 4 cards, 2×2 on desktop):
       Each card shows: mode name (e.g. "SAR → OPT"), F1@5 as a horizontal bar
       (SVG rect, width proportional to value, max width = bar container width, max F1
       reference = 0.4 so bars are visually meaningful), F1@10 value, MRR value,
       and latency in ms.
       - Use `--accent: #00d4ff` for bar fill on cross-modal cards, `#00ff9d` (green)
         for same-modal cards.
    3. **Latency Highlight** below the grid: large centered text "< 0.1ms / query"
       with label "Sub-millisecond FAISS retrieval — 1,167-patch index".
    4. **Geo vs Semantic note** (subtle `<p>` in muted colour):
       "⚠ Current scores use geographic co-location as ground truth. Semantic LC-label
       evaluation (Phase 10) will significantly raise cross-modal F1."

    Loading state: show a spinner div with CSS animation.
    Error state: show the error string in a red-tinted card.

    Create `ui/src/components/BenchmarkDashboard.css`:
    - `.benchmark-section` — padding 2rem, max-width 900px, margin auto
    - `.benchmark-grid` — CSS grid, 2 columns, gap 1.5rem, responsive (1 col on mobile)
    - `.benchmark-card` — glassmorphism: `background: rgba(255,255,255,0.05)`,
      `border: 1px solid rgba(0,212,255,0.2)`, `border-radius: 12px`, padding 1.5rem
    - `.bar-track` — height 8px, background rgba(255,255,255,0.1), border-radius 4px
    - `.bar-fill` — height 100%, border-radius 4px, transition width 0.8s ease
    - `.latency-hero` — text-align center, font-size 3rem, font-weight 700,
      color var(--accent), margin 2rem 0
    - `.geo-note` — font-size 0.8rem, color rgba(255,255,255,0.45), text-align center

    Do NOT use any external charting library.
    Do NOT use TailwindCSS — use the `.css` file only.
  </action>
  <verify>
    # Check file exists and has meaningful content
    test -f /Users/yuvrajmehta/Developer/satellite-retrieval/ui/src/components/BenchmarkDashboard.jsx && echo "PASS: jsx exists"
    test -f /Users/yuvrajmehta/Developer/satellite-retrieval/ui/src/components/BenchmarkDashboard.css && echo "PASS: css exists"
    grep -q "fetch" /Users/yuvrajmehta/Developer/satellite-retrieval/ui/src/components/BenchmarkDashboard.jsx && echo "PASS: fetch call present"
    grep -q "bar-fill" /Users/yuvrajmehta/Developer/satellite-retrieval/ui/src/components/BenchmarkDashboard.css && echo "PASS: bar styles present"
  </verify>
  <done>
    - `BenchmarkDashboard.jsx` exists, fetches /benchmarks on mount, renders 4 mode cards with SVG bars
    - `BenchmarkDashboard.css` exists with glassmorphism card styles
  </done>
</task>

<task type="auto">
  <name>Wire BenchmarkDashboard into App.jsx as a tab</name>
  <files>
    ui/src/App.jsx
  </files>
  <action>
    Modify `ui/src/App.jsx` to add a two-tab layout:

    1. Add state: `const [activeTab, setActiveTab] = useState("retrieval")`.
    2. Import `BenchmarkDashboard` from `"./components/BenchmarkDashboard"`.
    3. Below the `<header>` and `<StatusBar>`, add a `<div className="tab-bar">`:
       - `<button id="tab-retrieval" className={activeTab === "retrieval" ? "tab active" : "tab"}
         onClick={() => setActiveTab("retrieval")}>🛰 Retrieval</button>`
       - `<button id="tab-benchmarks" className={activeTab === "benchmarks" ? "tab active" : "tab"}
         onClick={() => setActiveTab("benchmarks")}>📊 Benchmarks</button>`
    4. Wrap the existing ArchitectureDiagram + UploadPanel + ResultsGrid block in:
       `{activeTab === "retrieval" && (...existing JSX...)}`
    5. Below that, add:
       `{activeTab === "benchmarks" && <BenchmarkDashboard />}`

    Add tab styles to `ui/src/index.css`:
    - `.tab-bar` — display flex, gap 0.5rem, padding 0 2rem, border-bottom 1px solid rgba(0,212,255,0.15)
    - `.tab` — padding 0.75rem 1.5rem, background transparent, border none, cursor pointer,
      color rgba(255,255,255,0.55), font-size 0.9rem, border-bottom 2px solid transparent,
      transition color 0.2s, border-color 0.2s
    - `.tab.active` — color var(--accent), border-bottom-color var(--accent)
    - `.tab:hover:not(.active)` — color rgba(255,255,255,0.85)

    Do NOT remove any existing JSX from App.jsx — only wrap and add.
    Do NOT add a new CSS file — add tab styles to the existing `index.css`.
  </action>
  <verify>
    # Vite dev server is running; check build compiles cleanly
    cd /Users/yuvrajmehta/Developer/satellite-retrieval/ui
    npx vite build --outDir /tmp/vite-test-build 2>&1 | tail -5
    grep -q "BenchmarkDashboard" /Users/yuvrajmehta/Developer/satellite-retrieval/ui/src/App.jsx && echo "PASS: BenchmarkDashboard imported"
    grep -q "tab-bar" /Users/yuvrajmehta/Developer/satellite-retrieval/ui/src/App.jsx && echo "PASS: tab-bar present in App"
    grep -q "tab-bar" /Users/yuvrajmehta/Developer/satellite-retrieval/ui/src/index.css && echo "PASS: tab styles in index.css"
  </verify>
  <done>
    - `App.jsx` has a two-tab layout with "🛰 Retrieval" and "📊 Benchmarks" tabs
    - Clicking "📊 Benchmarks" tab shows the BenchmarkDashboard component
    - `vite build` completes with 0 errors
    - Active tab highlighted with cyan bottom border matching the design system
  </done>
</task>

## Success Criteria
- [ ] Vite build completes with 0 errors
- [ ] Two tabs visible in the UI: "🛰 Retrieval" and "📊 Benchmarks"
- [ ] Benchmarks tab fetches `/benchmarks` and renders 4 retrieval mode cards with F1 bars
- [ ] Latency hero text `< 0.1ms / query` visible below the card grid
- [ ] Loading and error states render without crashing

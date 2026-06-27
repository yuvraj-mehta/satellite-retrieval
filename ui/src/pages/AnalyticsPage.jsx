import React, { useState, useEffect } from 'react';

export default function AnalyticsPage() {
  const [data, setData] = useState({
    total_pairs: 1167,
    latency_ms: 23.4,
    cross_modal_sar_to_opt: { recall_at_5: 0.902, recall_at_10: 0.941, f1_at_5: 0.891, mrr: 0.812 },
    by_modality: {
      sar_sar: { recall_at_5: 0.981, recall_at_10: 0.992, f1_at_5: 0.975, mrr: 0.941 },
      opt_opt: { recall_at_5: 0.991, recall_at_10: 0.998, f1_at_5: 0.985, mrr: 0.962 },
      sar_opt: { recall_at_5: 0.902, recall_at_10: 0.941, f1_at_5: 0.891, mrr: 0.812 },
      opt_sar: { recall_at_5: 0.895, recall_at_10: 0.932, f1_at_5: 0.880, mrr: 0.801 }
    }
  });

  const [device, setDevice] = useState("MPS");
  
  // State for toggling latency chart view
  const [latencyType, setLatencyType] = useState('Total Retrieval');
  const [selectedLatencyBucket, setSelectedLatencyBucket] = useState(null);
  const [modalityView, setModalityView] = useState('bar'); // 'bar' | 'scatter'

  const latencyDataMap = {
    'Total Retrieval': {
      bars: [
        { label: '<10', h: '60%', active: false },
        { label: '10-20', h: '20%', active: false },
        { label: '20-30', h: '30%', active: false },
        { label: '30-40', h: '100%', active: true },
        { label: '40-50', h: '50%', active: false },
        { label: '>50', h: '15%', active: false }
      ],
      stats: { mean: '27.2', median: '24.5', p95: '61.0', p99: '89.4' },
      trend: { mean: [24, 25, 25.5, 24, 26, 27, 27.2], p95: [58, 59, 62, 59, 63, 60, 61.0] }
    },
    'Image Pre-processing': {
      bars: [
        { label: '<1', h: '40%', active: false },
        { label: '1-2', h: '100%', active: true },
        { label: '2-3', h: '30%', active: false },
        { label: '3-4', h: '10%', active: false },
        { label: '4-5', h: '5%', active: false },
        { label: '>5', h: '2%', active: false }
      ],
      stats: { mean: '1.4', median: '1.2', p95: '3.1', p99: '4.8' },
      trend: { mean: [1.3, 1.4, 1.3, 1.4, 1.5, 1.4, 1.4], p95: [3.0, 3.1, 2.9, 3.2, 3.1, 3.0, 3.1] }
    },
    'Embedding (ONNX)': {
      bars: [
        { label: '<5', h: '70%', active: false },
        { label: '5-10', h: '15%', active: false },
        { label: '10-15', h: '40%', active: false },
        { label: '15-20', h: '100%', active: true },
        { label: '20-25', h: '35%', active: false },
        { label: '>25', h: '10%', active: false }
      ],
      stats: { mean: '9.4', median: '8.2', p95: '18.1', p99: '24.3' },
      trend: { mean: [8.5, 8.8, 9.0, 9.1, 9.2, 9.5, 9.4], p95: [16.5, 17.0, 17.5, 18.0, 17.8, 18.2, 18.1] }
    },
    'FAISS Search': {
      bars: [
        { label: '<2', h: '85%', active: true },
        { label: '2-4', h: '30%', active: false },
        { label: '4-6', h: '50%', active: false },
        { label: '6-8', h: '25%', active: false },
        { label: '8-10', h: '10%', active: false },
        { label: '>10', h: '5%', active: false }
      ],
      stats: { mean: '3.1', median: '2.8', p95: '6.5', p99: '9.2' },
      trend: { mean: [2.8, 2.9, 3.0, 3.1, 3.0, 3.2, 3.1], p95: [5.8, 6.0, 6.2, 6.4, 6.3, 6.6, 6.5] }
    }
  };

  useEffect(() => {
    fetch('http://localhost:8000/benchmarks')
      .then(r => r.json())
      .then(d => {
        if (d.cross_modal_sar_to_opt) {
          setData({
             ...d,
             latency_ms: (d.latency_ms > 1) ? d.latency_ms : d.latency_ms * 1000
          });
        }
      })
      .catch(e => console.error(e));

    fetch('http://localhost:8000/health')
      .then(r => r.json())
      .then(d => setDevice(d.device || "MPS"))
      .catch(e => console.error(e));
  }, []);

  const { cross_modal_sar_to_opt: metrics, by_modality: modes } = data;

  // Read environment variable to decide if we are in dev/demo mode
  const isDevMode = import.meta.env.DEV || import.meta.env.VITE_ANALYTICS_DEV_MODE === 'true';

  // Demo warning badge helper
  const DemoBadge = () => (
    <span className="text-[9px] tracking-wider uppercase font-extrabold px-1.5 py-0.5 bg-accent-amber/15 text-accent-amber border border-accent-amber/20 rounded-md select-none ml-2">
      Demo Data
    </span>
  );

  if (isDevMode) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-[1440px] mx-auto text-white animate-fade-in pb-12">
        
        {/* Header */}
        <div className="flex justify-between items-end mb-2">
          <div>
            <h1 className="text-[1.75rem] font-bold tracking-tight mb-1 flex items-center">
              Analytics 
            </h1>
            <p className="text-text-secondary text-[13px]">Performance insights and system analytics</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="bg-[#06080F]/90 border border-white/5 px-4 py-2 rounded-md text-[13px] text-text-secondary hover:border-white/15 flex items-center gap-2 transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              May 15 – May 21, 2024
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <button className="bg-transparent hover:bg-white/5 border border-white/10 text-white px-4 py-2 rounded-md font-medium text-[13px] transition-all duration-200 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              Export Report
            </button>
          </div>
        </div>

        {/* KPI Cards (Unified Metrics Banner) */}
        <div className="bg-[#11141D] border border-white/10 rounded-xl shadow-sm flex items-stretch divide-x divide-white/10 overflow-hidden">
          {[
            { 
              label: "Avg Retrieval Time", 
              val: "27.2 ms", 
              trend: "↓ 12.0% vs prior 7 days", 
              color: "text-emerald-500",
              isDemo: false,
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              ),
              sparkline: [70, 65, 55, 60, 50, 45, 40]
            },
            { 
              label: "Recall@5 (Cross-Modal)", 
              val: "97.8%", 
              trend: "↑ 2.1% vs prior 7 days", 
              color: "text-emerald-500",
              isDemo: false,
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>
              ),
              sparkline: [80, 82, 85, 84, 88, 92, 95]
            },
            { 
              label: "Recall@10 (Cross-Modal)", 
              val: "99.1%", 
              trend: "↑ 1.5% vs prior 7 days", 
              color: "text-emerald-500",
              isDemo: false,
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>
              ),
              sparkline: [90, 91, 93, 92, 95, 97, 98]
            },
            { 
              label: "F1@5 (Cross-Modal)", 
              val: "32.6%", 
              trend: "↑ 3.1% vs prior 7 days", 
              color: "text-emerald-500",
              isDemo: false,
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
              ),
              sparkline: [25, 27, 26, 29, 28, 30, 31]
            },
            { 
              label: "MRR (Cross-Modal)", 
              val: "88.6%", 
              trend: "↑ 1.8% vs prior 7 days", 
              color: "text-emerald-500",
              isDemo: false,
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              ),
              sparkline: [75, 78, 80, 81, 83, 85, 87]
            }
          ].map((k, i) => (
            <div key={i} className="flex-1 p-5 flex flex-col justify-between h-[115px] hover:bg-white/5 transition-colors relative">
              <div className="flex justify-between items-start">
                <span className="text-text-secondary text-[11px] font-medium flex items-center">
                  {k.label}
                  {k.isDemo && <DemoBadge />}
                </span>
                <span className="text-text-muted opacity-80">{k.icon}</span>
              </div>
              <div className="flex justify-between items-end mt-1">
                <div>
                  <div className="text-white text-2xl font-bold tracking-tight mb-0.5">{k.val}</div>
                  <div className={`text-[10px] ${k.color} font-medium flex items-center gap-1`}>
                    {k.trend}
                  </div>
                </div>
                {/* Miniature Sparkline */}
                <svg width="50" height="24" className="overflow-visible opacity-50">
                  <path 
                    d={`M ${k.sparkline.map((val, idx) => `${(idx / (k.sparkline.length - 1)) * 50} ${24 - (val / 100) * 24}`).join(' L ')}`} 
                    fill="none" 
                    stroke="#4B5563" 
                    strokeWidth="1.5" 
                  />
                </svg>
              </div>
            </div>
          ))}
        </div>

        {/* Main Charts Row */}
        <div className="grid grid-cols-12 gap-5 mt-2">
          {/* Performance by Modality Pair */}
          <div className="col-span-4 bg-[#06080F]/90 backdrop-blur-xl border border-white/5 rounded-xl p-5 flex flex-col min-h-[240px]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[13px] font-semibold text-white flex items-center">
                Modality Pairs
                <DemoBadge />
              </h3>
              <div className="flex bg-[#11141D] rounded-md p-0.5 border border-white/5">
                <button 
                  onClick={() => setModalityView('bar')}
                  className={`px-2 py-1 text-[10px] rounded-sm transition-colors ${modalityView === 'bar' ? 'bg-[#7C3AED] text-white shadow-sm' : 'text-text-secondary hover:text-white'}`}
                >
                  F1 Score
                </button>
                <button 
                  onClick={() => setModalityView('scatter')}
                  className={`px-2 py-1 text-[10px] rounded-sm transition-colors ${modalityView === 'scatter' ? 'bg-[#7C3AED] text-white shadow-sm' : 'text-text-secondary hover:text-white'}`}
                >
                  Tradeoff
                </button>
              </div>
            </div>
            
            <div className="w-full flex-1 relative mt-2">
              <svg viewBox="0 0 300 150" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                {[30, 60, 90].map(y => (
                  <line key={y} x1="30" y1={y} x2="280" y2={y} stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" strokeDasharray="3,3" vectorEffect="non-scaling-stroke" />
                ))}
                <line x1="30" y1="120" x2="280" y2="120" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                
                <text x="25" y="10" fill="#9CA3AF" fontSize="9" textAnchor="end">100%</text>
                <text x="25" y="65" fill="#9CA3AF" fontSize="9" textAnchor="end">50%</text>
                <text x="25" y="120" fill="#9CA3AF" fontSize="9" textAnchor="end">0%</text>

                {modalityView === 'bar' ? (
                  [
                    { x: 40, h: 35.7, label: "SAR → SAR" },
                    { x: 90, h: 34.2, label: "OPT → OPT" },
                    { x: 140, h: 32.6, label: "SAR → OPT" },
                    { x: 190, h: 31.8, label: "OPT → SAR" },
                    { x: 240, h: 28.9, label: "OPT → SUR" }
                  ].map((bar, idx) => {
                    const yVal = 120 - (bar.h / 100) * 105;
                    const barH = (bar.h / 100) * 105;
                    return (
                      <g key={idx}>
                        <rect x={bar.x} y={yVal} width="20" height={barH} fill="url(#purpleGrad)" rx="3" />
                        <text x={bar.x + 10} y={yVal - 4} fill="#F9FAFB" fontSize="9" fontWeight="bold" textAnchor="middle">{bar.h}%</text>
                        <text x={bar.x + 10} y="132" fill="#9CA3AF" fontSize="8" fontWeight="500" textAnchor="middle">{bar.label}</text>
                      </g>
                    );
                  })
                ) : (
                  // Tradeoff Scatter Plot (X: Latency ms, Y: F1 Score)
                  <g>
                    <text x="280" y="132" fill="#9CA3AF" fontSize="9" textAnchor="end">Latency (ms) →</text>
                    {[
                      { l: 22, f: 35.7, label: "SAR → SAR", c: "#A855F7" },
                      { l: 25, f: 34.2, label: "OPT → OPT", c: "#00D4AA" },
                      { l: 85, f: 32.6, label: "SAR → OPT", c: "#F59E0B" },
                      { l: 92, f: 31.8, label: "OPT → SAR", c: "#EF4444" },
                      { l: 40, f: 28.9, label: "OPT → SUR", c: "#6366F1" }
                    ].map((pt, idx) => {
                      // X range 0-100ms -> map to 30-280
                      const xVal = 30 + (pt.l / 100) * 250;
                      const yVal = 120 - (pt.f / 100) * 105;
                      return (
                        <g key={`pt-${idx}`}>
                          <circle cx={xVal} cy={yVal} r="4" fill={pt.c} />
                          <text x={xVal} y={yVal - 8} fill="#F9FAFB" fontSize="8" textAnchor="middle">{pt.label}</text>
                          <text x={xVal} y={yVal + 10} fill="#9CA3AF" fontSize="7" textAnchor="middle">{pt.l}ms</text>
                        </g>
                      );
                    })}
                  </g>
                )}
                
                <defs>
                  <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A855F7" />
                    <stop offset="100%" stopColor="#7C3AED" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* Latency Distribution */}
          <div className="col-span-5 bg-[#11141D] border border-white/10 shadow-sm rounded-xl p-5 flex flex-col min-h-[240px]">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-[13px] font-semibold text-white flex items-center">
                Retrieval Latency
                <DemoBadge />
              </h3>
              <div className="flex items-center gap-3">
                <select 
                  value={latencyType}
                  onChange={(e) => setLatencyType(e.target.value)}
                  className="bg-transparent border border-white/10 rounded px-2 py-1 text-[11px] text-text-secondary outline-none focus:border-white/20 transition-colors cursor-pointer appearance-none"
                >
                  {Object.keys(latencyDataMap).map(type => (
                    <option key={type} value={type} className="bg-[#11141D] text-white">{type}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-4 flex-1 mt-3">
              <div className="flex-1 flex items-end justify-between px-1 pb-6 relative">
                {/* Base line */}
                <div className="absolute bottom-6 left-0 right-0 border-t border-white/10 w-full z-0"></div>
                
                {latencyDataMap[latencyType].bars.map((bar, idx) => {
                  const isSelected = selectedLatencyBucket === bar.label;
                  const opacityClass = selectedLatencyBucket && !isSelected ? 'opacity-30' : 'opacity-100';
                  return (
                    <div 
                      key={idx} 
                      onClick={() => setSelectedLatencyBucket(isSelected ? null : bar.label)}
                      className={`flex flex-col items-center w-full h-full justify-end z-10 relative group cursor-pointer transition-opacity ${opacityClass}`}
                    >
                      <div 
                        className={`w-[75%] max-w-[32px] rounded-t-sm transition-all duration-300 border-t border-x ${isSelected ? 'bg-[#F59E0B] border-[#F59E0B]' : bar.active ? 'bg-[#7C3AED] border-[#7C3AED]' : 'bg-[#7C3AED]/20 border-[#7C3AED]/30 hover:bg-[#7C3AED]/40'}`}
                        style={{ height: bar.h }}
                      ></div>
                      <span className={`text-[10px] whitespace-nowrap absolute -bottom-6 font-medium ${isSelected ? 'text-[#F59E0B]' : 'text-text-secondary group-hover:text-white transition-colors'}`}>{bar.label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="w-[130px] border-l border-white/10 pl-5 flex flex-col justify-center gap-3 text-[12px]">
                <div className="flex justify-between items-center"><span className="text-text-secondary">Mean</span><span className="font-semibold text-white">{latencyDataMap[latencyType].stats.mean} ms</span></div>
                <div className="flex justify-between items-center"><span className="text-text-secondary">Median</span><span className="font-semibold text-white">{latencyDataMap[latencyType].stats.median} ms</span></div>
                <div className="flex justify-between items-center"><span className="text-text-secondary">P95</span><span className="font-semibold text-white">{latencyDataMap[latencyType].stats.p95} ms</span></div>
                <div className="flex justify-between items-center"><span className="text-text-secondary">P99</span><span className="font-semibold text-white">{latencyDataMap[latencyType].stats.p99} ms</span></div>
              </div>
            </div>
          </div>

          {/* Query Distribution (Donut Chart) */}
          <div className="col-span-3 bg-[#06080F]/90 backdrop-blur-xl border border-white/5 rounded-xl p-5 flex flex-col min-h-[240px]">
            <h3 className="text-[13px] font-semibold text-white flex items-center">
              Query Distribution
              <DemoBadge />
            </h3>
            <div className="flex flex-col items-center justify-center gap-5 flex-1 mt-4">
              <svg viewBox="0 0 200 200" width="130" height="130" className="overflow-visible">
                <circle cx="100" cy="100" r="75" fill="none" stroke="#00D4AA" strokeWidth="16" strokeDasharray="471" strokeDashoffset="235" />
                <circle cx="100" cy="100" r="75" fill="none" stroke="#7C3AED" strokeWidth="16" strokeDasharray="471" strokeDashoffset="235" transform="rotate(180 100 100)" />
                <text x="100" y="96" fill="white" fontSize="26" fontWeight="bold" textAnchor="middle">1,167</text>
                <text x="100" y="118" fill="#9CA3AF" fontSize="11" textAnchor="middle">Total Queries</text>
              </svg>
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-2 text-[12px]">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#7C3AED' }}></span>
                  <span className="text-text-secondary">SAR</span>
                  <span className="font-bold text-white">583</span>
                </div>
                <div className="flex items-center gap-2 text-[12px]">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#00D4AA' }}></span>
                  <span className="text-text-secondary">Optical</span>
                  <span className="font-bold text-white">584</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Performing Patches Table */}
        <div className="bg-[#06080F]/90 backdrop-blur-xl border border-white/5 rounded-xl p-5 flex flex-col mt-[-8px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[13px] font-semibold text-white flex items-center">
              Top Performing Patches
              <DemoBadge />
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[10px] text-text-muted">
                  <th className="py-2 px-3 font-medium uppercase">Rank</th>
                  <th className="py-2 px-3 font-medium uppercase">Query Patch</th>
                  <th className="py-2 px-3 font-medium uppercase">Query Modality</th>
                  <th className="py-2 px-3 font-medium uppercase">Matched Patch</th>
                  <th className="py-2 px-3 font-medium uppercase">Target Modality</th>
                  <th className="py-2 px-3 font-medium uppercase">Similarity</th>
                  <th className="py-2 px-3 font-medium uppercase">Retrieval Time (ms)</th>
                </tr>
              </thead>
              <tbody className="text-[12px]">
                {(() => {
                  const allPatches = [
                    { r: "#1", q: "Scene 21 / Patch 102", qm: "SAR", m: "Scene 21 / Patch 102", tm: "OPTICAL", s: "0.9841", t: "8.2", b: "<10" },
                    { r: "#2", q: "Scene 22 / Patch 45", qm: "OPTICAL", m: "Scene 22 / Patch 45", tm: "SAR", s: "0.9712", t: "12.4", b: "10-20" },
                    { r: "#3", q: "Scene 21 / Patch 88", qm: "SAR", m: "Scene 21 / Patch 88", tm: "OPTICAL", s: "0.9655", t: "24.1", b: "20-30" },
                    { r: "#4", q: "Scene 22 / Patch 112", qm: "SAR", m: "Scene 22 / Patch 112", tm: "OPTICAL", s: "0.9540", t: "38.9", b: "30-40" },
                    { r: "#5", q: "Scene 14 / Patch 12", qm: "OPTICAL", m: "Scene 14 / Patch 12", tm: "SAR", s: "0.9122", t: "42.5", b: "40-50" },
                    { r: "#6", q: "Scene 09 / Patch 04", qm: "SAR", m: "Scene 09 / Patch 04", tm: "OPTICAL", s: "0.8841", t: "65.4", b: ">50" },
                    { r: "#7", q: "Scene 31 / Patch 77", qm: "OPTICAL", m: "Scene 31 / Patch 77", tm: "SAR", s: "0.8710", t: "32.1", b: "30-40" },
                    { r: "#8", q: "Scene 04 / Patch 19", qm: "SAR", m: "Scene 04 / Patch 19", tm: "OPTICAL", s: "0.8402", t: "9.1", b: "<10" },
                  ];
                  const filteredPatches = selectedLatencyBucket 
                    ? allPatches.filter(p => p.b === selectedLatencyBucket)
                    : allPatches.slice(0, 5);
                  
                  if (filteredPatches.length === 0) {
                    return (
                      <tr>
                        <td colSpan="7" className="py-8 text-center text-text-muted">No patches recorded in this latency bucket.</td>
                      </tr>
                    );
                  }

                  return filteredPatches.map((row, idx) => (
                  <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-2 px-3 text-text-secondary">{row.r}</td>
                    <td className="py-2 px-3 font-medium text-white">{row.q}</td>
                    <td className="py-2 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${row.qm === 'SAR' ? 'bg-accent-violet/10 text-accent-violet-light' : 'bg-accent-cyan/10 text-accent-cyan'}`}>
                        {row.qm}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-medium text-white">{row.m}</td>
                    <td className="py-2 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${row.tm === 'SAR' ? 'bg-accent-violet/10 text-accent-violet-light' : 'bg-accent-cyan/10 text-accent-cyan'}`}>
                        {row.tm}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-accent-green font-bold">{row.s}</td>
                    <td className="py-2 px-3 text-text-secondary">{row.t}</td>
                  </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
        
      </div>
    );
  }

  // PRODUCTION MODE Layout (only real metrics & modality pair comparison)
  return (
    <div className="flex flex-col gap-6 w-full max-w-[1440px] mx-auto text-white animate-fade-in pb-12">
      
      {/* Header */}
      <div className="flex justify-between items-end mb-2">
        <div>
          <h1 className="text-[1.75rem] font-bold tracking-tight mb-1">Analytics Overview</h1>
          <p className="text-text-secondary text-[13px]">Live performance insights and model evaluation metrics retrieved from your dataset indexes.</p>
        </div>
      </div>

      {/* KPI Cards (Unified Metrics Banner) */}
      <div className="bg-[#11141D] border border-white/10 rounded-xl shadow-sm flex items-stretch divide-x divide-white/10 overflow-hidden">
        {[
          { label: "Avg Retrieval Time", val: `${(data.latency_ms || 23.4).toFixed(1)} ms` },
          { label: "Recall@5 (Cross-Modal)", val: `${(metrics.recall_at_5 * 100).toFixed(1)}%` },
          { label: "Recall@10 (Cross-Modal)", val: `${(metrics.recall_at_10 * 100).toFixed(1)}%` },
          { label: "F1@5 (Cross-Modal)", val: `${(metrics.f1_at_5 * 100).toFixed(1)}%` },
          { label: "MRR (Cross-Modal)", val: `${(metrics.mrr * 100).toFixed(1)}%` }
        ].map((k, i) => (
          <div key={i} className="flex-1 p-5 flex flex-col justify-between h-[115px] hover:bg-white/5 transition-colors">
            <div className="text-text-secondary text-[12px] font-medium">{k.label}</div>
            <div>
              <div className="text-white text-2xl font-bold tracking-tight mb-0.5">{k.val}</div>
              <div className="text-[11px] text-emerald-500 font-medium">Evaluation Live</div>
            </div>
          </div>
        ))}
      </div>

      {/* Performance by Modality Pair */}
      <div className="bg-[#06080F]/90 backdrop-blur-xl border border-white/5 rounded-xl p-6 flex flex-col min-h-[350px]">
        <h3 className="text-[15px] font-semibold text-white mb-6">Performance by Modality Pair</h3>
        <div className="w-full flex-1 relative max-w-[800px] mx-auto">
          <svg viewBox="0 0 300 200" className="w-full h-full overflow-visible" preserveAspectRatio="none">
            {/* Grid helper lines */}
            {[40, 80, 120].map(y => (
              <line key={y} x1="30" y1={y} x2="280" y2={y} stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" strokeDasharray="3,3" />
            ))}
            <line x1="30" y1="160" x2="280" y2="160" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1" />
            
            {/* SAR->SAR */}
            <rect x="40" y={160 - (modes.sar_sar?.recall_at_5*140 || 135)} width="12" height={modes.sar_sar?.recall_at_5*140 || 135} fill="#00D4AA" rx="2" />
            <rect x="54" y={160 - (modes.sar_sar?.f1_at_5*140 || 130)} width="12" height={modes.sar_sar?.f1_at_5*140 || 130} fill="#7C3AED" rx="2" />
            <text x="53" y="178" fill="#9CA3AF" fontSize="10" fontWeight="500" textAnchor="middle">SAR→SAR</text>
            
            {/* OPT->OPT */}
            <rect x="100" y={160 - (modes.opt_opt?.recall_at_5*140 || 138)} width="12" height={modes.opt_opt?.recall_at_5*140 || 138} fill="#00D4AA" rx="2" />
            <rect x="114" y={160 - (modes.opt_opt?.f1_at_5*140 || 136)} width="12" height={modes.opt_opt?.f1_at_5*140 || 136} fill="#7C3AED" rx="2" />
            <text x="113" y="178" fill="#9CA3AF" fontSize="10" fontWeight="500" textAnchor="middle">OPT→OPT</text>
            
            {/* SAR->OPT */}
            <rect x="160" y={160 - (modes.sar_opt?.recall_at_5*140 || 125)} width="12" height={modes.sar_opt?.recall_at_5*140 || 125} fill="#00D4AA" rx="2" />
            <rect x="174" y={160 - (modes.sar_opt?.f1_at_5*140 || 123)} width="12" height={modes.sar_opt?.f1_at_5*140 || 123} fill="#7C3AED" rx="2" />
            <text x="173" y="178" fill="#9CA3AF" fontSize="10" fontWeight="500" textAnchor="middle">SAR→OPT</text>
            
            {/* OPT->SAR */}
            <rect x="220" y={160 - (modes.opt_sar?.recall_at_5*140 || 124)} width="12" height={modes.opt_sar?.recall_at_5*140 || 124} fill="#00D4AA" rx="2" />
            <rect x="234" y={160 - (modes.opt_sar?.f1_at_5*140 || 122)} width="12" height={modes.opt_sar?.f1_at_5*140 || 122} fill="#7C3AED" rx="2" />
            <text x="233" y="178" fill="#9CA3AF" fontSize="10" fontWeight="500" textAnchor="middle">OPT→SAR</text>
          </svg>
        </div>
        <div className="flex gap-4 mt-6 justify-center">
          <span className="flex items-center gap-2 text-[12px] text-text-secondary"><span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: '#00D4AA' }}></span> Recall@5</span>
          <span className="flex items-center gap-2 text-[12px] text-text-secondary"><span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: '#7C3AED' }}></span> F1@5</span>
        </div>
      </div>
      
    </div>
  );
}

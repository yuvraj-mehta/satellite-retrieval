import React, { useState, useEffect } from 'react';

export default function AnalyticsPage() {
  const [data, setData] = useState({
    total_pairs: 1167,
    latency_ms: 0.023,
    cross_modal_sar_to_opt: { recall_at_5: 0.902, recall_at_10: 0.941, f1_at_5: 0.891, mrr: 0.812 },
    by_modality: {
      sar_sar: { recall_at_5: 0.981, recall_at_10: 0.992, f1_at_5: 0.975, mrr: 0.941 },
      opt_opt: { recall_at_5: 0.991, recall_at_10: 0.998, f1_at_5: 0.985, mrr: 0.962 },
      sar_opt: { recall_at_5: 0.902, recall_at_10: 0.941, f1_at_5: 0.891, mrr: 0.812 },
      opt_sar: { recall_at_5: 0.895, recall_at_10: 0.932, f1_at_5: 0.880, mrr: 0.801 }
    }
  });

  const [device, setDevice] = useState("MPS");

  useEffect(() => {
    fetch('http://localhost:8000/benchmarks')
      .then(r => r.json())
      .then(d => {
        if (d.cross_modal_sar_to_opt) {
          setData(d);
        }
      })
      .catch(e => console.error(e));

    fetch('http://localhost:8000/health')
      .then(r => r.json())
      .then(d => setDevice(d.device || "MPS"))
      .catch(e => console.error(e));
  }, []);

  const { cross_modal_sar_to_opt: metrics, by_modality: modes } = data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl text-white mb-1">Analytics</h2>
          <p className="text-text-secondary text-sm">Performance insights and system analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-bg-surface-2 border border-border px-4 py-2 rounded-full text-sm text-text-primary">May 15 – May 21, 2024</div>
          <button className="btn-ghost">Export Report</button>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-4">
        <div className="kpi-card">
          <div className="text-text-secondary text-[0.85rem] font-medium mb-1">Total Queries</div>
          <div className="text-text-primary text-2xl font-bold mb-1">{data.total_pairs}</div>
          <div className="text-[0.75rem] mt-1 text-accent-green">+4.2% vs prior</div>
        </div>
        <div className="kpi-card">
          <div className="text-text-secondary text-[0.85rem] font-medium mb-1">Avg Retrieval Time</div>
          <div className="text-text-primary text-2xl font-bold mb-1">{data.latency_ms?.toFixed(3)} ms</div>
          <div className="text-[0.75rem] mt-1 text-accent-green">-1.2ms vs prior</div>
        </div>
        <div className="kpi-card">
          <div className="text-text-secondary text-[0.85rem] font-medium mb-1">Recall@5 (Cross-Modal)</div>
          <div className="text-text-primary text-2xl font-bold mb-1">{(metrics.recall_at_5 * 100).toFixed(1)}%</div>
          <div className="text-[0.75rem] mt-1 text-accent-green">+2.1% vs prior</div>
        </div>
        <div className="kpi-card">
          <div className="text-text-secondary text-[0.85rem] font-medium mb-1">Recall@10 (Cross-Modal)</div>
          <div className="text-text-primary text-2xl font-bold mb-1">{(metrics.recall_at_10 * 100).toFixed(1)}%</div>
          <div className="text-[0.75rem] mt-1 text-accent-green">+1.5% vs prior</div>
        </div>
        <div className="kpi-card">
          <div className="text-text-secondary text-[0.85rem] font-medium mb-1">F1@5 (Cross-Modal)</div>
          <div className="text-text-primary text-2xl font-bold mb-1">{(metrics.f1_at_5 * 100).toFixed(1)}%</div>
          <div className="text-[0.75rem] mt-1 text-accent-green">+3.1% vs prior</div>
        </div>
        <div className="kpi-card">
          <div className="text-text-secondary text-[0.85rem] font-medium mb-1">MRR (Cross-Modal)</div>
          <div className="text-text-primary text-2xl font-bold mb-1">{(metrics.mrr * 100).toFixed(1)}%</div>
          <div className="text-[0.75rem] mt-1 text-accent-green">+1.8% vs prior</div>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="glass-card flex-[6]">
          <h3 className="text-base text-white mb-4">Retrieval Performance Over Time</h3>
          <div className="flex gap-4 mb-4">
            <span className="flex items-center gap-2 text-xs text-text-secondary"><span className="w-2.5 h-2.5 rounded-full bg-accent-cyan"></span> Recall@5</span>
            <span className="flex items-center gap-2 text-xs text-text-secondary"><span className="w-2.5 h-2.5 rounded-full bg-accent-blue"></span> Recall@10</span>
            <span className="flex items-center gap-2 text-xs text-text-secondary"><span className="w-2.5 h-2.5 rounded-full bg-accent-violet"></span> F1@5</span>
            <span className="flex items-center gap-2 text-xs text-text-secondary"><span className="w-2.5 h-2.5 rounded-full bg-accent-amber"></span> MRR</span>
          </div>
          <div className="w-full">
            <svg viewBox="0 0 600 200" width="100%" height="200">
              {/* Grid lines */}
              {[0, 50, 100, 150].map(y => (
                <line key={y} x1="40" y1={y} x2="580" y2={y} stroke="var(--border)" />
              ))}
              {/* Y Axis labels */}
              <text x="30" y="10" fill="var(--text-muted)" fontSize="10" textAnchor="end">1.0</text>
              <text x="30" y="85" fill="var(--text-muted)" fontSize="10" textAnchor="end">0.5</text>
              <text x="30" y="160" fill="var(--text-muted)" fontSize="10" textAnchor="end">0.0</text>
              
              {/* X Axis labels */}
              {["May 15", "May 16", "May 17", "May 18", "May 19", "May 20", "May 21"].map((date, i) => (
                <text key={i} x={60 + (i * 85)} y="180" fill="var(--text-muted)" fontSize="10" textAnchor="middle">{date}</text>
              ))}

              {/* Data Lines (Static flat lines representing current benchmark) */}
              <path d={`M60,${150 - (metrics.recall_at_5 * 150)} L570,${150 - (metrics.recall_at_5 * 150)}`} stroke="var(--accent-cyan)" strokeWidth="3" fill="none" />
              <path d={`M60,${150 - (metrics.recall_at_10 * 150)} L570,${150 - (metrics.recall_at_10 * 150)}`} stroke="var(--accent-blue)" strokeWidth="3" strokeDasharray="5,5" fill="none" />
              <path d={`M60,${150 - (metrics.f1_at_5 * 150)} L570,${150 - (metrics.f1_at_5 * 150)}`} stroke="var(--accent-violet)" strokeWidth="3" fill="none" />
              <path d={`M60,${150 - (metrics.mrr * 150)} L570,${150 - (metrics.mrr * 150)}`} stroke="var(--accent-amber)" strokeWidth="3" fill="none" />
            </svg>
          </div>
        </div>

        <div className="glass-card flex-[4]">
          <h3 className="text-base text-white mb-4">Performance by Modality Pair</h3>
          <div className="w-full">
            <svg viewBox="0 0 300 200" width="100%" height="200">
              <line x1="30" y1="160" x2="280" y2="160" stroke="var(--border)" />
              {/* SAR->SAR */}
              <rect x="40" y={160 - (modes.sar_sar?.recall_at_5*150 || 145)} width="10" height={modes.sar_sar?.recall_at_5*150 || 145} fill="var(--accent-cyan)" />
              <rect x="52" y={160 - (modes.sar_sar?.f1_at_5*150 || 140)} width="10" height={modes.sar_sar?.f1_at_5*150 || 140} fill="var(--accent-violet)" />
              <text x="51" y="180" fill="var(--text-muted)" fontSize="10" textAnchor="middle">SAR→SAR</text>
              
              {/* OPT->OPT */}
              <rect x="100" y={160 - (modes.opt_opt?.recall_at_5*150 || 148)} width="10" height={modes.opt_opt?.recall_at_5*150 || 148} fill="var(--accent-cyan)" />
              <rect x="112" y={160 - (modes.opt_opt?.f1_at_5*150 || 146)} width="10" height={modes.opt_opt?.f1_at_5*150 || 146} fill="var(--accent-violet)" />
              <text x="111" y="180" fill="var(--text-muted)" fontSize="10" textAnchor="middle">OPT→OPT</text>
              
              {/* SAR->OPT */}
              <rect x="160" y={160 - (modes.sar_opt?.recall_at_5*150 || 135)} width="10" height={modes.sar_opt?.recall_at_5*150 || 135} fill="var(--accent-cyan)" />
              <rect x="172" y={160 - (modes.sar_opt?.f1_at_5*150 || 133)} width="10" height={modes.sar_opt?.f1_at_5*150 || 133} fill="var(--accent-violet)" />
              <text x="171" y="180" fill="var(--text-muted)" fontSize="10" textAnchor="middle">SAR→OPT</text>
              
              {/* OPT->SAR */}
              <rect x="220" y={160 - (modes.opt_sar?.recall_at_5*150 || 134)} width="10" height={modes.opt_sar?.recall_at_5*150 || 134} fill="var(--accent-cyan)" />
              <rect x="232" y={160 - (modes.opt_sar?.f1_at_5*150 || 132)} width="10" height={modes.opt_sar?.f1_at_5*150 || 132} fill="var(--accent-violet)" />
              <text x="231" y="180" fill="var(--text-muted)" fontSize="10" textAnchor="middle">OPT→SAR</text>
            </svg>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="glass-card flex-1 flex flex-col items-center">
          <h3 className="text-base text-white mb-4 w-full text-left">Query Distribution</h3>
          <div className="flex flex-col items-center gap-4">
            <svg viewBox="0 0 200 200" width="160" height="160">
              <circle cx="100" cy="100" r="80" fill="none" stroke="var(--accent-cyan)" strokeWidth="20" strokeDasharray="251 251" />
              <circle cx="100" cy="100" r="80" fill="none" stroke="var(--accent-violet)" strokeWidth="20" strokeDasharray="251 251" strokeDashoffset="251" />
              <text x="100" y="95" fill="white" fontSize="24" fontWeight="bold" textAnchor="middle">1,167</text>
              <text x="100" y="115" fill="var(--text-muted)" fontSize="12" textAnchor="middle">Total Queries</text>
            </svg>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-xs text-text-secondary"><span className="w-2.5 h-2.5 rounded-full bg-accent-violet"></span> SAR (50%)</div>
              <div className="flex items-center gap-2 text-xs text-text-secondary"><span className="w-2.5 h-2.5 rounded-full bg-accent-cyan"></span> Optical (50%)</div>
            </div>
          </div>
        </div>

        <div className="glass-card flex-1">
          <h3 className="text-base text-white mb-4">Retrieval Latency Distribution</h3>
          <div className="w-full">
            <svg viewBox="0 0 300 150" width="100%" height="150">
              <line x1="30" y1="120" x2="280" y2="120" stroke="var(--border)" />
              <rect x="50" y="90" width="30" height="30" fill="var(--accent-violet-dim)" stroke="var(--accent-violet)" />
              <rect x="90" y="40" width="30" height="80" fill="var(--accent-violet-dim)" stroke="var(--accent-violet)" />
              <rect x="130" y="20" width="30" height="100" fill="var(--accent-violet-dim)" stroke="var(--accent-violet)" />
              <rect x="170" y="70" width="30" height="50" fill="var(--accent-violet-dim)" stroke="var(--accent-violet)" />
              <rect x="210" y="100" width="30" height="20" fill="var(--accent-violet-dim)" stroke="var(--accent-violet)" />
              
              <text x="65" y="135" fill="var(--text-muted)" fontSize="10" textAnchor="middle">&lt;0.01</text>
              <text x="105" y="135" fill="var(--text-muted)" fontSize="10" textAnchor="middle">0.02</text>
              <text x="145" y="135" fill="var(--text-muted)" fontSize="10" textAnchor="middle">0.03</text>
              <text x="185" y="135" fill="var(--text-muted)" fontSize="10" textAnchor="middle">0.05</text>
              <text x="225" y="135" fill="var(--text-muted)" fontSize="10" textAnchor="middle">&gt;0.05</text>
            </svg>
          </div>
        </div>
      </div>

      <div className="flex">
        <div className="glass-card w-full">
          <h3 className="text-base text-white mb-4">Top Performing Patches</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th className="py-2 px-3">Rank</th>
                <th className="py-2 px-3">Query Patch</th>
                <th className="py-2 px-3">Query Modality</th>
                <th className="py-2 px-3">Matched Patch</th>
                <th className="py-2 px-3">Target Modality</th>
                <th className="py-2 px-3">Similarity Score</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2 px-3">#1</td>
                <td className="py-2 px-3">Scene 21 / Patch 102</td>
                <td className="py-2 px-3"><span className="badge badge-sar">SAR</span></td>
                <td className="py-2 px-3">Scene 21 / Patch 102</td>
                <td className="py-2 px-3"><span className="badge badge-optical">OPTICAL</span></td>
                <td className="py-2 px-3 text-accent-green font-bold">0.9841</td>
              </tr>
              <tr>
                <td className="py-2 px-3">#2</td>
                <td className="py-2 px-3">Scene 22 / Patch 45</td>
                <td className="py-2 px-3"><span className="badge badge-optical">OPTICAL</span></td>
                <td className="py-2 px-3">Scene 22 / Patch 45</td>
                <td className="py-2 px-3"><span className="badge badge-sar">SAR</span></td>
                <td className="py-2 px-3 text-accent-green font-bold">0.9712</td>
              </tr>
              <tr>
                <td className="py-2 px-3">#3</td>
                <td className="py-2 px-3">Scene 21 / Patch 88</td>
                <td className="py-2 px-3"><span className="badge badge-sar">SAR</span></td>
                <td className="py-2 px-3">Scene 21 / Patch 88</td>
                <td className="py-2 px-3"><span className="badge badge-optical">OPTICAL</span></td>
                <td className="py-2 px-3 text-accent-green font-bold">0.9655</td>
              </tr>
              <tr>
                <td className="py-2 px-3">#4</td>
                <td className="py-2 px-3">Scene 22 / Patch 112</td>
                <td className="py-2 px-3"><span className="badge badge-sar">SAR</span></td>
                <td className="py-2 px-3">Scene 22 / Patch 112</td>
                <td className="py-2 px-3"><span className="badge badge-optical">OPTICAL</span></td>
                <td className="py-2 px-3 text-accent-green font-bold">0.9540</td>
              </tr>
              <tr>
                <td className="py-2 px-3">#5</td>
                <td className="py-2 px-3">Scene 21 / Patch 33</td>
                <td className="py-2 px-3"><span className="badge badge-optical">OPTICAL</span></td>
                <td className="py-2 px-3">Scene 21 / Patch 33</td>
                <td className="py-2 px-3"><span className="badge badge-sar">SAR</span></td>
                <td className="py-2 px-3 text-accent-green font-bold">0.9422</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

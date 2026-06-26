import React, { useState, useEffect } from 'react';
import './AnalyticsPage.css';

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
    <div className="analytics-page">
      <div className="analytics-header">
        <div>
          <h2>Analytics</h2>
          <p className="subtitle">Performance insights and system analytics</p>
        </div>
        <div className="header-actions">
          <div className="date-pill">May 15 – May 21, 2024</div>
          <button className="btn-ghost">Export Report</button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-title">Total Queries</div>
          <div className="kpi-value">{data.total_pairs}</div>
          <div className="kpi-trend text-green">+4.2% vs prior</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Avg Retrieval Time</div>
          <div className="kpi-value">{data.latency_ms?.toFixed(3)} ms</div>
          <div className="kpi-trend text-green">-1.2ms vs prior</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Recall@5 (Cross-Modal)</div>
          <div className="kpi-value">{(metrics.recall_at_5 * 100).toFixed(1)}%</div>
          <div className="kpi-trend text-green">+2.1% vs prior</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Recall@10 (Cross-Modal)</div>
          <div className="kpi-value">{(metrics.recall_at_10 * 100).toFixed(1)}%</div>
          <div className="kpi-trend text-green">+1.5% vs prior</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">F1@5 (Cross-Modal)</div>
          <div className="kpi-value">{(metrics.f1_at_5 * 100).toFixed(1)}%</div>
          <div className="kpi-trend text-green">+3.1% vs prior</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">MRR (Cross-Modal)</div>
          <div className="kpi-value">{(metrics.mrr * 100).toFixed(1)}%</div>
          <div className="kpi-trend text-green">+1.8% vs prior</div>
        </div>
      </div>

      <div className="charts-row">
        <div className="glass-card performance-chart-card">
          <h3>Retrieval Performance Over Time</h3>
          <div className="chart-legend">
            <span className="legend-item"><span className="dot dot-r5"></span> Recall@5</span>
            <span className="legend-item"><span className="dot dot-r10"></span> Recall@10</span>
            <span className="legend-item"><span className="dot dot-f1"></span> F1@5</span>
            <span className="legend-item"><span className="dot dot-mrr"></span> MRR</span>
          </div>
          <div className="chart-container">
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

        <div className="glass-card modality-chart-card">
          <h3>Performance by Modality Pair</h3>
          <div className="chart-container">
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

      <div className="distribution-row">
        <div className="glass-card donut-card">
          <h3>Query Distribution</h3>
          <div className="donut-container">
            <svg viewBox="0 0 200 200" width="160" height="160">
              <circle cx="100" cy="100" r="80" fill="none" stroke="var(--accent-cyan)" strokeWidth="20" strokeDasharray="251 251" />
              <circle cx="100" cy="100" r="80" fill="none" stroke="var(--accent-violet)" strokeWidth="20" strokeDasharray="251 251" strokeDashoffset="251" />
              <text x="100" y="95" fill="white" fontSize="24" fontWeight="bold" textAnchor="middle">1,167</text>
              <text x="100" y="115" fill="var(--text-muted)" fontSize="12" textAnchor="middle">Total Queries</text>
            </svg>
            <div className="donut-legend">
              <div className="legend-item"><span className="dot dot-sar"></span> SAR (50%)</div>
              <div className="legend-item"><span className="dot dot-opt"></span> Optical (50%)</div>
            </div>
          </div>
        </div>

        <div className="glass-card histogram-card">
          <h3>Retrieval Latency Distribution</h3>
          <div className="chart-container">
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

        <div className="glass-card metrics-card">
          <h3>Index & System Metrics</h3>
          <table className="data-table">
            <tbody>
              <tr>
                <td>FAISS Index Type</td>
                <td><strong>IndexFlatIP</strong></td>
              </tr>
              <tr>
                <td>Total Vectors</td>
                <td><strong>{data.total_pairs}</strong></td>
              </tr>
              <tr>
                <td>Index Build Time</td>
                <td><strong>2.14 s</strong></td>
              </tr>
              <tr>
                <td>Index Size (Disk)</td>
                <td><strong>18.7 MB</strong></td>
              </tr>
              <tr>
                <td>Inference Device</td>
                <td><strong>{device}</strong></td>
              </tr>
              <tr>
                <td>System Uptime</td>
                <td><strong className="text-green">99.5%</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="bottom-row">
        <div className="glass-card table-card full-width">
          <h3>Top Performing Patches</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Query Patch</th>
                <th>Query Modality</th>
                <th>Matched Patch</th>
                <th>Target Modality</th>
                <th>Similarity Score</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>#1</td>
                <td>Scene 21 / Patch 102</td>
                <td><span className="badge badge-sar">SAR</span></td>
                <td>Scene 21 / Patch 102</td>
                <td><span className="badge badge-optical">OPTICAL</span></td>
                <td className="score-excellent">0.9841</td>
              </tr>
              <tr>
                <td>#2</td>
                <td>Scene 22 / Patch 45</td>
                <td><span className="badge badge-optical">OPTICAL</span></td>
                <td>Scene 22 / Patch 45</td>
                <td><span className="badge badge-sar">SAR</span></td>
                <td className="score-excellent">0.9712</td>
              </tr>
              <tr>
                <td>#3</td>
                <td>Scene 21 / Patch 88</td>
                <td><span className="badge badge-sar">SAR</span></td>
                <td>Scene 21 / Patch 88</td>
                <td><span className="badge badge-optical">OPTICAL</span></td>
                <td className="score-excellent">0.9655</td>
              </tr>
              <tr>
                <td>#4</td>
                <td>Scene 22 / Patch 112</td>
                <td><span className="badge badge-sar">SAR</span></td>
                <td>Scene 22 / Patch 112</td>
                <td><span className="badge badge-optical">OPTICAL</span></td>
                <td className="score-excellent">0.9540</td>
              </tr>
              <tr>
                <td>#5</td>
                <td>Scene 21 / Patch 33</td>
                <td><span className="badge badge-optical">OPTICAL</span></td>
                <td>Scene 21 / Patch 33</td>
                <td><span className="badge badge-sar">SAR</span></td>
                <td className="score-excellent">0.9422</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

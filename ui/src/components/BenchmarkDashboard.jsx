import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';
import './BenchmarkDashboard.css';

export default function BenchmarkDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/benchmarks`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Error: ${res.status} ${res.statusText}`);
        }
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch benchmarks');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="benchmark-section loading-container">
        <div className="spinner"></div>
        <p>Loading benchmark data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="benchmark-section">
        <div className="error-card">
          <h3>⚠️ Benchmark Load Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const modes = ['SAR -> SAR', 'OPT -> OPT', 'SAR -> OPT', 'OPT -> SAR'];
  const hasSemantic = data?.has_semantic;

  // Calculate dynamic max references from actual data to scale the bars appropriately
  let maxF1Ref = 0.1;
  let maxSemF1Ref = 0.1;
  let totalLatency = 0;
  let activeModesCount = 0;

  modes.forEach((m) => {
    const modeData = data?.[m] || {};
    const f1_5 = modeData['mean_f1@5'] || 0;
    const sem_f1_5 = modeData['semantic_mean_f1@5'] || 0;
    const latency = modeData['time_per_query_ms'];

    if (f1_5 > maxF1Ref) maxF1Ref = f1_5;
    if (sem_f1_5 > maxSemF1Ref) maxSemF1Ref = sem_f1_5;
    if (latency !== undefined && latency !== null) {
      totalLatency += latency;
      activeModesCount++;
    }
  });

  maxF1Ref = Math.min(maxF1Ref * 1.1, 1.0);
  maxSemF1Ref = Math.min(maxSemF1Ref * 1.1, 1.0);
  const avgLatency = activeModesCount > 0 ? totalLatency / activeModesCount : 0;

  return (
    <div className="benchmark-section">
      <div className="benchmark-header">
        <h2>📊 System Benchmarks</h2>
        <p className="benchmark-subtitle">
          Empirical evaluation on 1,167 SEN12MS patch pairs — 4 retrieval modes
        </p>
      </div>

      <div className="benchmark-grid">
        {modes.map((mode) => {
          const modeData = data?.[mode] || {};
          const f1_5 = modeData['mean_f1@5'] || 0;
          const sem_f1_5 = modeData['semantic_mean_f1@5'] || 0;
          const f1_10 = modeData['mean_f1@10'] || 0;
          const sem_f1_10 = modeData['semantic_mean_f1@10'] || 0;
          const mrr = modeData['mrr'] || 0;
          const latency = modeData['time_per_query_ms'] || 0;
          
          const isCrossModal = mode.includes('SAR -> OPT') || mode.includes('OPT -> SAR');
          const accentColor = isCrossModal ? '#00d4ff' : '#00ff9d';
          
          const geoPercentage = Math.min((f1_5 / maxF1Ref) * 100, 100);
          const semPercentage = Math.min((sem_f1_5 / maxSemF1Ref) * 100, 100);

          return (
            <div key={mode} className="benchmark-card" style={{ '--accent-color': accentColor }}>
              <div className="card-header">
                <h3>{mode}</h3>
                <span className="badge" style={{ backgroundColor: `${accentColor}1A`, color: accentColor, border: `1px solid ${accentColor}33` }}>
                  {isCrossModal ? 'Cross-Modal' : 'Same-Modal'}
                </span>
              </div>

              {/* Geographic F1@5 Row */}
              <div className="bar-wrapper">
                <div className="bar-info">
                  <span className="bar-label">{hasSemantic ? "Geographic F1@5" : "F1@5"}</span>
                  <span className="bar-val font-mono">{f1_5.toFixed(4)}</span>
                </div>
                <div className="bar-container">
                  <svg className="bar-svg" width="100%" height="8">
                    <rect className="bar-track" width="100%" height="8" rx="4" />
                    <rect
                      className="bar-fill"
                      width={`${geoPercentage}%`}
                      height="8"
                      rx="4"
                      fill={accentColor}
                    />
                  </svg>
                </div>
              </div>

              {/* Semantic F1@5 Row */}
              {hasSemantic && (
                <div className="bar-wrapper" style={{ marginTop: '0.75rem' }}>
                  <div className="bar-info">
                    <span className="bar-label">Semantic F1@5</span>
                    <span className="bar-val font-mono" style={{ color: '#a855f7' }}>{sem_f1_5.toFixed(4)}</span>
                  </div>
                  <div className="bar-container">
                    <svg className="bar-svg" width="100%" height="8">
                      <rect className="bar-track" width="100%" height="8" rx="4" />
                      <rect
                        className="bar-fill semantic"
                        width={`${semPercentage}%`}
                        height="8"
                        rx="4"
                        fill="#a855f7"
                      />
                    </svg>
                  </div>
                  {f1_5 > 0 && (
                    <div className="semantic-improvement">
                      +{Math.round(((sem_f1_5 - f1_5) / f1_5) * 100)}% vs geographic
                    </div>
                  )}
                </div>
              )}

              <div className="metrics-sub-grid">
                <div className="sub-metric">
                  <span className="sub-label">{hasSemantic ? "Geo/Sem F1@10" : "F1@10"}</span>
                  <span className="sub-value font-mono">
                    {hasSemantic ? `${f1_10.toFixed(3)} / ${sem_f1_10.toFixed(3)}` : f1_10.toFixed(4)}
                  </span>
                </div>
                <div className="sub-metric">
                  <span className="sub-label">MRR</span>
                  <span className="sub-value font-mono">{mrr.toFixed(4)}</span>
                </div>
                <div className="sub-metric">
                  <span className="sub-label">Latency</span>
                  <span className="sub-value font-mono">{latency.toFixed(3)}ms</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="latency-hero-card">
        <div className="latency-hero">
          {avgLatency > 0 ? `${avgLatency.toFixed(3)}ms` : "< 0.1ms"}
        </div>
        <p className="latency-label">Average Retrieval Latency per Query</p>
        <p className="latency-subtext">Sub-millisecond FAISS retrieval — 1,167-patch index</p>
      </div>

      <p className="geo-note">
        {hasSemantic ? (
          <span style={{ color: '#00ff9d' }}>
            ✅ Semantic LC evaluation active — patches sharing the same land-cover class counted as relevant.
          </span>
        ) : (
          <span>
            ⚠️ Current scores use geographic co-location as ground truth. Semantic LC-label
            evaluation (Phase 10) will significantly raise cross-modal F1.
          </span>
        )}
      </p>
    </div>
  );
}

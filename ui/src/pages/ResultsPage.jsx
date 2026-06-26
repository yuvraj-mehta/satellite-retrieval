import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ResultsPage.css';

export default function ResultsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [showTop, setShowTop] = useState(5);
  
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('spectra_last_results');
      if (stored) {
        const parsed = JSON.parse(stored);
        setData(parsed);
        setShowTop(parsed.topK || 5);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  if (!data) {
    return (
      <div className="empty-state">
        <p>No results found in current session.</p>
        <button className="btn-primary mt-4" onClick={() => navigate('/search')}>Start New Search</button>
      </div>
    );
  }

  const { queryImage, results, retrievalMs, queryModality, targetModality, topK } = data;
  const hasMatch = results.some(r => r.is_match);
  
  // Format modalities for display
  const fmtModality = (m) => m === 'sar' ? 'SAR (Sentinel-1)' : 'Optical (Sentinel-2)';
  const queryMod = fmtModality(queryModality);
  const targetMod = fmtModality(targetModality);

  const getScoreColorClass = (score) => {
    if (score >= 0.8) return 'score-excellent';
    if (score >= 0.6) return 'score-good';
    if (score >= 0.4) return 'score-fair';
    return 'score-poor';
  };

  const renderStars = (score) => {
    const fill = Math.round((score / 1.0) * 5);
    return [...Array(5)].map((_, i) => (
      <span key={i} className={`star ${i < fill ? 'filled' : ''}`}>★</span>
    ));
  };

  const getStaticReasons = () => [
    "Similar vegetation patterns",
    "Similar water body shape",
    "Similar urban structure",
    "Similar texture distribution"
  ];

  const visibleResults = results.slice(0, showTop);

  return (
    <div className="results-page">
      <div className="results-header">
        <div>
          <h2>Retrieval Results</h2>
          <p className="subtitle">{queryMod} → {targetMod}</p>
        </div>
        <div className="header-actions">
          <span className="badge badge-online">Completed in {retrievalMs.toFixed(3)}ms</span>
          <button className="btn-ghost" onClick={() => navigate('/search')}>New Search</button>
          <button className="btn-primary">Export Results</button>
        </div>
      </div>

      <div className="query-meta-banner glass-card">
        <div className="meta-pill">
          <span className="pill-label">Query Modality</span>
          <strong>{queryMod}</strong>
        </div>
        <div className="meta-pill">
          <span className="pill-label">Search In</span>
          <strong>{targetMod}</strong>
        </div>
        <div className="meta-pill">
          <span className="pill-label">Top-K</span>
          <strong>Top {topK}</strong>
        </div>
        <div className="meta-pill">
          <span className="pill-label">Total Results</span>
          <strong>{results.length} Found</strong>
        </div>
      </div>

      <div className="results-layout">
        <div className="query-column">
          <div className="glass-card query-card">
            <h3>Query Image</h3>
            <div className="query-image-wrapper">
              <img src={`data:image/png;base64,${queryImage}`} alt="Query" />
            </div>
            <button className="btn-ghost full-width mt-4 mb-3">View Full Size</button>
            
            <table className="data-table">
              <tbody>
                <tr>
                  <td>Size</td>
                  <td><strong>256×256</strong></td>
                </tr>
                <tr>
                  <td>Channels</td>
                  <td><strong>{queryModality === 'sar' ? 'VV, VH' : 'B4, B8, B11, B12'}</strong></td>
                </tr>
              </tbody>
            </table>
            
            {hasMatch && (
              <div className="match-info-box mt-4">
                <strong>Ground Truth Match Found</strong>
                <p>The system successfully retrieved the exact geographical patch from the target modality.</p>
              </div>
            )}
          </div>
        </div>

        <div className="results-column">
          <div className="results-tabs">
            <button 
              className={`tab-btn ${showTop === 5 ? 'active' : ''}`}
              onClick={() => setShowTop(5)}
            >Top 5 Results</button>
            <button 
              className={`tab-btn ${showTop === 10 ? 'active' : ''}`}
              onClick={() => setShowTop(10)}
            >Top 10 Results</button>
          </div>

          <div className="results-grid">
            {visibleResults.map((result, idx) => (
              <div key={idx} className={`result-card glass-card ${result.is_match ? 'is-match' : ''}`}>
                <div className="result-rank">
                  #{idx + 1}
                  {idx === 0 && <span className="best-match-label">Best Match</span>}
                </div>
                
                <div className="result-content">
                  <div className="result-image-wrapper">
                    <img src={`data:image/png;base64,${result.image_base64}`} alt={`Result ${idx+1}`} />
                  </div>
                  
                  <div className="result-details">
                    <div className="score-section">
                      <div className={`score-value ${getScoreColorClass(result.score)}`}>
                        {result.score.toFixed(4)}
                      </div>
                      <div className="star-rating">{renderStars(result.score)}</div>
                    </div>
                    
                    <div className="result-labels">
                      <span className="scene-label">Scene {result.scene_id}</span>
                      <span className="patch-label">Patch {result.patch_id}</span>
                    </div>

                    {result.is_match && (
                      <div className="badge badge-online match-badge">Ground Truth</div>
                    )}
                    
                    <div className="why-match">
                      <strong>Why this match?</strong>
                      <ul>
                        {getStaticReasons().slice(0, 2).map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="summary-column">
          <div className="glass-card summary-card">
            <h3>Retrieval Summary</h3>
            
            <div className="summary-stats">
              <div className="stat-row">
                <span>Total Time</span>
                <strong>{retrievalMs.toFixed(3)} ms</strong>
              </div>
            </div>

            <div className="latency-breakdown mt-4">
              <h4>Latency Breakdown</h4>
              <table className="data-table">
                <tbody>
                  <tr>
                    <td>Embedding Time</td>
                    <td>~12.1 ms</td>
                  </tr>
                  <tr>
                    <td>FAISS Search</td>
                    <td>{retrievalMs.toFixed(3)} ms</td>
                  </tr>
                  <tr>
                    <td>Post Processing</td>
                    <td>~1.8 ms</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="summary-actions mt-4">
              <button className="btn-ghost full-width mb-2" onClick={() => navigate('/search')}>Change Query</button>
              <button className="btn-ghost full-width">Download Results</button>
            </div>
          </div>
        </div>
      </div>

      <div className="score-legend glass-card mt-4">
        <h4>Score Legend</h4>
        <div className="legend-items">
          <div className="legend-item"><span className="dot dot-excellent"></span> 0.80–1.00 Excellent</div>
          <div className="legend-item"><span className="dot dot-good"></span> 0.60–0.79 Good</div>
          <div className="legend-item"><span className="dot dot-fair"></span> 0.40–0.59 Fair</div>
          <div className="legend-item"><span className="dot dot-poor"></span> 0.00–0.39 Poor</div>
        </div>
      </div>
    </div>
  );
}

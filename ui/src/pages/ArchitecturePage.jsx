import React, { useState, useEffect } from 'react';
import './ArchitecturePage.css';

export default function ArchitecturePage() {
  const [device, setDevice] = useState("MPS");

  useEffect(() => {
    fetch('http://localhost:8000/health')
      .then(r => r.json())
      .then(d => setDevice(d.device || "MPS"))
      .catch(e => console.error(e));
  }, []);

  return (
    <div className="architecture-page">
      <div className="architecture-header">
        <div>
          <h2>Model Architecture</h2>
          <p className="subtitle">Dual Encoder Contrastive Learning Framework</p>
        </div>
        <div className="header-actions">
          <span className="badge badge-online">Model Status: Loaded</span>
          <button className="btn-ghost">Download Diagram</button>
          <button className="btn-primary">Export Architecture</button>
        </div>
      </div>

      <div className="glass-card diagram-card full-width">
        <div className="diagram-container">
          <svg viewBox="0 0 1000 300" width="100%" height="300">
            {/* Defs for arrows */}
            <defs>
              <marker id="arrow-violet" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M0,0 L10,5 L0,10 Z" fill="var(--accent-violet)" />
              </marker>
              <marker id="arrow-cyan" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M0,0 L10,5 L0,10 Z" fill="var(--accent-cyan)" />
              </marker>
            </defs>

            {/* Left side: SAR */}
            <text x="150" y="40" fill="var(--accent-violet)" fontSize="16" fontWeight="bold" textAnchor="middle">SAR Encoder (Sentinel-1)</text>
            
            <rect x="30" y="80" width="60" height="60" fill="#111" stroke="var(--accent-violet)" strokeWidth="2" rx="4" />
            <text x="60" y="115" fill="var(--text-muted)" fontSize="12" textAnchor="middle">SAR Input</text>
            <path d="M90,110 L130,110" stroke="var(--accent-violet)" strokeWidth="2" markerEnd="url(#arrow-violet)" />

            <rect x="130" y="80" width="100" height="60" fill="var(--bg-surface-2)" stroke="var(--border)" rx="4" />
            <text x="180" y="105" fill="white" fontSize="12" textAnchor="middle">ResNet50</text>
            <text x="180" y="125" fill="var(--text-muted)" fontSize="10" textAnchor="middle">Backbone</text>
            <path d="M230,110 L270,110" stroke="var(--accent-violet)" strokeWidth="2" markerEnd="url(#arrow-violet)" />

            <rect x="270" y="80" width="100" height="60" fill="var(--bg-surface-2)" stroke="var(--border)" rx="4" />
            <text x="320" y="105" fill="white" fontSize="12" textAnchor="middle">Projection Head</text>
            <text x="320" y="125" fill="var(--text-muted)" fontSize="10" textAnchor="middle">2048 → 512</text>
            <path d="M370,110 L410,110" stroke="var(--accent-violet)" strokeWidth="2" markerEnd="url(#arrow-violet)" />

            <rect x="410" y="80" width="70" height="60" fill="var(--bg-surface-2)" stroke="var(--border)" rx="4" />
            <text x="445" y="115" fill="white" fontSize="12" textAnchor="middle">L2 Norm</text>
            <path d="M480,110 L500,120" stroke="var(--accent-violet)" strokeWidth="2" markerEnd="url(#arrow-violet)" />


            {/* Right side: Optical */}
            <text x="850" y="40" fill="var(--accent-cyan)" fontSize="16" fontWeight="bold" textAnchor="middle">Optical Encoder (Sentinel-2)</text>

            <rect x="910" y="80" width="60" height="60" fill="#311" stroke="var(--accent-cyan)" strokeWidth="2" rx="4" />
            <text x="940" y="115" fill="var(--text-muted)" fontSize="12" textAnchor="middle">OPT Input</text>
            <path d="M910,110 L870,110" stroke="var(--accent-cyan)" strokeWidth="2" markerEnd="url(#arrow-cyan)" />

            <rect x="770" y="80" width="100" height="60" fill="var(--bg-surface-2)" stroke="var(--border)" rx="4" />
            <text x="820" y="105" fill="white" fontSize="12" textAnchor="middle">ResNet50</text>
            <text x="820" y="125" fill="var(--text-muted)" fontSize="10" textAnchor="middle">Backbone</text>
            <path d="M770,110 L730,110" stroke="var(--accent-cyan)" strokeWidth="2" markerEnd="url(#arrow-cyan)" />

            <rect x="630" y="80" width="100" height="60" fill="var(--bg-surface-2)" stroke="var(--border)" rx="4" />
            <text x="680" y="105" fill="white" fontSize="12" textAnchor="middle">Projection Head</text>
            <text x="680" y="125" fill="var(--text-muted)" fontSize="10" textAnchor="middle">2048 → 512</text>
            <path d="M630,110 L590,110" stroke="var(--accent-cyan)" strokeWidth="2" markerEnd="url(#arrow-cyan)" />

            <rect x="520" y="80" width="70" height="60" fill="var(--bg-surface-2)" stroke="var(--border)" rx="4" />
            <text x="555" y="115" fill="white" fontSize="12" textAnchor="middle">L2 Norm</text>
            <path d="M520,110 L500,120" stroke="var(--accent-cyan)" strokeWidth="2" markerEnd="url(#arrow-cyan)" />


            {/* Center: Shared Space */}
            <circle cx="500" cy="180" r="70" fill="var(--bg-surface-3)" stroke="white" strokeWidth="1" strokeDasharray="5 5" />
            <text x="500" y="170" fill="white" fontSize="14" fontWeight="bold" textAnchor="middle">Shared Embedding</text>
            <text x="500" y="190" fill="white" fontSize="14" fontWeight="bold" textAnchor="middle">Space</text>
            <text x="500" y="210" fill="var(--text-muted)" fontSize="10" textAnchor="middle">512-Dimensional (L2 Normalized)</text>
          </svg>
        </div>
      </div>

      <div className="architecture-row">
        <div className="left-col">
          <div className="glass-card full-width">
            <h3>Model Components</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Component</th>
                  <th>SAR Encoder (Sentinel-1)</th>
                  <th>Optical Encoder (Sentinel-2)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Input Dimensions</td>
                  <td>2 × 256 × 256</td>
                  <td>4 × 256 × 256</td>
                </tr>
                <tr>
                  <td>Backbone</td>
                  <td>ResNet50 (modified conv1)</td>
                  <td>ResNet50 (modified conv1)</td>
                </tr>
                <tr>
                  <td>Global Average Pooling</td>
                  <td>Yes</td>
                  <td>Yes</td>
                </tr>
                <tr>
                  <td>MLP Dimensions</td>
                  <td>2048 → 512 → 512</td>
                  <td>2048 → 512 → 512</td>
                </tr>
                <tr>
                  <td>Activations</td>
                  <td>ReLU</td>
                  <td>ReLU</td>
                </tr>
                <tr>
                  <td>L2 Normalization</td>
                  <td>Yes</td>
                  <td>Yes</td>
                </tr>
                <tr>
                  <td>Output Dimension</td>
                  <td>512</td>
                  <td>512</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="glass-card full-width mt-4">
            <h3>Embedding Space Visualization</h3>
            <div className="scatter-plot">
              <svg viewBox="0 0 300 150" width="100%" height="150">
                <circle cx="150" cy="75" r="70" fill="none" stroke="var(--border)" strokeDasharray="4 4" />
                {/* SAR Dots */}
                <circle cx="120" cy="60" r="3" fill="var(--accent-violet)" />
                <circle cx="180" cy="90" r="3" fill="var(--accent-violet)" />
                <circle cx="140" cy="110" r="3" fill="var(--accent-violet)" />
                {/* Optical Dots */}
                <circle cx="130" cy="50" r="3" fill="var(--accent-cyan)" />
                <circle cx="190" cy="80" r="3" fill="var(--accent-cyan)" />
                <circle cx="120" cy="120" r="3" fill="var(--accent-cyan)" />
                {/* Lines */}
                <line x1="120" y1="60" x2="130" y2="50" stroke="white" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="180" y1="90" x2="190" y2="80" stroke="white" strokeWidth="1" strokeDasharray="2 2" />
              </svg>
            </div>
            <p className="scatter-caption text-muted" style={{fontSize: '0.75rem', textAlign: 'center'}}>
              Matched pairs are pulled closer, while unmatched pairs are pushed apart.
            </p>
          </div>
        </div>

        <div className="right-col">
          <div className="glass-card summary-card">
            <h3>Architecture Summary</h3>
            <div className="stat-row"><span>Architecture Type</span><strong>Dual Encoder</strong></div>
            <div className="stat-row"><span>Backbone</span><strong>ResNet50 ImageNet Pretrained</strong></div>
            <div className="stat-row"><span>Projection Head</span><strong>2-Layer MLP 2048→512</strong></div>
            <div className="stat-row"><span>Embedding Dimension</span><strong>512 L2 Normalized</strong></div>
            <div className="stat-row"><span>Similarity Metric</span><strong>Cosine Similarity</strong></div>
            <div className="stat-row"><span>Parameters Total</span><strong>~46.2M</strong></div>
            <div className="stat-row"><span>Trainable</span><strong>~23.1M</strong></div>
            <div className="stat-row"><span>Framework</span><strong>PyTorch</strong></div>
          </div>

          <div className="glass-card training-card mt-4">
            <h3>Training Objective</h3>
            <div className="badge badge-sar mb-2">InfoNCE Contrastive Loss</div>
            <p className="text-muted" style={{fontSize: '0.75rem', marginBottom: '12px'}}>
              Optimizes the representation space by maximizing the similarity of matching SAR-Optical pairs while minimizing it for all other pairs in the batch.
            </p>
            <p className="text-muted" style={{fontSize: '0.75rem', marginBottom: '12px'}}>Temperature τ = 0.07</p>
            <div className="formula-box">
              L = -(1/N) Σᵢ log exp(sim(zᵢˢ, zᵢᵒ)/τ) / Σⱼ≠ᵢ exp(sim(zᵢˢ, zⱼᵒ)/τ)
            </div>
          </div>

          <div className="glass-card config-card mt-4">
            <h3>Model Configurations</h3>
            <div className="config-grid">
              <div className="config-item"><span>Input Size</span><strong>256×256</strong></div>
              <div className="config-item"><span>SAR Channels</span><strong>2, VV, VH</strong></div>
              <div className="config-item"><span>Optical Bands</span><strong>4: B4, B8, B11, B12</strong></div>
              <div className="config-item"><span>Batch Size</span><strong>128</strong></div>
              <div className="config-item"><span>Optimizer</span><strong>AdamW</strong></div>
              <div className="config-item"><span>Learning Rate</span><strong>1e-4</strong></div>
              <div className="config-item"><span>Weight Decay</span><strong>1e-4</strong></div>
              <div className="config-item"><span>Scheduler</span><strong>Cosine Annealing</strong></div>
              <div className="config-item"><span>Mixed Precision</span><strong>✅ Enabled</strong></div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="benefits-row mt-4">
        <div className="benefit-card">
          <div className="icon">🔄</div>
          <strong>Modality-Specific Encoders</strong>
        </div>
        <div className="benefit-card">
          <div className="icon">🌐</div>
          <strong>Shared Embedding Space</strong>
        </div>
        <div className="benefit-card">
          <div className="icon">🎯</div>
          <strong>Contrastive Learning Objective</strong>
        </div>
        <div className="benefit-card">
          <div className="icon">📏</div>
          <strong>L2 Normalized Embeddings</strong>
        </div>
        <div className="benefit-card">
          <div className="icon">⚡</div>
          <strong>FAISS Compatible</strong>
        </div>
      </div>
    </div>
  );
}

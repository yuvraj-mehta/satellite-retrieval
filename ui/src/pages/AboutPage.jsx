import React from 'react';
import './AboutPage.css';

export default function AboutPage() {
  return (
    <div className="about-page">
      <div className="about-hero glass-card">
        <div className="hero-content">
          <h1>About SpectraMatch</h1>
          <p className="subtitle">Bridging SAR and Optical Imagery with AI</p>
          <button className="btn-ghost mt-4">Download Brochure</button>
        </div>
        <div className="globe-container">
          <div className="globe-glow"></div>
        </div>
      </div>

      <div className="about-intro">
        <p>
          SpectraMatch is a cross-modal satellite image retrieval system built to break down the barriers between different Earth observation sensors. By leveraging advanced contrastive learning techniques, the system maps both active radar (SAR) and passive optical imagery into a shared embedding space, allowing seamless search across modalities regardless of cloud cover, time of day, or sensor type.
        </p>
      </div>

      <div className="about-columns">
        <div className="left-col">
          <div className="features-grid">
            <div className="feature-card glass-card">
              <div className="icon">🔍</div>
              <h3>Cross-Modal Retrieval</h3>
              <p>Search optical archives using SAR queries, and vice-versa. Eliminates the need for perfectly paired data during operation.</p>
            </div>
            <div className="feature-card glass-card">
              <div className="icon">🧠</div>
              <h3>AI-Powered Matching</h3>
              <p>Dual ResNet50 encoders trained via InfoNCE contrastive loss learn deep semantic relationships between sensors.</p>
            </div>
            <div className="feature-card glass-card">
              <div className="icon">⚡</div>
              <h3>High Performance</h3>
              <p>Sub-millisecond retrieval times using FAISS IndexFlatIP on L2-normalized 512-dimensional embedding vectors.</p>
            </div>
            <div className="feature-card glass-card">
              <div className="icon">🛡️</div>
              <h3>Robust & Scalable</h3>
              <p>Built for production with FastAPI, React, and PyTorch. Easily scales to millions of satellite image patches.</p>
            </div>
          </div>

          <div className="glass-card full-width mt-4">
            <h3 style={{marginBottom: '16px', color: 'white'}}>System Workflow</h3>
            <div className="workflow-diagram">
              <div className="flow-step">
                <strong>Input Query</strong>
                <span>SAR or Optical</span>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <strong>Feature Extraction</strong>
                <span>Dual ResNet50</span>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <strong>Shared Embedding</strong>
                <span>512-D Space</span>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <strong>Similarity Search</strong>
                <span>FAISS Index</span>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <strong>Top-K Results</strong>
                <span>Ranked Matches</span>
              </div>
            </div>
          </div>
        </div>

        <div className="right-col">
          <div className="glass-card project-overview">
            <h3>Project Overview</h3>
            <table className="overview-table">
              <tbody>
                <tr>
                  <td>Project Name</td>
                  <td><strong>SpectraMatch</strong></td>
                </tr>
                <tr>
                  <td>Project Type</td>
                  <td><strong>Cross-Modal AI System</strong></td>
                </tr>
                <tr>
                  <td>Primary Dataset</td>
                  <td><strong>SEN12MS (Subset)</strong></td>
                </tr>
                <tr>
                  <td>Modalities</td>
                  <td><strong>Sentinel-1, Sentinel-2</strong></td>
                </tr>
                <tr>
                  <td>Developed For</td>
                  <td><strong>Bharatiya Antariksh Hackathon 2024</strong></td>
                </tr>
                <tr>
                  <td>Duration</td>
                  <td><strong>3 Months</strong></td>
                </tr>
                <tr>
                  <td>Version</td>
                  <td><strong>v1.0.0</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="glass-card mt-4 goal-card">
            <h3>Our Goal</h3>
            <p className="text-muted" style={{fontSize: '0.875rem', marginBottom: '12px'}}>
              To provide a reliable, fast, and scalable tool for Earth Observation analysts to find relevant imagery across sensor types, improving disaster response, environmental monitoring, and intelligence gathering.
            </p>
            <ul className="check-list">
              <li><span className="check">✓</span> Overcome cloud cover limitations using SAR</li>
              <li><span className="check">✓</span> Enable rapid semantic search</li>
              <li><span className="check">✓</span> Provide intuitive visual interfaces</li>
              <li><span className="check">✓</span> Ensure enterprise-grade performance</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="glass-card stack-card mt-4">
        <h3 style={{marginBottom: '20px', color: 'white'}}>Technology Stack</h3>
        <div className="stack-grid">
          <div className="stack-col">
            <h4>Framework</h4>
            <ul>
              <li>React 18</li>
              <li>FastAPI</li>
              <li>Vite</li>
            </ul>
          </div>
          <div className="stack-col">
            <h4>Models</h4>
            <ul>
              <li>PyTorch</li>
              <li>ResNet50 Backbone</li>
              <li>InfoNCE Loss</li>
            </ul>
          </div>
          <div className="stack-col">
            <h4>Search & Indexing</h4>
            <ul>
              <li>FAISS</li>
              <li>Cosine Similarity</li>
              <li>L2 Normalization</li>
            </ul>
          </div>
          <div className="stack-col">
            <h4>Data Processing</h4>
            <ul>
              <li>Rasterio</li>
              <li>NumPy</li>
              <li>PIL</li>
            </ul>
          </div>
          <div className="stack-col">
            <h4>Visualization</h4>
            <ul>
              <li>Vanilla CSS</li>
              <li>Inline SVG</li>
              <li>React Router</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="glass-card team-card mt-4">
        <h3 style={{marginBottom: '20px', color: 'white'}}>Team ISRO</h3>
        <div className="team-grid">
          <div className="team-member">
            <div className="avatar bg-violet">AK</div>
            <div className="info">
              <strong>Aman Kumar</strong>
              <span>ML Engineer</span>
            </div>
          </div>
          <div className="team-member">
            <div className="avatar bg-cyan">RK</div>
            <div className="info">
              <strong>Ritwik Kumar</strong>
              <span>Data Scientist</span>
            </div>
          </div>
          <div className="team-member">
            <div className="avatar bg-blue">SS</div>
            <div className="info">
              <strong>Sneha Singh</strong>
              <span>Frontend Developer</span>
            </div>
          </div>
          <div className="team-member">
            <div className="avatar bg-amber">PS</div>
            <div className="info">
              <strong>Priya Sharma</strong>
              <span>Backend Developer</span>
            </div>
          </div>
        </div>
      </div>

      <footer className="about-footer mt-4">
        <div className="ack-row">
          <span>Supported by</span>
          <strong className="text-white">Indian Space Research Organisation (ISRO)</strong>
          <span>•</span>
          <span>Powered by SEN12MS, FAISS & PyTorch</span>
        </div>
        <div className="copyright">
          © 2024 Team ISRO • SpectraMatch v1.0.0 • All Rights Reserved
        </div>
      </footer>
    </div>
  );
}

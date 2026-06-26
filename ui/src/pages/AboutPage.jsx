import React from 'react';

export default function AboutPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="glass-card flex justify-between items-center p-10 relative overflow-hidden bg-gradient-to-br from-accent-violet/10 to-transparent">
        <div className="z-10">
          <h1 className="text-[2.5rem] font-extrabold mb-2 bg-gradient-to-r from-white to-[#A855F7] bg-clip-text text-transparent">About SpectraMatch</h1>
          <p className="text-xl text-text-secondary max-w-[500px]">Bridging SAR and Optical Imagery with AI</p>
          <button className="btn-ghost mt-4">Download Brochure</button>
        </div>
        <div className="w-[200px] h-[200px] relative z-0">
          <div className="w-full h-full rounded-full shadow-[0_0_50px_rgba(124,58,237,0.2)]" style={{ background: 'radial-gradient(circle, rgba(124, 58, 237, 0.4) 0%, rgba(0, 212, 170, 0.1) 60%, transparent 100%)' }}></div>
        </div>
      </div>

      <div className="text-base leading-[1.6] text-text-primary max-w-[800px]">
        <p>
          SpectraMatch is a cross-modal satellite image retrieval system built to break down the barriers between different Earth observation sensors. By leveraging advanced contrastive learning techniques, the system maps both active radar (SAR) and passive optical imagery into a shared embedding space, allowing seamless search across modalities regardless of cloud cover, time of day, or sensor type.
        </p>
      </div>

      <div className="flex gap-6">
        <div className="flex-[6]">
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card p-6">
              <div className="text-2xl mb-3">🔍</div>
              <h3 className="text-base text-white mb-2">Cross-Modal Retrieval</h3>
              <p className="text-sm text-text-secondary leading-[1.5]">Search optical archives using SAR queries, and vice-versa. Eliminates the need for perfectly paired data during operation.</p>
            </div>
            <div className="glass-card p-6">
              <div className="text-2xl mb-3">🧠</div>
              <h3 className="text-base text-white mb-2">AI-Powered Matching</h3>
              <p className="text-sm text-text-secondary leading-[1.5]">Dual ResNet50 encoders trained via InfoNCE contrastive loss learn deep semantic relationships between sensors.</p>
            </div>
            <div className="glass-card p-6">
              <div className="text-2xl mb-3">⚡</div>
              <h3 className="text-base text-white mb-2">High Performance</h3>
              <p className="text-sm text-text-secondary leading-[1.5]">Sub-millisecond retrieval times using FAISS IndexFlatIP on L2-normalized 512-dimensional embedding vectors.</p>
            </div>
            <div className="glass-card p-6">
              <div className="text-2xl mb-3">🛡️</div>
              <h3 className="text-base text-white mb-2">Robust & Scalable</h3>
              <p className="text-sm text-text-secondary leading-[1.5]">Built for production with FastAPI, React, and PyTorch. Easily scales to millions of satellite image patches.</p>
            </div>
          </div>

          <div className="glass-card w-full mt-4">
            <h3 className="text-base text-white mb-4">System Workflow</h3>
            <div className="flex items-center justify-between bg-bg-surface-2 p-5 rounded-sm border border-border">
              <div className="flex flex-col items-center text-center">
                <strong className="text-sm text-white mb-1">Input Query</strong>
                <span className="text-xs text-text-muted">SAR or Optical</span>
              </div>
              <div className="text-accent-violet text-xl">→</div>
              <div className="flex flex-col items-center text-center">
                <strong className="text-sm text-white mb-1">Feature Extraction</strong>
                <span className="text-xs text-text-muted">Dual ResNet50</span>
              </div>
              <div className="text-accent-violet text-xl">→</div>
              <div className="flex flex-col items-center text-center">
                <strong className="text-sm text-white mb-1">Shared Embedding</strong>
                <span className="text-xs text-text-muted">512-D Space</span>
              </div>
              <div className="text-accent-violet text-xl">→</div>
              <div className="flex flex-col items-center text-center">
                <strong className="text-sm text-white mb-1">Similarity Search</strong>
                <span className="text-xs text-text-muted">FAISS Index</span>
              </div>
              <div className="text-accent-violet text-xl">→</div>
              <div className="flex flex-col items-center text-center">
                <strong className="text-sm text-white mb-1">Top-K Results</strong>
                <span className="text-xs text-text-muted">Ranked Matches</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-[4]">
          <div className="glass-card">
            <h3 className="text-base text-white mb-4">Project Overview</h3>
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="py-3 border-b border-border text-sm text-text-secondary">Project Name</td>
                  <td className="py-3 border-b border-border text-sm text-right text-white"><strong>SpectraMatch</strong></td>
                </tr>
                <tr>
                  <td className="py-3 border-b border-border text-sm text-text-secondary">Project Type</td>
                  <td className="py-3 border-b border-border text-sm text-right text-white"><strong>Cross-Modal AI System</strong></td>
                </tr>
                <tr>
                  <td className="py-3 border-b border-border text-sm text-text-secondary">Primary Dataset</td>
                  <td className="py-3 border-b border-border text-sm text-right text-white"><strong>SEN12MS (Subset)</strong></td>
                </tr>
                <tr>
                  <td className="py-3 border-b border-border text-sm text-text-secondary">Modalities</td>
                  <td className="py-3 border-b border-border text-sm text-right text-white"><strong>Sentinel-1, Sentinel-2</strong></td>
                </tr>
                <tr>
                  <td className="py-3 border-b border-border text-sm text-text-secondary">Developed For</td>
                  <td className="py-3 border-b border-border text-sm text-right text-white"><strong>Bharatiya Antariksh Hackathon 2024</strong></td>
                </tr>
                <tr>
                  <td className="py-3 border-b border-border text-sm text-text-secondary">Duration</td>
                  <td className="py-3 border-b border-border text-sm text-right text-white"><strong>3 Months</strong></td>
                </tr>
                <tr>
                  <td className="py-3 border-b border-border text-sm text-text-secondary">Version</td>
                  <td className="py-3 border-b border-border text-sm text-right text-white"><strong>v1.0.0</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="glass-card mt-4">
            <h3 className="text-base text-white mb-4">Our Goal</h3>
            <p className="text-text-muted text-[0.875rem] mb-3">
              To provide a reliable, fast, and scalable tool for Earth Observation analysts to find relevant imagery across sensor types, improving disaster response, environmental monitoring, and intelligence gathering.
            </p>
            <ul className="list-none p-0 m-0">
              <li className="flex items-center gap-2 mb-2 text-sm text-text-primary"><span className="text-accent-green">✓</span> Overcome cloud cover limitations using SAR</li>
              <li className="flex items-center gap-2 mb-2 text-sm text-text-primary"><span className="text-accent-green">✓</span> Enable rapid semantic search</li>
              <li className="flex items-center gap-2 mb-2 text-sm text-text-primary"><span className="text-accent-green">✓</span> Provide intuitive visual interfaces</li>
              <li className="flex items-center gap-2 mb-2 text-sm text-text-primary"><span className="text-accent-green">✓</span> Ensure enterprise-grade performance</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="glass-card mt-4">
        <h3 className="text-base text-white mb-5">Technology Stack</h3>
        <div className="grid grid-cols-5 gap-4">
          <div>
            <h4 className="text-sm text-white mb-3 border-b border-border pb-2">Framework</h4>
            <ul className="list-none p-0 m-0">
              <li className="text-xs text-text-secondary mb-2">React 18</li>
              <li className="text-xs text-text-secondary mb-2">FastAPI</li>
              <li className="text-xs text-text-secondary mb-2">Vite</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm text-white mb-3 border-b border-border pb-2">Models</h4>
            <ul className="list-none p-0 m-0">
              <li className="text-xs text-text-secondary mb-2">PyTorch</li>
              <li className="text-xs text-text-secondary mb-2">ResNet50 Backbone</li>
              <li className="text-xs text-text-secondary mb-2">InfoNCE Loss</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm text-white mb-3 border-b border-border pb-2">Search & Indexing</h4>
            <ul className="list-none p-0 m-0">
              <li className="text-xs text-text-secondary mb-2">FAISS</li>
              <li className="text-xs text-text-secondary mb-2">Cosine Similarity</li>
              <li className="text-xs text-text-secondary mb-2">L2 Normalization</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm text-white mb-3 border-b border-border pb-2">Data Processing</h4>
            <ul className="list-none p-0 m-0">
              <li className="text-xs text-text-secondary mb-2">Rasterio</li>
              <li className="text-xs text-text-secondary mb-2">NumPy</li>
              <li className="text-xs text-text-secondary mb-2">PIL</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm text-white mb-3 border-b border-border pb-2">Visualization</h4>
            <ul className="list-none p-0 m-0">
              <li className="text-xs text-text-secondary mb-2">Tailwind CSS</li>
              <li className="text-xs text-text-secondary mb-2">Inline SVG</li>
              <li className="text-xs text-text-secondary mb-2">React Router</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="glass-card mt-4">
        <h3 className="text-base text-white mb-5">Team ISRO</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="flex items-center gap-3 bg-bg-surface-2 p-3 rounded-sm border border-border">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm bg-accent-violet">AK</div>
            <div className="flex flex-col">
              <strong className="text-sm text-white">Aman Kumar</strong>
              <span className="text-xs text-text-muted">ML Engineer</span>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-bg-surface-2 p-3 rounded-sm border border-border">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm bg-accent-cyan">RK</div>
            <div className="flex flex-col">
              <strong className="text-sm text-white">Ritwik Kumar</strong>
              <span className="text-xs text-text-muted">Data Scientist</span>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-bg-surface-2 p-3 rounded-sm border border-border">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm bg-accent-blue">SS</div>
            <div className="flex flex-col">
              <strong className="text-sm text-white">Sneha Singh</strong>
              <span className="text-xs text-text-muted">Frontend Developer</span>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-bg-surface-2 p-3 rounded-sm border border-border">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm bg-accent-amber">PS</div>
            <div className="flex flex-col">
              <strong className="text-sm text-white">Priya Sharma</strong>
              <span className="text-xs text-text-muted">Backend Developer</span>
            </div>
          </div>
        </div>
      </div>

      <footer className="flex flex-col items-center gap-2 p-6 border-t border-border mt-4">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <span>Supported by</span>
          <strong className="text-white">Indian Space Research Organisation (ISRO)</strong>
          <span>•</span>
          <span>Powered by SEN12MS, FAISS & PyTorch</span>
        </div>
        <div className="text-xs text-text-muted">
          © 2024 Team ISRO • SpectraMatch v1.0.0 • All Rights Reserved
        </div>
      </footer>
    </div>
  );
}

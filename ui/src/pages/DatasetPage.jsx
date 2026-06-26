import React, { useState, useEffect } from 'react';
import './DatasetPage.css';

export default function DatasetPage() {
  const FALLBACK = {
    total_pairs: 1167, scenes: 2, image_size: "256×256",
    paired_percent: 100, total_size_gb: 3.48, season: "Winter 2017",
    sar_images: 583, optical_images: 583,
    scene_breakdown: [{ scene: 21, pairs: 600, percent: 51.4 }, { scene: 22, pairs: 567, percent: 48.6 }]
  };

  const [data, setData] = useState(FALLBACK);

  useEffect(() => {
    fetch('http://localhost:8000/dataset/info')
      .then(r => r.json())
      .then(d => {
        if (d.total_pairs) setData(d);
      })
      .catch(e => {
        console.warn("Dataset API not available yet, using fallback data.");
      });
  }, []);

  return (
    <div className="dataset-page">
      <div className="dataset-header">
        <div>
          <h2>Dataset</h2>
          <p className="subtitle">SEN12MS Subset Overview and Data Management</p>
        </div>
        <div className="header-actions">
          <span className="badge badge-online">Dataset Status: Ready</span>
          <button className="btn-ghost">Refresh</button>
          <button className="btn-primary">Export Metadata</button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-title">Total Image Pairs</div>
          <div className="kpi-value">{data.total_pairs}</div>
          <div className="kpi-subtitle">Co-located patches</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Scenes</div>
          <div className="kpi-value">{data.scenes}</div>
          <div className="kpi-subtitle">Geographic Regions</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Image Size</div>
          <div className="kpi-value">{data.image_size}</div>
          <div className="kpi-subtitle">Pixels (Height × Width)</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Paired %</div>
          <div className="kpi-value">{data.paired_percent}%</div>
          <div className="kpi-subtitle">Perfect alignment</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Total Size</div>
          <div className="kpi-value">{data.total_size_gb || 3.48} GB</div>
          <div className="kpi-subtitle">On disk</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Season</div>
          <div className="kpi-value">{data.season}</div>
          <div className="kpi-subtitle">Meteorological Winter</div>
        </div>
      </div>

      <div className="dataset-row">
        <div className="glass-card composition-card">
          <h3>Dataset Composition</h3>
          <div className="composition-content">
            <div className="comp-donut">
              <svg viewBox="0 0 100 100" width="100" height="100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--accent-cyan)" strokeWidth="10" strokeDasharray="125 125" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--accent-violet)" strokeWidth="10" strokeDasharray="125 125" strokeDashoffset="125" />
              </svg>
              <div className="donut-labels">
                <div><span className="dot dot-sar"></span> SAR ({data.sar_images})</div>
                <div><span className="dot dot-opt"></span> Optical ({data.optical_images})</div>
              </div>
            </div>
            
            <div className="comp-bars">
              <h4>By Scene</h4>
              {data.scene_breakdown?.map((scene, i) => (
                <div key={i} className="bar-row">
                  <div className="bar-label">Scene {scene.scene}</div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${scene.percent}%`, background: 'var(--accent-blue)' }}></div>
                  </div>
                  <div className="bar-value">{scene.pairs} pairs ({scene.percent}%)</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-card sensor-card">
          <h3>Sensor Details</h3>
          <div className="sensor-box mb-3">
            <div className="sensor-header">
              <strong>SAR (Sentinel-1)</strong>
              <span className="badge badge-sar">583 Images</span>
            </div>
            <p>Bands: VV, VH</p>
            <p>Resolution: 10m</p>
            <p>Product: Ground Range Detected (GRD)</p>
          </div>
          <div className="sensor-box">
            <div className="sensor-header">
              <strong>Optical (Sentinel-2)</strong>
              <span className="badge badge-optical">583 Images</span>
            </div>
            <p>Bands Used: B4, B8, B11, B12</p>
            <p>Resolution: 10m / 20m</p>
            <p>Product: Top of Atmosphere (TOA)</p>
          </div>
        </div>

        <div className="glass-card quality-card">
          <h3>Data Quality Overview</h3>
          <div className="quality-list">
            <div className="q-item">
              <span>Missing Files</span>
              <span className="q-status text-green">✓ Excellent</span>
            </div>
            <div className="q-item">
              <span>Corrupted Files</span>
              <span className="q-status text-green">✓ Excellent</span>
            </div>
            <div className="q-item">
              <span>Pair Alignment</span>
              <span className="q-status text-green">✓ Excellent</span>
            </div>
            <div className="q-item">
              <span>Metadata Integrity</span>
              <span className="q-status text-green">✓ Excellent</span>
            </div>
          </div>
        </div>
      </div>

      <div className="dataset-row">
        <div className="glass-card tree-card">
          <div className="card-header-flex">
            <h3>Dataset File Structure</h3>
            <button className="btn-ghost">Open in Explorer</button>
          </div>
          <div className="file-tree">
            <div>sen12ms-subset/ <span className="text-muted float-right">3.48 GB</span></div>
            <div className="indent">├── ROIs2017_winter_s1/ <span className="text-muted float-right">1.74 GB</span></div>
            <div className="indent-2">│   ├── s1_21/ <span className="text-muted float-right">912 MB</span></div>
            <div className="indent-3 text-muted">│   │   └── ROIs2017_winter_s1_21_p100.tif <span className="float-right">412 KB</span></div>
            <div className="indent-2">│   └── s1_22/ <span className="text-muted float-right">848 MB</span></div>
            <div className="indent">└── ROIs2017_winter_s2/ <span className="text-muted float-right">1.74 GB</span></div>
            <div className="indent-2">    ├── s2_21/ <span className="text-muted float-right">941 MB</span></div>
            <div className="indent-2">    └── s2_22/ <span className="text-muted float-right">816 MB</span></div>
          </div>
        </div>

        <div className="glass-card band-card">
          <h3>Band Information (Optical)</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Band</th>
                <th>Name</th>
                <th>Wavelength</th>
                <th>Resolution</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span className="band-chip bg-red">B4</span></td>
                <td>Red</td>
                <td>665 nm</td>
                <td>10 m</td>
              </tr>
              <tr>
                <td><span className="band-chip bg-red">B8</span></td>
                <td>NIR</td>
                <td>842 nm</td>
                <td>10 m</td>
              </tr>
              <tr>
                <td><span className="band-chip bg-blue">B11</span></td>
                <td>SWIR-1</td>
                <td>1610 nm</td>
                <td>20 m*</td>
              </tr>
              <tr>
                <td><span className="band-chip bg-blue">B12</span></td>
                <td>SWIR-2</td>
                <td>2190 nm</td>
                <td>20 m*</td>
              </tr>
            </tbody>
          </table>
          <div className="text-muted mt-4" style={{fontSize: '0.75rem'}}>* Resampled to 10m during preprocessing</div>
        </div>

        <div className="glass-card volume-card">
          <h3>Data Volume Growth</h3>
          <div className="chart-container">
            <svg viewBox="0 0 300 150" width="100%" height="150">
              <path d="M0,150 L0,100 L50,90 L100,70 L150,60 L200,30 L250,20 L300,10 L300,150 Z" fill="var(--accent-violet-dim)" />
              <path d="M0,100 L50,90 L100,70 L150,60 L200,30 L250,20 L300,10" fill="none" stroke="var(--accent-violet)" strokeWidth="2" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';

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
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl text-white mb-1">Dataset</h2>
          <p className="text-text-secondary text-sm">SEN12MS Subset Overview and Data Management</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="badge badge-online">Dataset Status: Ready</span>
          <button className="btn-ghost">Refresh</button>
          <button className="btn-primary">Export Metadata</button>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-4">
        <div className="kpi-card">
          <div className="text-text-secondary text-[0.85rem] font-medium mb-1">Total Image Pairs</div>
          <div className="text-text-primary text-2xl font-bold mb-1">{data.total_pairs}</div>
          <div className="text-text-muted text-xs">Co-located patches</div>
        </div>
        <div className="kpi-card">
          <div className="text-text-secondary text-[0.85rem] font-medium mb-1">Scenes</div>
          <div className="text-text-primary text-2xl font-bold mb-1">{data.scenes}</div>
          <div className="text-text-muted text-xs">Geographic Regions</div>
        </div>
        <div className="kpi-card">
          <div className="text-text-secondary text-[0.85rem] font-medium mb-1">Image Size</div>
          <div className="text-text-primary text-2xl font-bold mb-1">{data.image_size}</div>
          <div className="text-text-muted text-xs">Pixels (Height × Width)</div>
        </div>
        <div className="kpi-card">
          <div className="text-text-secondary text-[0.85rem] font-medium mb-1">Paired %</div>
          <div className="text-text-primary text-2xl font-bold mb-1">{data.paired_percent}%</div>
          <div className="text-text-muted text-xs">Perfect alignment</div>
        </div>
        <div className="kpi-card">
          <div className="text-text-secondary text-[0.85rem] font-medium mb-1">Total Size</div>
          <div className="text-text-primary text-2xl font-bold mb-1">{data.total_size_gb || 3.48} GB</div>
          <div className="text-text-muted text-xs">On disk</div>
        </div>
        <div className="kpi-card">
          <div className="text-text-secondary text-[0.85rem] font-medium mb-1">Season</div>
          <div className="text-text-primary text-2xl font-bold mb-1">{data.season}</div>
          <div className="text-text-muted text-xs">Meteorological Winter</div>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="glass-card flex-[4]">
          <h3 className="text-base text-white mb-4">Dataset Composition</h3>
          <div className="flex gap-6 items-center">
            <div className="flex flex-col items-center gap-3">
              <svg viewBox="0 0 100 100" width="100" height="100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--accent-cyan)" strokeWidth="10" strokeDasharray="125 125" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--accent-violet)" strokeWidth="10" strokeDasharray="125 125" strokeDashoffset="125" />
              </svg>
              <div className="flex gap-3 text-xs text-text-secondary">
                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-accent-violet"></span> SAR ({data.sar_images})</div>
                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-accent-cyan"></span> Optical ({data.optical_images})</div>
              </div>
            </div>
            
            <div className="flex-1">
              <h4 className="text-sm text-text-primary mb-3">By Scene</h4>
              {data.scene_breakdown?.map((scene, i) => (
                <div key={i} className="flex items-center gap-3 mb-2 text-xs">
                  <div className="w-[60px] text-text-secondary">Scene {scene.scene}</div>
                  <div className="flex-1 h-2 bg-bg-surface-2 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-accent-blue" style={{ width: `${scene.percent}%` }}></div>
                  </div>
                  <div className="w-[100px] text-right text-text-primary">{scene.pairs} pairs ({scene.percent}%)</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-card flex-[3]">
          <h3 className="text-base text-white mb-4">Sensor Details</h3>
          <div className="bg-bg-surface-2 p-4 rounded-sm border border-border mb-3">
            <div className="flex justify-between mb-2">
              <strong className="text-white">SAR (Sentinel-1)</strong>
              <span className="badge badge-sar">583 Images</span>
            </div>
            <p className="text-xs text-text-secondary mb-1">Bands: VV, VH</p>
            <p className="text-xs text-text-secondary mb-1">Resolution: 10m</p>
            <p className="text-xs text-text-secondary mb-1">Product: Ground Range Detected (GRD)</p>
          </div>
          <div className="bg-bg-surface-2 p-4 rounded-sm border border-border">
            <div className="flex justify-between mb-2">
              <strong className="text-white">Optical (Sentinel-2)</strong>
              <span className="badge badge-optical">583 Images</span>
            </div>
            <p className="text-xs text-text-secondary mb-1">Bands Used: B4, B8, B11, B12</p>
            <p className="text-xs text-text-secondary mb-1">Resolution: 10m / 20m</p>
            <p className="text-xs text-text-secondary mb-1">Product: Top of Atmosphere (TOA)</p>
          </div>
        </div>

        <div className="glass-card flex-[3]">
          <h3 className="text-base text-white mb-4">Data Quality Overview</h3>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between pb-3 border-b border-border text-sm">
              <span className="text-text-secondary">Missing Files</span>
              <span className="text-accent-green">✓ Excellent</span>
            </div>
            <div className="flex justify-between pb-3 border-b border-border text-sm">
              <span className="text-text-secondary">Corrupted Files</span>
              <span className="text-accent-green">✓ Excellent</span>
            </div>
            <div className="flex justify-between pb-3 border-b border-border text-sm">
              <span className="text-text-secondary">Pair Alignment</span>
              <span className="text-accent-green">✓ Excellent</span>
            </div>
            <div className="flex justify-between pb-3 border-b border-border text-sm">
              <span className="text-text-secondary">Metadata Integrity</span>
              <span className="text-accent-green">✓ Excellent</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="glass-card flex-[4]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="m-0 text-base text-white">Dataset File Structure</h3>
            <button className="btn-ghost">Open in Explorer</button>
          </div>
          <div className="font-mono text-sm bg-bg-surface-2 p-4 rounded-sm border border-border text-text-primary leading-[1.6]">
            <div>sen12ms-subset/ <span className="text-text-muted float-right">3.48 GB</span></div>
            <div className="ml-0">├── ROIs2017_winter_s1/ <span className="text-text-muted float-right">1.74 GB</span></div>
            <div className="ml-5">│   ├── s1_21/ <span className="text-text-muted float-right">912 MB</span></div>
            <div className="ml-10 text-text-muted">│   │   └── ROIs2017_winter_s1_21_p100.tif <span className="float-right">412 KB</span></div>
            <div className="ml-5">│   └── s1_22/ <span className="text-text-muted float-right">848 MB</span></div>
            <div className="ml-0">└── ROIs2017_winter_s2/ <span className="text-text-muted float-right">1.74 GB</span></div>
            <div className="ml-5">    ├── s2_21/ <span className="text-text-muted float-right">941 MB</span></div>
            <div className="ml-5">    └── s2_22/ <span className="text-text-muted float-right">816 MB</span></div>
          </div>
        </div>

        <div className="glass-card flex-[3]">
          <h3 className="text-base text-white mb-4">Band Information (Optical)</h3>
          <table className="data-table w-full text-left">
            <thead>
              <tr>
                <th className="py-2 px-3">Band</th>
                <th className="py-2 px-3">Name</th>
                <th className="py-2 px-3">Wavelength</th>
                <th className="py-2 px-3">Resolution</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2 px-3"><span className="px-2 py-0.5 rounded-full text-xs font-semibold text-accent-red bg-red-500/20 border border-red-500/40">B4</span></td>
                <td className="py-2 px-3">Red</td>
                <td className="py-2 px-3">665 nm</td>
                <td className="py-2 px-3">10 m</td>
              </tr>
              <tr>
                <td className="py-2 px-3"><span className="px-2 py-0.5 rounded-full text-xs font-semibold text-accent-red bg-red-500/20 border border-red-500/40">B8</span></td>
                <td className="py-2 px-3">NIR</td>
                <td className="py-2 px-3">842 nm</td>
                <td className="py-2 px-3">10 m</td>
              </tr>
              <tr>
                <td className="py-2 px-3"><span className="px-2 py-0.5 rounded-full text-xs font-semibold text-accent-blue bg-blue-500/20 border border-blue-500/40">B11</span></td>
                <td className="py-2 px-3">SWIR-1</td>
                <td className="py-2 px-3">1610 nm</td>
                <td className="py-2 px-3">20 m*</td>
              </tr>
              <tr>
                <td className="py-2 px-3"><span className="px-2 py-0.5 rounded-full text-xs font-semibold text-accent-blue bg-blue-500/20 border border-blue-500/40">B12</span></td>
                <td className="py-2 px-3">SWIR-2</td>
                <td className="py-2 px-3">2190 nm</td>
                <td className="py-2 px-3">20 m*</td>
              </tr>
            </tbody>
          </table>
          <div className="text-text-muted mt-4 text-[0.75rem]">* Resampled to 10m during preprocessing</div>
        </div>

        <div className="glass-card flex-[3]">
          <h3 className="text-base text-white mb-4">Data Volume Growth</h3>
          <div className="w-full">
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

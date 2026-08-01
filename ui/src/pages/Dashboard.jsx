import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';

export default function Dashboard() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);

  useEffect(() => {
    // Load history from localStorage
    try {
      const stored = localStorage.getItem('spectra_query_history');
      if (stored) {
        setHistory(JSON.parse(stored).slice(0, 4));
      } else {
        // Fallback for visual demonstration if empty
        setHistory([
          { queryModality: 'sar', targetModality: 'optical', sceneId: '21', patchId: '30', retrievalMs: 235.73, timestamp: Date.now() - 10000, path: 'ROIs2017_winter_s1/s1_21/ROIs2017_winter_s1_21_p30.tif' },
          { queryModality: 'sar', targetModality: 'optical', sceneId: '21', patchId: '30', retrievalMs: 85.25, timestamp: Date.now() - 300000, path: 'ROIs2017_winter_s1/s1_21/ROIs2017_winter_s1_21_p30.tif' },
          { queryModality: 'sar', targetModality: 'optical', sceneId: '21', patchId: '30', retrievalMs: 90.96, timestamp: Date.now() - 500000, path: 'ROIs2017_winter_s1/s1_21/ROIs2017_winter_s1_21_p30.tif' },
          { queryModality: 'sar', targetModality: 'optical', sceneId: '21', patchId: '30', retrievalMs: 91.37, timestamp: Date.now() - 700000, path: 'ROIs2017_winter_s1/s1_21/ROIs2017_winter_s1_21_p30.tif' }
        ]);
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
  }, []);

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1440px] mx-auto text-white">
      
      {/* Hero Section */}
      <div 
        className="relative overflow-hidden rounded-2xl border border-white/5 h-[360px] flex flex-col justify-center px-12"
        style={{
          background: "linear-gradient(to right, #0A0E1A 40%, transparent 100%), url('/hero_bg.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center right',
          backgroundColor: '#0A0E1A'
        }}
      >
        {/* Glow overlay to match reference */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0E1A] via-transparent to-transparent opacity-80 pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0E1A] via-[#0A0E1A]/80 to-transparent pointer-events-none"></div>

        <div className="relative z-[2] max-w-[600px] mt-4">
          <div className="text-accent-violet-light text-[15px] font-medium mb-1">Welcome back,</div>
          <h1 className="text-[2.75rem] font-bold leading-tight mb-4 tracking-tight">
            Cross-Modal Satellite <br/>
            Image <span className="text-accent-violet-light">Retrieval</span>
          </h1>
          <p className="text-text-secondary text-[15px] leading-relaxed mb-8 max-w-[440px]">
            Search and analyze satellite imagery across SAR and Optical modalities with AI precision.
          </p>
          <div className="flex gap-4">
            <button 
              className="bg-accent-violet hover:bg-accent-violet-light text-white px-6 py-3 rounded-md font-medium text-[15px] transition-all duration-200 flex items-center gap-2 shadow-[0_0_20px_rgba(124,58,237,0.3)]"
              onClick={() => navigate('/search')}
            >
              Start Search
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 16 16 12 12 8"></polyline><line x1="8" y1="12" x2="16" y2="12"></line></svg>
            </button>
            <button 
              className="bg-transparent hover:bg-white/5 border border-white/10 text-white px-6 py-3 rounded-md font-medium text-[15px] transition-all duration-200 flex items-center gap-2"
              onClick={() => navigate('/analytics')}
            >
              View Analytics
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            </button>
          </div>
        </div>
      </div>

      {/* 3-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Queries */}
        <div className="bg-[#06080F]/90 backdrop-blur-xl border border-white/5 rounded-xl p-6 flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[15px] font-semibold text-white">Recent Queries</h3>
            <button className="text-accent-violet-light text-xs font-medium hover:text-white transition-colors">View All</button>
          </div>
          
          <div className="flex flex-col gap-4 flex-1">
            {history.map((q, i) => {
              const date = new Date(q.timestamp);
              const timeStr = `${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}:${date.getSeconds().toString().padStart(2,'0')}`;
              
              return (
                <div key={i} className="flex items-center justify-between group cursor-pointer hover:bg-white/5 p-2 -mx-2 rounded-lg transition-colors">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="bg-accent-violet/10 text-accent-violet-light text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">{q.queryModality}</span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                      <span className="bg-accent-cyan/10 text-accent-cyan text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">{q.targetModality}</span>
                    </div>
                    <div className="text-[11px] text-text-muted flex items-center gap-2">
                      <span>{q.retrievalMs.toFixed(2)}ms</span>
                      <span className="w-1 h-1 rounded-full bg-border"></span>
                      <span>{timeStr}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <span className="text-white text-[13px] font-medium">Scene {q.sceneId} / Patch {q.patchId}</span>
                    <div className="w-10 h-10 rounded overflow-hidden border border-white/10 opacity-80 group-hover:opacity-100 transition-opacity">
                      {q.path ? (
                        <div className="w-full h-full bg-[#0B0E17] relative">
                          <img src={`${API_BASE}/image?path=${encodeURIComponent(q.path)}&modality=${q.queryModality}`} className="w-full h-full object-contain" alt="Thumb"/>
                        </div>
                      ) : (
                        <div className="w-full h-full bg-white/5"></div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          
          <button className="w-full mt-4 py-3 border border-white/5 rounded-md text-accent-violet-light text-[13px] font-medium hover:bg-white/5 transition-colors flex items-center justify-center gap-2" onClick={() => navigate('/search')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            New Query
          </button>
        </div>

        {/* Performance Overview */}
        <div className="bg-[#06080F]/90 backdrop-blur-xl border border-white/5 rounded-xl p-6 flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[15px] font-semibold text-white">Performance Overview</h3>
            <div className="flex items-center gap-1 text-[11px] text-text-muted bg-white/5 px-3 py-1.5 rounded-full border border-white/5 cursor-pointer">
              Last 7 Days
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-6 mb-8 text-[11px] text-text-muted">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent-violet-light shadow-[0_0_8px_rgba(168,85,247,0.8)]"></span>
              F1@5 (Cross-Modal)
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent-cyan shadow-[0_0_8px_rgba(0,212,170,0.8)]"></span>
              Recall@5 (Cross-Modal)
            </div>
          </div>
          
          <div className="flex-1 relative mb-6">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
              {/* Grid Lines */}
              <line x1="10" y1="20" x2="100" y2="20" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" strokeDasharray="2,2"/>
              <line x1="10" y1="45" x2="100" y2="45" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" strokeDasharray="2,2"/>
              <line x1="10" y1="70" x2="100" y2="70" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" strokeDasharray="2,2"/>
              <line x1="10" y1="95" x2="100" y2="95" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" strokeDasharray="2,2"/>
              
              {/* Y Axis Labels */}
              <text x="5" y="22" fill="var(--text-muted)" fontSize="3" textAnchor="end">1.00</text>
              <text x="5" y="47" fill="var(--text-muted)" fontSize="3" textAnchor="end">0.75</text>
              <text x="5" y="72" fill="var(--text-muted)" fontSize="3" textAnchor="end">0.50</text>
              <text x="5" y="97" fill="var(--text-muted)" fontSize="3" textAnchor="end">0.00</text>

              {/* Data Points (Approximated from image) */}
              {/* F1 Line (Purple) */}
              <path d="M 15 65 L 25 55 L 35 62 L 45 60 L 55 58 L 65 60 L 75 59 L 85 58 L 95 62" fill="none" stroke="var(--accent-violet-light)" strokeWidth="1"/>
              {[15, 25, 35, 45, 55, 65, 75, 85, 95].map((x, i) => (
                <circle key={`f1-${i}`} cx={x} cy={[65, 55, 62, 60, 58, 60, 59, 58, 62][i]} r="1.5" fill="var(--accent-violet-light)" />
              ))}

              {/* Recall Line (Cyan) */}
              <path d="M 15 85 L 25 80 L 35 83 L 45 80 L 55 78 L 65 80 L 75 80 L 85 79 L 95 82" fill="none" stroke="var(--accent-cyan)" strokeWidth="1"/>
              {[15, 25, 35, 45, 55, 65, 75, 85, 95].map((x, i) => (
                <circle key={`r-${i}`} cx={x} cy={[85, 80, 83, 80, 78, 80, 80, 79, 82][i]} r="1.5" fill="var(--accent-cyan)" />
              ))}
            </svg>
            {/* X Axis Labels */}
            <div className="absolute bottom-[-15px] left-[15%] right-0 flex justify-between text-[10px] text-text-muted">
              <span>May 15</span>
              <span>May 16</span>
              <span>May 17</span>
              <span>May 18</span>
              <span>May 19</span>
              <span>May 20</span>
              <span>May 21</span>
            </div>
          </div>
          
          <button className="w-full py-3 border border-white/5 rounded-md text-accent-violet-light text-[13px] font-medium hover:bg-white/5 transition-colors flex items-center justify-center gap-2" onClick={() => navigate('/analytics')}>
            View Full Analytics Report
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          </button>
        </div>

        {/* System Status */}
        <div className="bg-[#06080F]/90 backdrop-blur-xl border border-white/5 rounded-xl p-6 flex flex-col h-[400px]">
          <h3 className="text-[15px] font-semibold text-white mb-6">System Status</h3>
          
          <div className="flex items-center justify-between border-b border-white/5 pb-6 mb-6">
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-accent-violet/20 text-accent-violet flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>
                </div>
                <span className="text-xl font-bold">32%</span>
              </div>
              <span className="text-[11px] text-text-muted">CPU</span>
            </div>
            
            <div className="w-px h-8 bg-white/5"></div>
            
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-accent-cyan/20 text-accent-cyan flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                </div>
                <span className="text-xl font-bold">58%</span>
              </div>
              <span className="text-[11px] text-text-muted">Memory</span>
            </div>
            
            <div className="w-px h-8 bg-white/5"></div>
            
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-accent-amber/20 text-accent-amber flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
                </div>
                <span className="text-xl font-bold">41%</span>
              </div>
              <span className="text-[11px] text-text-muted">Disk</span>
            </div>
          </div>
          
          <div className="flex flex-col gap-4 flex-1 justify-center px-2">
            {[
              { label: 'Backend API', status: 'Online', textClass: 'text-accent-green', bgClass: 'bg-accent-green', shadowClass: 'shadow-[0_0_6px_rgba(16,185,129,0.8)]' },
              { label: 'ML Model (ResNet50)', status: 'Loaded', textClass: 'text-accent-green', bgClass: 'bg-accent-green', shadowClass: 'shadow-[0_0_6px_rgba(16,185,129,0.8)]' },
              { label: 'FAISS Index', status: 'Ready', textClass: 'text-accent-cyan', bgClass: 'bg-accent-cyan', shadowClass: 'shadow-[0_0_6px_rgba(0,212,170,0.8)]' },
              { label: 'GPU / MPS', status: 'Active', textClass: 'text-accent-cyan', bgClass: 'bg-accent-cyan', shadowClass: 'shadow-[0_0_6px_rgba(0,212,170,0.8)]' },
              { label: 'Storage', status: 'Healthy', textClass: 'text-accent-cyan', bgClass: 'bg-accent-cyan', shadowClass: 'shadow-[0_0_6px_rgba(0,212,170,0.8)]' },
            ].map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-[13px]">
                <span className="text-text-secondary">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className={item.textClass}>{item.status}</span>
                  <span className={`w-2 h-2 rounded-full ${item.bgClass} ${item.shadowClass}`}></span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

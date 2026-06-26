import React, { useState, useEffect } from 'react';

export default function SystemStatusPage() {
  const FALLBACK = {
    overall: 'degraded', uptime_seconds: 86400,
    services: {
      api_gateway: { status: 'healthy', response_ms: 0.5 },
      retrieval_engine: { status: 'degraded', response_ms: 12.1 },
      embedding_service: { status: 'degraded', response_ms: 12.1 },
      faiss_index: { status: 'not_ready', response_ms: 0.023 },
      file_storage: { status: 'healthy', response_ms: 2.1 }
    }
  };

  const [status, setStatus] = useState(FALLBACK);
  const [lastCheck, setLastCheck] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const fetchStatus = () => {
      fetch('http://localhost:8000/system/status')
        .then(r => r.json())
        .then(d => {
          if (d.services) {
            setStatus(d);
            setLastCheck(new Date().toLocaleTimeString());
          }
        })
        .catch(e => {
          console.warn("System status API not available yet, using fallback.");
        });
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds) => {
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const isHealthy = status.overall === 'healthy';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl text-white mb-1">System Status</h2>
          <p className="text-text-secondary text-sm">Real-time infrastructure health and service monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`badge ${isHealthy ? 'badge-online' : 'badge-error'}`}>
            System: {isHealthy ? 'Operational' : 'Degraded'}
          </span>
          <button className="btn-ghost">Refresh Status</button>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-4">
        <div className="kpi-card">
          <div className="text-text-secondary text-[0.85rem] font-medium mb-1">Overall Status</div>
          <div className={`text-2xl font-bold mb-1 ${isHealthy ? 'text-accent-green' : 'text-accent-amber'}`}>
            {isHealthy ? 'Healthy' : 'Degraded'}
          </div>
          <div className="text-text-muted text-xs">Last check: {lastCheck}</div>
        </div>
        <div className="kpi-card">
          <div className="text-text-secondary text-[0.85rem] font-medium mb-1">Uptime</div>
          <div className="text-text-primary text-2xl font-bold mb-1">{formatUptime(status.uptime_seconds)}</div>
          <div className="text-text-muted text-xs">Since last restart</div>
        </div>
        <div className="kpi-card">
          <div className="text-text-secondary text-[0.85rem] font-medium mb-1">Avg Response Time</div>
          <div className="text-text-primary text-2xl font-bold mb-1">~14.2 ms</div>
          <div className="text-text-muted text-xs">Global average</div>
        </div>
        <div className="kpi-card">
          <div className="text-text-secondary text-[0.85rem] font-medium mb-1">Total Services</div>
          <div className="text-text-primary text-2xl font-bold mb-1">5 / 5</div>
          <div className="text-text-muted text-xs">Online / Total</div>
        </div>
        <div className="kpi-card">
          <div className="text-text-secondary text-[0.85rem] font-medium mb-1">Active Users</div>
          <div className="text-text-primary text-2xl font-bold mb-1">1</div>
          <div className="text-text-muted text-xs">Current session</div>
        </div>
        <div className="kpi-card">
          <div className="text-text-secondary text-[0.85rem] font-medium mb-1">System Load</div>
          <div className="text-text-primary text-2xl font-bold mb-1">32%</div>
          <div className="text-text-muted text-xs">Normal usage</div>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="glass-card flex-[4]">
          <h3 className="text-base text-white mb-4">Service Health</h3>
          <table className="data-table w-full text-left">
            <thead>
              <tr>
                <th className="py-2 px-3">Service</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Uptime (7d)</th>
                <th className="py-2 px-3">Response Time</th>
                <th className="py-2 px-3">Last Check</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(status.services).map(([key, srv]) => {
                const healthy = srv.status === 'healthy';
                const srvName = key.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
                return (
                  <tr key={key}>
                    <td className="py-2 px-3"><strong className="text-white">{srvName}</strong></td>
                    <td className="py-2 px-3">
                      <span className={`badge ${healthy ? 'badge-online' : 'badge-error'}`}>
                        {healthy ? 'Healthy' : 'Degraded'}
                      </span>
                    </td>
                    <td className="py-2 px-3">{healthy ? '100%' : '98.5%'}</td>
                    <td className="py-2 px-3">{srv.response_ms} ms</td>
                    <td className="py-2 px-3 text-text-muted">{lastCheck}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="glass-card flex-[3.5]">
          <h3 className="text-base text-white mb-4">System Load Over Time</h3>
          <div className="w-full">
            <svg viewBox="0 0 300 150" width="100%" height="150">
              {/* CPU */}
              <path d="M0,150 L0,120 Q50,140 100,100 T200,80 T300,110 L300,150 Z" fill="rgba(124, 58, 237, 0.1)" />
              <path d="M0,120 Q50,140 100,100 T200,80 T300,110" fill="none" stroke="var(--accent-violet)" strokeWidth="2" />
              {/* RAM */}
              <path d="M0,150 L0,80 Q50,90 100,60 T200,100 T300,90 L300,150 Z" fill="rgba(0, 212, 170, 0.1)" />
              <path d="M0,80 Q50,90 100,60 T200,100 T300,90" fill="none" stroke="var(--accent-cyan)" strokeWidth="2" />
              <text x="10" y="20" fill="var(--accent-violet)" fontSize="10">CPU</text>
              <text x="40" y="20" fill="var(--accent-cyan)" fontSize="10">Memory</text>
            </svg>
          </div>
        </div>

        <div className="glass-card flex-[2.5]">
          <h3 className="text-base text-white mb-4">Resource Utilization</h3>
          <div className="flex justify-between items-center mt-5">
            <div className="w-[30%] flex flex-col items-center gap-2 text-xs text-text-secondary">
              <svg viewBox="0 0 100 100" className="-rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" strokeWidth="10" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--accent-violet)" strokeWidth="10" strokeDasharray="251" strokeDashoffset="170" />
                <text x="50" y="55" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle" transform="rotate(90 50 50)">32%</text>
              </svg>
              <span>CPU</span>
            </div>
            <div className="w-[30%] flex flex-col items-center gap-2 text-xs text-text-secondary">
              <svg viewBox="0 0 100 100" className="-rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" strokeWidth="10" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--accent-cyan)" strokeWidth="10" strokeDasharray="251" strokeDashoffset="105" />
                <text x="50" y="55" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle" transform="rotate(90 50 50)">58%</text>
              </svg>
              <span>Memory</span>
            </div>
            <div className="w-[30%] flex flex-col items-center gap-2 text-xs text-text-secondary">
              <svg viewBox="0 0 100 100" className="-rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" strokeWidth="10" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--accent-amber)" strokeWidth="10" strokeDasharray="251" strokeDashoffset="148" />
                <text x="50" y="55" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle" transform="rotate(90 50 50)">41%</text>
              </svg>
              <span>Disk</span>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card w-full mt-4">
        <h3 className="text-base text-white mb-4">Storage Overview</h3>
        <div className="flex h-6 rounded-full overflow-hidden mt-4">
          <div className="flex items-center justify-center text-[0.65rem] text-white font-semibold whitespace-nowrap overflow-hidden bg-accent-violet" style={{width: '20%'}}>Embeddings 18.7MB</div>
          <div className="flex items-center justify-center text-[0.65rem] text-white font-semibold whitespace-nowrap overflow-hidden bg-accent-cyan" style={{width: '60%'}}>Images 3.48GB</div>
          <div className="flex items-center justify-center text-[0.65rem] text-white font-semibold whitespace-nowrap overflow-hidden bg-accent-blue" style={{width: '10%'}}>Logs 12MB</div>
          <div className="flex items-center justify-center text-[0.65rem] text-white font-semibold whitespace-nowrap overflow-hidden bg-text-muted" style={{width: '10%'}}>Other 50MB</div>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="glass-card flex-1">
          <h3 className="text-base text-white mb-4">System Logs</h3>
          <table className="data-table w-full text-left">
            <thead>
              <tr>
                <th className="py-2 px-3">Time</th>
                <th className="py-2 px-3">Level</th>
                <th className="py-2 px-3">Service</th>
                <th className="py-2 px-3">Message</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2 px-3">10:45:02 AM</td>
                <td className="py-2 px-3"><span className="badge badge-online">INFO</span></td>
                <td className="py-2 px-3">API Gateway</td>
                <td className="py-2 px-3">Incoming cross-modal search query received</td>
              </tr>
              <tr>
                <td className="py-2 px-3">10:45:02 AM</td>
                <td className="py-2 px-3"><span className="badge badge-online">INFO</span></td>
                <td className="py-2 px-3">Retriever</td>
                <td className="py-2 px-3">FAISS search completed in 0.023ms</td>
              </tr>
              <tr>
                <td className="py-2 px-3">10:12:14 AM</td>
                <td className="py-2 px-3"><span className="badge badge-error">WARN</span></td>
                <td className="py-2 px-3">Memory Monitor</td>
                <td className="py-2 px-3">Memory usage peaked at 85% during index load</td>
              </tr>
              <tr>
                <td className="py-2 px-3">09:00:00 AM</td>
                <td className="py-2 px-3"><span className="badge badge-online">INFO</span></td>
                <td className="py-2 px-3">System</td>
                <td className="py-2 px-3">Daily backup completed successfully</td>
              </tr>
              <tr>
                <td className="py-2 px-3">08:30:15 AM</td>
                <td className="py-2 px-3"><span className="badge badge-online">INFO</span></td>
                <td className="py-2 px-3">Startup</td>
                <td className="py-2 px-3">All services initialized and ready</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="glass-card flex-1">
          <h3 className="text-base text-white mb-4">Infrastructure Overview</h3>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="flex items-center gap-3 bg-bg-surface-2 p-3 rounded-sm border border-border">
              <span className="text-2xl">🖥️</span>
              <div className="flex flex-col">
                <strong className="text-sm text-white">Cluster Status</strong>
                <span className="text-xs text-accent-green">Healthy</span>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-bg-surface-2 p-3 rounded-sm border border-border">
              <span className="text-2xl">💾</span>
              <div className="flex flex-col">
                <strong className="text-sm text-white">FAISS Index</strong>
                <span className="text-xs text-accent-green">In Memory (Active)</span>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-bg-surface-2 p-3 rounded-sm border border-border">
              <span className="text-2xl">🌐</span>
              <div className="flex flex-col">
                <strong className="text-sm text-white">Network</strong>
                <span className="text-xs text-accent-green">Stable (0% loss)</span>
              </div>
            </div>
          </div>
          
          <h4 className="text-sm text-white mt-4 mb-3">Node Status</h4>
          <table className="data-table w-full text-left">
            <thead>
              <tr>
                <th className="py-2 px-3">Node</th>
                <th className="py-2 px-3">CPU</th>
                <th className="py-2 px-3">Mem</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2 px-3">worker-01</td>
                <td className="py-2 px-3">32%</td>
                <td className="py-2 px-3">58%</td>
                <td className="py-2 px-3"><span className="text-accent-green">Online</span></td>
              </tr>
              <tr>
                <td className="py-2 px-3">worker-02</td>
                <td className="py-2 px-3">12%</td>
                <td className="py-2 px-3">45%</td>
                <td className="py-2 px-3"><span className="text-accent-green">Online</span></td>
              </tr>
              <tr>
                <td className="py-2 px-3">gpu-node-01</td>
                <td className="py-2 px-3">65%</td>
                <td className="py-2 px-3">82%</td>
                <td className="py-2 px-3"><span className="text-accent-green">Online</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

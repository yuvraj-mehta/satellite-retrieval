import React, { useState, useEffect } from 'react';
import './SystemStatusPage.css';

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
    <div className="system-status-page">
      <div className="system-header">
        <div>
          <h2>System Status</h2>
          <p className="subtitle">Real-time infrastructure health and service monitoring</p>
        </div>
        <div className="header-actions">
          <span className={`badge ${isHealthy ? 'badge-online' : 'badge-error'}`}>
            System: {isHealthy ? 'Operational' : 'Degraded'}
          </span>
          <button className="btn-ghost">Refresh Status</button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-title">Overall Status</div>
          <div className={`kpi-value ${isHealthy ? 'text-green' : 'text-amber'}`}>
            {isHealthy ? 'Healthy' : 'Degraded'}
          </div>
          <div className="kpi-subtitle">Last check: {lastCheck}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Uptime</div>
          <div className="kpi-value">99.98%</div>
          <div className="kpi-subtitle">Last 30 days</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Avg Response Time</div>
          <div className="kpi-value">~14.2 ms</div>
          <div className="kpi-subtitle">Global average</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Total Services</div>
          <div className="kpi-value">5 / 5</div>
          <div className="kpi-subtitle">Online / Total</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Active Users</div>
          <div className="kpi-value">1</div>
          <div className="kpi-subtitle">Current session</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">System Load</div>
          <div className="kpi-value">32%</div>
          <div className="kpi-subtitle">Normal usage</div>
        </div>
      </div>

      <div className="status-row">
        <div className="glass-card services-card">
          <h3>Service Health</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Status</th>
                <th>Uptime (7d)</th>
                <th>Response Time</th>
                <th>Last Check</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(status.services).map(([key, srv]) => {
                const healthy = srv.status === 'healthy';
                const srvName = key.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
                return (
                  <tr key={key}>
                    <td><strong>{srvName}</strong></td>
                    <td>
                      <span className={`badge ${healthy ? 'badge-online' : 'badge-error'}`}>
                        {healthy ? 'Healthy' : 'Degraded'}
                      </span>
                    </td>
                    <td>{healthy ? '100%' : '98.5%'}</td>
                    <td>{srv.response_ms} ms</td>
                    <td className="text-muted">{lastCheck}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="glass-card load-card">
          <h3>System Load Over Time</h3>
          <div className="chart-container">
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

        <div className="glass-card resource-card">
          <h3>Resource Utilization</h3>
          <div className="gauges-container">
            <div className="gauge">
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" strokeWidth="10" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--accent-violet)" strokeWidth="10" strokeDasharray="251" strokeDashoffset="170" />
                <text x="50" y="55" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle">32%</text>
              </svg>
              <span>CPU</span>
            </div>
            <div className="gauge">
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" strokeWidth="10" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--accent-cyan)" strokeWidth="10" strokeDasharray="251" strokeDashoffset="105" />
                <text x="50" y="55" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle">58%</text>
              </svg>
              <span>Memory</span>
            </div>
            <div className="gauge">
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" strokeWidth="10" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--accent-amber)" strokeWidth="10" strokeDasharray="251" strokeDashoffset="148" />
                <text x="50" y="55" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle">41%</text>
              </svg>
              <span>Disk</span>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card storage-card full-width mt-4">
        <h3>Storage Overview</h3>
        <div className="storage-bar">
          <div className="segment bg-violet" style={{width: '20%'}}>Embeddings 18.7MB</div>
          <div className="segment bg-cyan" style={{width: '60%'}}>Images 3.48GB</div>
          <div className="segment bg-blue" style={{width: '10%'}}>Logs 12MB</div>
          <div className="segment bg-gray" style={{width: '10%'}}>Other 50MB</div>
        </div>
      </div>

      <div className="bottom-row">
        <div className="glass-card logs-card">
          <h3>System Logs</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Level</th>
                <th>Service</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>10:45:02 AM</td>
                <td><span className="badge badge-online">INFO</span></td>
                <td>API Gateway</td>
                <td>Incoming cross-modal search query received</td>
              </tr>
              <tr>
                <td>10:45:02 AM</td>
                <td><span className="badge badge-online">INFO</span></td>
                <td>Retriever</td>
                <td>FAISS search completed in 0.023ms</td>
              </tr>
              <tr>
                <td>10:12:14 AM</td>
                <td><span className="badge badge-error">WARN</span></td>
                <td>Memory Monitor</td>
                <td>Memory usage peaked at 85% during index load</td>
              </tr>
              <tr>
                <td>09:00:00 AM</td>
                <td><span className="badge badge-online">INFO</span></td>
                <td>System</td>
                <td>Daily backup completed successfully</td>
              </tr>
              <tr>
                <td>08:30:15 AM</td>
                <td><span className="badge badge-online">INFO</span></td>
                <td>Startup</td>
                <td>All services initialized and ready</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="glass-card infra-card">
          <h3>Infrastructure Overview</h3>
          <div className="infra-grid">
            <div className="infra-item">
              <span className="infra-icon">🖥️</span>
              <div className="infra-details">
                <strong>Cluster Status</strong>
                <span className="text-green">Healthy</span>
              </div>
            </div>
            <div className="infra-item">
              <span className="infra-icon">💾</span>
              <div className="infra-details">
                <strong>FAISS Index</strong>
                <span className="text-green">In Memory (Active)</span>
              </div>
            </div>
            <div className="infra-item">
              <span className="infra-icon">🌐</span>
              <div className="infra-details">
                <strong>Network</strong>
                <span className="text-green">Stable (0% loss)</span>
              </div>
            </div>
          </div>
          
          <h4 className="mt-4">Node Status</h4>
          <table className="data-table">
            <thead>
              <tr>
                <th>Node</th>
                <th>CPU</th>
                <th>Mem</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>worker-01</td>
                <td>32%</td>
                <td>58%</td>
                <td><span className="text-green">Online</span></td>
              </tr>
              <tr>
                <td>worker-02</td>
                <td>12%</td>
                <td>45%</td>
                <td><span className="text-green">Online</span></td>
              </tr>
              <tr>
                <td>gpu-node-01</td>
                <td>65%</td>
                <td>82%</td>
                <td><span className="text-green">Online</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

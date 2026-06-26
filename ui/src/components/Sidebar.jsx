import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

export default function Sidebar() {
  const [stats, setStats] = useState({
    pairs: 1167,
    scenes: 2,
    dim: 512,
    time: "0.023ms"
  });

  useEffect(() => {
    fetch('http://localhost:8000/health')
      .then(r => r.json())
      .then(d => {
        if (d.index_size) {
          setStats(prev => ({ ...prev, pairs: d.index_size }));
        }
      })
      .catch(e => console.error(e));
  }, []);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-container">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="var(--accent-violet)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="var(--accent-violet)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="var(--accent-violet)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div className="logo-text">SpectraMatch</div>
        </div>
        <div className="logo-subtitle">Cross-Modal Satellite Image Retrieval</div>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" end className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Dashboard</NavLink>
        <NavLink to="/search" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Search / Query</NavLink>
        <NavLink to="/results" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Results</NavLink>
        <NavLink to="/analytics" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Analytics</NavLink>
        <NavLink to="/dataset" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Dataset</NavLink>
        <NavLink to="/architecture" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Model Architecture</NavLink>
        <NavLink to="/status" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>System Status</NavLink>
        <NavLink to="/about" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>About</NavLink>
      </nav>

      <div className="sidebar-stats">
        <div className="stat-row">
          <span>Total Pairs</span>
          <strong>{stats.pairs.toLocaleString()}</strong>
        </div>
        <div className="stat-row">
          <span>Scenes</span>
          <strong>{stats.scenes}</strong>
        </div>
        <div className="stat-row">
          <span>Embedding Dim</span>
          <strong>{stats.dim}</strong>
        </div>
        <div className="stat-row">
          <span>Avg Retrieval</span>
          <strong>{stats.time}</strong>
        </div>
      </div>

      <div className="sidebar-user">
        <div className="user-avatar">TI</div>
        <div className="user-info">
          <div className="user-name">Team ISRO <span className="badge-online"></span></div>
          <div className="user-role">Bharatiya Antariksh Hackathon 2024</div>
        </div>
      </div>
    </aside>
  );
}

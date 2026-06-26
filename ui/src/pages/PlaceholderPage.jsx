import React from 'react';

export default function PlaceholderPage({ name }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>{name}</h2>
        <p className="kpi-subtitle">Coming Soon in Phase 13</p>
      </div>
    </div>
  );
}

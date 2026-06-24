import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE } from "../config";
import "./StatusBar.css";

export default function StatusBar({ retrievalMs, queryModality, targetModality, topK, hasResults }) {
  const [connected, setConnected] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await axios.get(`${API_BASE}/health`);
        if (response.data.status === "ok") {
          setConnected(true);
        } else {
          setConnected(false);
        }
      } catch (err) {
        setConnected(false);
      } finally {
        setChecking(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="status-bar glass">
      <div className="status-indicator">
        <span className={`status-dot ${connected ? "connected" : "offline"}`} />
        <span className="status-text">
          {checking ? "Checking Engine..." : connected ? "FAISS Engine Online" : "Engine Offline"}
        </span>
      </div>
      
      <div className="metrics-group">
        <div className="metric">
          <span className="metric-label">MODE:</span>
          <span className="metric-val">{queryModality.toUpperCase()} → {targetModality.toUpperCase()}</span>
        </div>
        <div className="metric">
          <span className="metric-label">TOP-K:</span>
          <span className="metric-val">{topK}</span>
        </div>
        {hasResults && retrievalMs !== null && (
          <div className="metric latency-metric">
            <span className="metric-label">LATENCY:</span>
            <strong className="metric-val highlight">{retrievalMs.toFixed(2)}ms</strong>
          </div>
        )}
      </div>
    </div>
  );
}

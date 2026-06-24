import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE } from "../config";

export default function StatusBar({ retrievalMs }) {
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

    // Check immediately on mount
    checkHealth();

    // Poll every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="status-bar glass">
      <div className="status-indicator">
        <span className={`status-dot ${connected ? "connected" : "offline"}`} />
        <span className="status-text">
          {checking ? "Checking API..." : connected ? "API Connected" : "API Offline"}
        </span>
      </div>
      {retrievalMs !== null && (
        <div className="latency-info">
          <span>Retrieval Latency: </span>
          <strong className="latency-val">{retrievalMs.toFixed(2)}ms</strong>
        </div>
      )}
    </div>
  );
}

import React from "react";
import "./LoadingOverlay.css";

export default function LoadingOverlay() {
  return (
    <div className="loading-overlay-container">
      <div className="loading-card glass">
        <div className="loading-pulse-wrapper">
          <span className="loading-emoji">🛰️</span>
          <div className="pulse-ring" />
          <div className="pulse-ring-outer" />
        </div>
        <h3 className="loading-heading">Encoding &amp; Searching</h3>
        <p className="loading-subtext">Aligning multimodal sensor spaces...</p>
        <div className="dots-container">
          <span className="dot dot-1" />
          <span className="dot dot-2" />
          <span className="dot dot-3" />
        </div>
      </div>
    </div>
  );
}

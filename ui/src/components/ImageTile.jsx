import React from "react";
import "./ImageTile.css";

export default function ImageTile({
  image,
  title,
  subtitle,
  badge,
  badgeVariant,
  score,
  isQuery = false,
  delay = 0,
}) {
  const scorePercent = score !== null ? Math.min(Math.max(score * 100, 0), 100) : 0;

  return (
    <div
      className={`image-tile ${isQuery ? "query-tile" : ""}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="tile-image-wrapper">
        {image ? (
          <img
            src={`data:image/png;base64,${image}`}
            alt={title}
            className="tile-image"
          />
        ) : (
          <div className="tile-image-placeholder">
            <span>No Image</span>
          </div>
        )}
        {badge && (
          <span className={`tile-badge ${badgeVariant || "rank"}`}>
            {badge}
          </span>
        )}
      </div>
      <div className="tile-info">
        <p className="tile-title">{title}</p>
        <p className="tile-subtitle">{subtitle}</p>
        
        {score !== null && (
          <div className="score-container">
            <div className="score-header">
              <span className="score-name">Similarity</span>
              <span className="score-val">{(score * 100).toFixed(1)}% <span style={{ opacity: 0.5, fontSize: "11px", marginLeft: "4px" }}>({score.toFixed(3)})</span></span>
            </div>
            <div className="score-bar-bg">
              <div
                className="score-bar-fill"
                style={{ width: `${scorePercent}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

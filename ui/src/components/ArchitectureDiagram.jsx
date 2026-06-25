import React from "react";
import "./ArchitectureDiagram.css";

export default function ArchitectureDiagram({ queryModality = "sar", targetModality = "optical" }) {
  const getModalityLabel = (modality) => {
    switch (modality) {
      case "sar":
        return "Sentinel-1 (SAR)";
      case "optical":
        return "Sentinel-2 (Optical)";
      case "optical_rgb":
        return "Sentinel-2 (Optical RGB)";
      default:
        return modality.toUpperCase();
    }
  };

  return (
    <div className="architecture-section glass">
      <div className="arch-header">
        <h2 className="arch-title">System Architecture</h2>
        <p className="arch-subtitle">Dual-Encoder Shared Embedding Space with FAISS Retrieval</p>
      </div>

      <div className="arch-diagram">
        {/* Input Layer */}
        <div className="arch-col input-layer">
          <div className="arch-node query-node">
            <span className="node-icon">🛰️</span>
            <div className="node-text">
              <strong>Query Scene</strong>
              <span>{getModalityLabel(queryModality)}</span>
            </div>
          </div>
          <div className="arch-node target-node">
            <span className="node-icon">🌍</span>
            <div className="node-text">
              <strong>Target Database</strong>
              <span>{getModalityLabel(targetModality)}</span>
            </div>
          </div>
        </div>

        {/* Connection 1 */}
        <div className="arch-flow">
          <div className="flow-line animated"></div>
          <div className="flow-line"></div>
        </div>

        {/* Model Layer */}
        <div className="arch-col model-layer">
          <div className="arch-box">
            <div className="box-header">Dual Encoder Framework</div>
            <div className="box-nodes">
              <div className="arch-node backbone">
                <span className="node-label">ResNet-50</span>
                <span>SAR Encoder</span>
              </div>
              <div className="arch-node backbone">
                <span className="node-label">ResNet-50</span>
                <span>Optical Encoder</span>
              </div>
            </div>
            <div className="projection-heads">
              <div className="proj-head">Projection Head</div>
              <div className="proj-head">Projection Head</div>
            </div>
          </div>
        </div>

        {/* Connection 2 */}
        <div className="arch-flow single-flow">
          <div className="flow-line converging"></div>
        </div>

        {/* Embedding Space */}
        <div className="arch-col space-layer">
          <div className="arch-node embedding-space pulse-glow">
            <span className="space-icon">🌌</span>
            <div className="node-text">
              <strong>Shared Embedding Space</strong>
              <span>512-Dimensional Vector</span>
              <span className="loss-badge">Contrastive Loss</span>
            </div>
          </div>
        </div>

        {/* Connection 3 */}
        <div className="arch-flow single-flow">
          <div className="flow-line animated"></div>
        </div>

        {/* Retrieval Layer */}
        <div className="arch-col retrieval-layer">
          <div className="arch-node faiss-node">
            <span className="node-icon">⚡</span>
            <div className="node-text">
              <strong>FAISS Index</strong>
              <span>Sub-millisecond Search</span>
            </div>
          </div>
          <div className="flow-arrow">↓</div>
          <div className="arch-node results-node">
            <span className="node-icon">🎯</span>
            <div className="node-text">
              <strong>Top-K Retrievals</strong>
              <span>Cross-Modal Matches</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from "react";
import ImageTile from "./ImageTile";
import "./ResultsGrid.css";

export default function ResultsGrid({
  queryImage,
  results,
  queryModality,
  targetModality,
  retrievalMs,
}) {
  if (!results || results.length === 0) return null;

  return (
    <div className="results-section">
      <div className="results-header">
        <h2 className="results-title">Retrieval Results</h2>
        <div className="badge-row">
          <span className="retrieval-badge">
            {queryModality.toUpperCase()} → {targetModality.toUpperCase()}
          </span>
          {retrievalMs !== null && (
            <span className="latency-badge">
              ⚡ {retrievalMs.toFixed(2)}ms
            </span>
          )}
        </div>
      </div>

      <div className="results-grid">
        <div className="query-col">
          <p className="col-label">Query Input</p>
          <ImageTile
            image={queryImage}
            title={`${queryModality.toUpperCase()} Patch`}
            subtitle="Uploaded Source"
            isQuery={true}
            score={null}
            badge={queryModality.toUpperCase()}
            badgeVariant="rank"
            delay={0}
          />
        </div>

        <div className="grid-arrow">→</div>

        <div className="results-col">
          <p className="col-label">Top-5 Retrievals ({targetModality.toUpperCase()})</p>
          <div className="tiles-row">
            {results.map((r) => (
              <ImageTile
                key={r.rank}
                image={r.image}
                title={`Scene ${r.scene_id} · Patch ${r.patch_id}`}
                subtitle={`Rank ${r.rank}`}
                score={r.score}
                badge={r.is_match ? "✓ MATCH" : `#${r.rank}`}
                badgeVariant={r.is_match ? "match" : "rank"}
                delay={r.rank * 0.08}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

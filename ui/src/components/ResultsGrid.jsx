import React from "react";
import ImageTile from "./ImageTile";
import "./ResultsGrid.css";

export default function ResultsGrid({
  queryImage,
  results,
  queryModality,
  targetModality,
  retrievalMs,
  topK,
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

        {targetModality === "both" ? (
          <div className="results-split-container">
            <div className="results-col">
              <p className="col-label">Top-{topK} Retrievals (Optical)</p>
              <div className="tiles-row">
                {results.filter(r => r.modality.includes("optical")).map((r, i) => (
                  <ImageTile
                    key={r.rank}
                    image={r.image}
                    title={`Scene ${r.scene_id} · Patch ${r.patch_id}`}
                    subtitle={`Overall Rank ${r.rank}`}
                    score={r.score}
                    badge={r.is_match ? "✓ MATCH" : `#${r.rank}`}
                    badgeVariant={r.is_match ? "match" : "rank"}
                    delay={i * 0.08}
                  />
                ))}
              </div>
            </div>
            <div className="results-col">
              <p className="col-label">Top-{topK} Retrievals (SAR)</p>
              <div className="tiles-row">
                {results.filter(r => r.modality === "sar").map((r, i) => (
                  <ImageTile
                    key={r.rank}
                    image={r.image}
                    title={`Scene ${r.scene_id} · Patch ${r.patch_id}`}
                    subtitle={`Overall Rank ${r.rank}`}
                    score={r.score}
                    badge={r.is_match ? "✓ MATCH" : `#${r.rank}`}
                    badgeVariant={r.is_match ? "match" : "rank"}
                    delay={i * 0.08}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="results-col">
            <p className="col-label">Top-{topK || results.length} Retrievals ({targetModality.toUpperCase()})</p>
            <div className="tiles-row">
              {results.map((r, i) => (
                <ImageTile
                  key={r.rank}
                  image={r.image}
                  title={`Scene ${r.scene_id} · Patch ${r.patch_id}`}
                  subtitle={`Rank ${r.rank}`}
                  score={r.score}
                  badge={r.is_match ? "✓ MATCH" : `#${r.rank}`}
                  badgeVariant={r.is_match ? "match" : "rank"}
                  delay={i * 0.08}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

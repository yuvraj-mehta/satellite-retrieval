import React, { useState } from "react";
import { useRetrieval } from "./hooks/useRetrieval";
import StatusBar from "./components/StatusBar";
import UploadPanel from "./components/UploadPanel";
import ResultsGrid from "./components/ResultsGrid";
import LoadingOverlay from "./components/LoadingOverlay";

export default function App() {
  const [queryModality, setQueryModality] = useState("sar");
  const [targetModality, setTargetModality] = useState("optical");

  const {
    results,
    queryImage,
    retrievalMs,
    loading,
    error,
    search,
  } = useRetrieval();

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🛰️ Satellite Image Retrieval</h1>
        <p>Cross-modal search across SAR &amp; Optical sensors</p>
      </header>

      <StatusBar retrievalMs={retrievalMs} />
      <div className="divider" />

      <UploadPanel
        onSearch={search}
        loading={loading}
        queryModality={queryModality}
        targetModality={targetModality}
        onModalityChange={(qm, tm) => {
          setQueryModality(qm);
          setTargetModality(tm);
        }}
      />

      {loading && <LoadingOverlay />}
      {error && <div className="error-banner">⚠️ {error}</div>}

      {results.length > 0 && !loading && (
        <ResultsGrid
          queryImage={queryImage}
          results={results}
          queryModality={queryModality}
          targetModality={targetModality}
          retrievalMs={retrievalMs}
        />
      )}
    </div>
  );
}

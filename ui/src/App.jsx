import React, { useState } from "react";
import { useRetrieval } from "./hooks/useRetrieval";
import StatusBar from "./components/StatusBar";
import UploadPanel from "./components/UploadPanel";
import ResultsGrid from "./components/ResultsGrid";
import LoadingOverlay from "./components/LoadingOverlay";
import ArchitectureDiagram from "./components/ArchitectureDiagram";
import ErrorBanner from "./components/ErrorBanner";
import BenchmarkDashboard from "./components/BenchmarkDashboard";

export default function App() {
  const [queryModality, setQueryModality] = useState("sar");
  const [targetModality, setTargetModality] = useState("optical");
  const [topK, setTopK] = useState(5);
  const [activeTab, setActiveTab] = useState("retrieval");

  const {
    results,
    queryImage,
    retrievalMs,
    loading,
    error,
    search,
  } = useRetrieval();

  const handleSearch = (file, qm, tm) => {
    search(file, qm, tm, topK);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-badge">ISRO / BHARATIYA ANTARIKSH HACKATHON</div>
        <h1>
          Cross-Modal <span className="gradient-text">Satellite</span> Retrieval
        </h1>
        <p>Advanced Multi-Sensor Remote Sensing Platform</p>
      </header>

      <StatusBar 
        retrievalMs={retrievalMs} 
        queryModality={queryModality} 
        targetModality={targetModality} 
        topK={topK} 
        hasResults={results.length > 0} 
      />

      <div className="tab-bar">
        <button
          id="tab-retrieval"
          className={activeTab === "retrieval" ? "tab active" : "tab"}
          onClick={() => setActiveTab("retrieval")}
        >
          🛰 Retrieval
        </button>
        <button
          id="tab-benchmarks"
          className={activeTab === "benchmarks" ? "tab active" : "tab"}
          onClick={() => setActiveTab("benchmarks")}
        >
          📊 Benchmarks
        </button>
      </div>

      {activeTab === "retrieval" && (
        <>
          <ArchitectureDiagram />

          <UploadPanel
            onSearch={handleSearch}
            loading={loading}
            queryModality={queryModality}
            targetModality={targetModality}
            topK={topK}
            onModalityChange={(qm, tm) => {
              setQueryModality(qm);
              setTargetModality(tm);
            }}
            onTopKChange={(k) => setTopK(k)}
          />

          {loading && <LoadingOverlay />}
          <ErrorBanner error={error} />

          {results.length > 0 && !loading && (
            <ResultsGrid
              queryImage={queryImage}
              results={results}
              queryModality={queryModality}
              targetModality={targetModality}
              retrievalMs={retrievalMs}
            />
          )}
        </>
      )}

      {activeTab === "benchmarks" && <BenchmarkDashboard />}
    </div>
  );
}



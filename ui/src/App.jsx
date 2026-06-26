import React from "react";
import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import SearchPage from "./pages/SearchPage";
import ResultsPage from "./pages/ResultsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import DatasetPage from "./pages/DatasetPage";
import ArchitecturePage from "./pages/ArchitecturePage";
import SystemStatusPage from "./pages/SystemStatusPage";
import AboutPage from "./pages/AboutPage";

export default function App() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/dataset" element={<DatasetPage />} />
          <Route path="/architecture" element={<ArchitecturePage />} />
          <Route path="/status" element={<SystemStatusPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </main>
    </div>
  );
}

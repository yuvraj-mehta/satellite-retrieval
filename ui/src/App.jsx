import React from "react";
import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import SearchPage from "./pages/SearchPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import DatasetPage from "./pages/DatasetPage";
import ArchitecturePage from "./pages/ArchitecturePage";

import AboutPage from "./pages/AboutPage";

export default function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <Sidebar />
      <main className="flex-1 mt-navbar-height p-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/dataset" element={<DatasetPage />} />
          <Route path="/architecture" element={<ArchitecturePage />} />

          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </main>
    </div>
  );
}

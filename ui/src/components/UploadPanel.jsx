import React, { useState, useRef } from "react";
import "./UploadPanel.css";

export default function UploadPanel({
  onSearch,
  loading,
  queryModality,
  targetModality,
  onModalityChange,
}) {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current.click();
  };

  const handleQueryModalityChange = (e) => {
    const newQueryMod = e.target.value;
    const newTargetMod = newQueryMod === "sar" ? "optical" : "sar";
    onModalityChange(newQueryMod, newTargetMod);
  };

  const handleTargetModalityChange = (e) => {
    const newTargetMod = e.target.value;
    const newQueryMod = newTargetMod === "sar" ? "optical" : "sar";
    onModalityChange(newQueryMod, newTargetMod);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (file) {
      onSearch(file, queryModality, targetModality);
    }
  };

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <form className="upload-panel glass" onSubmit={handleSubmit}>
      <div
        className={`drop-zone ${isDragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".tif"
          style={{ display: "none" }}
        />
        
        {file ? (
          <div className="file-info-container">
            <span className="file-icon">📄</span>
            <div className="file-details">
              <p className="file-name">{file.name}</p>
              <p className="file-size">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button type="button" className="remove-file-btn" onClick={handleRemoveFile}>
              ✕
            </button>
          </div>
        ) : (
          <div className="drop-prompt">
            <span className="upload-icon">🛰️</span>
            <p className="drop-text">Drag & drop a query .tif file here</p>
            <p className="or-text">or</p>
            <button type="button" className="browse-btn">
              Browse Files
            </button>
          </div>
        )}
      </div>

      <div className="modality-row">
        <div className="modality-field">
          <label>Query Modality</label>
          <select
            value={queryModality}
            onChange={handleQueryModalityChange}
            className="modality-select"
          >
            <option value="sar">SAR (Sentinel-1)</option>
            <option value="optical">Optical (Sentinel-2)</option>
          </select>
        </div>

        <div className="modality-field">
          <label>Target Modality</label>
          <select
            value={targetModality}
            onChange={handleTargetModalityChange}
            className="modality-select"
          >
            <option value="optical">Optical (Sentinel-2)</option>
            <option value="sar">SAR (Sentinel-1)</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        className="btn-primary search-submit-btn"
        disabled={!file || loading}
      >
        {loading ? (
          <>
            <span className="spinner" />
            <span>Searching...</span>
          </>
        ) : (
          <span>Perform Search</span>
        )}
      </button>
    </form>
  );
}

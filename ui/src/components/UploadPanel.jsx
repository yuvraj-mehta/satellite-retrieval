import React, { useState, useRef } from "react";
import "./UploadPanel.css";

export default function UploadPanel({
  onSearch,
  loading,
  queryModality,
  targetModality,
  topK,
  onModalityChange,
  onTopKChange,
}) {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

  const validateAndSetFile = (selectedFile) => {
    setUploadError("");
    if (!selectedFile) return;
    
    const validExtensions = ['.tif', '.tiff'];
    const fileName = selectedFile.name.toLowerCase();
    const isValid = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!isValid) {
      setUploadError("Invalid file type. Please upload a raw .tif or .tiff satellite image.");
      setFile(null);
    } else {
      setFile(selectedFile);
    }
  };

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
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
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
    setUploadError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <form className="upload-panel glass" onSubmit={handleSubmit}>
      <div
        className={`drop-zone ${isDragging ? "dragging" : ""} ${file ? "has-file" : ""} ${uploadError ? "has-error" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".tif,.tiff"
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
            {uploadError ? (
              <p className="drop-text" style={{ color: "#ef4444" }}>{uploadError}</p>
            ) : (
              <p className="drop-text">Drag & drop a query scene (.tif)</p>
            )}
            <p className="or-text">or</p>
            <button type="button" className="browse-btn">
              Browse Files
            </button>
          </div>
        )}
      </div>

      <div className="config-grid">
        <div className="modality-field">
          <label>Query Modality</label>
          <select
            value={queryModality}
            onChange={handleQueryModalityChange}
            className="modality-select"
          >
            <option value="sar">Sentinel-1 (SAR)</option>
            <option value="optical">Sentinel-2 (Optical)</option>
          </select>
        </div>

        <div className="modality-field">
          <label>Target Modality</label>
          <select
            value={targetModality}
            onChange={handleTargetModalityChange}
            className="modality-select"
          >
            <option value="optical">Sentinel-2 (Optical)</option>
            <option value="sar">Sentinel-1 (SAR)</option>
          </select>
        </div>

        <div className="modality-field slider-field">
          <label>Top-K Retrievals: {topK}</label>
          <input 
            type="range" 
            min="1" 
            max="15" 
            value={topK} 
            onChange={(e) => onTopKChange(parseInt(e.target.value))}
            className="k-slider"
          />
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
            <span>Projecting into Shared Embedding Space...</span>
          </>
        ) : (
          <span>Run Cross-Modal Retrieval</span>
        )}
      </button>
    </form>
  );
}

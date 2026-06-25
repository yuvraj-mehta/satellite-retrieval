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

  const isOptical = (m) => m === "optical" || m === "optical_rgb";
  const isSar = (m) => m === "sar";

  const handleLoadSample = async () => {
    try {
      setUploadError("");
      const isSarQuery = queryModality === "sar";
      const sampleUrl = isSarQuery ? "/sample_sar.tif" : "/sample_optical.tif";
      const sampleName = isSarQuery ? "sample_sar.tif" : "sample_optical.tif";
      
      const response = await fetch(sampleUrl);
      if (!response.ok) {
        throw new Error("Failed to fetch sample file.");
      }
      const blob = await response.blob();
      const sampleFile = new File([blob], sampleName, { type: "image/tiff" });
      validateAndSetFile(sampleFile);
    } catch (err) {
      setUploadError("Failed to load sample file. Verify public assets are present.");
      console.error(err);
    }
  };

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
    setFile(null); // Clear file on query modality change
    onModalityChange(newQueryMod, targetModality);
  };

  const handleTargetModalityChange = (e) => {
    const newTargetMod = e.target.value;
    onModalityChange(queryModality, newTargetMod);
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
            <option value="optical_rgb">Optical RGB (Sentinel-2 True Colour)</option>
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
            <option value="optical_rgb">Optical RGB (Sentinel-2 True Colour)</option>
            <option value="sar">Sentinel-1 (SAR)</option>
            <option value="both">Both (SAR & Optical)</option>
          </select>
        </div>

        <div className="modality-field">
          <label>Number of Retrievals</label>
          <div className="k-toggle-group">
            <button
              type="button"
              className={`k-toggle-btn ${topK === 5 ? "active" : ""}`}
              onClick={() => onTopKChange(5)}
            >
              Top-5
            </button>
            <button
              type="button"
              className={`k-toggle-btn ${topK === 10 ? "active" : ""}`}
              onClick={() => onTopKChange(10)}
            >
              Top-10
            </button>
          </div>
        </div>
      </div>

      <div className="action-buttons-row">
        <button
          type="button"
          className="btn-secondary sample-btn"
          onClick={handleLoadSample}
          disabled={loading}
        >
          💡 Load Demo Sample
        </button>
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
      </div>
    </form>
  );
}

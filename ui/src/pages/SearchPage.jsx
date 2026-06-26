import React, { useState, useRef } from 'react';
import { useRetrieval } from '../hooks/useRetrieval';
import './SearchPage.css';

export default function SearchPage() {
  const { search, loading } = useRetrieval();
  const fileInputRef = useRef(null);
  
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [queryModality, setQueryModality] = useState('sar');
  const [targetModality, setTargetModality] = useState('optical');
  const [topK, setTopK] = useState(5);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setPreviewUrl(URL.createObjectURL(droppedFile));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const parseFileName = (name) => {
    let sceneId = "Unknown";
    let patchId = "Unknown";
    const strictMatch = name.match(/_p(\d+)\.tif$/);
    const sceneMatch = name.match(/_(\d+)_p\d+\.tif$/);
    if (strictMatch) patchId = strictMatch[1];
    if (sceneMatch) sceneId = sceneMatch[1];
    return { sceneId, patchId };
  };

  const meta = file ? parseFileName(file.name) : {};

  return (
    <div className="search-page">
      <div className="wizard-column">
        <h2 style={{marginBottom: "24px", color: "white"}}>New Search Query</h2>
        
        {/* Step 1 */}
        <div className="wizard-step glass-card">
          <div className="step-badge">1</div>
          <div className="step-content">
            <h3>Upload Query Image</h3>
            <div 
              className={`drop-zone ${file ? 'has-file' : ''}`}
              onClick={() => fileInputRef.current.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".tif,.tiff" 
                style={{display: 'none'}} 
              />
              <div className="upload-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent-violet)" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              {file ? (
                <div className="file-selected">{file.name}</div>
              ) : (
                <>
                  <div className="drop-text">Drag & drop a TIFF file here / or click to browse</div>
                  <div className="drop-hint">Supported format: .tif, .tiff · Max size: 100MB</div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className={`wizard-step glass-card ${!file ? 'disabled' : ''}`}>
          <div className="step-badge">2</div>
          <div className="step-content">
            <h3>Select Query Modality</h3>
            <div className="radio-cards">
              <div 
                className={`radio-card ${queryModality === 'sar' ? 'selected' : ''}`}
                onClick={() => file && setQueryModality('sar')}
              >
                <div className="card-header">
                  <strong>SAR (Sentinel-1)</strong>
                  <div className="radio-dot"></div>
                </div>
                <div className="card-desc">Active Radar Sensor</div>
                <div className="card-meta">2 Channels: VV, VH</div>
              </div>
              <div 
                className={`radio-card ${queryModality === 'optical' ? 'selected' : ''}`}
                onClick={() => file && setQueryModality('optical')}
              >
                <div className="card-header">
                  <strong>Optical (Sentinel-2)</strong>
                  <div className="radio-dot"></div>
                </div>
                <div className="card-desc">Passive Optical Sensor</div>
                <div className="card-meta">4 Channels: B4, B8, B11, B12</div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className={`wizard-step glass-card ${!file ? 'disabled' : ''}`}>
          <div className="step-badge">3</div>
          <div className="step-content">
            <h3>Select Target Modality</h3>
            <div className="info-banner mb-3">
              The system will automatically search in the opposite modality. SAR → Optical or Optical → SAR
            </div>
            <div className="radio-cards">
              <div 
                className={`radio-card ${targetModality === 'optical' ? 'selected' : ''}`}
                onClick={() => file && setTargetModality('optical')}
              >
                <div className="card-header">
                  <strong>Optical (Sentinel-2)</strong>
                  <div className="radio-dot"></div>
                </div>
                <div className="card-desc">Search in Optical Gallery</div>
                <div className="card-meta">Cross-Modal Search</div>
              </div>
              <div 
                className={`radio-card ${targetModality === 'sar' ? 'selected' : ''}`}
                onClick={() => file && setTargetModality('sar')}
              >
                <div className="card-header">
                  <strong>SAR (Sentinel-1)</strong>
                  <div className="radio-dot"></div>
                </div>
                <div className="card-desc">Search in SAR Gallery</div>
                <div className="card-meta">Cross-Modal Search</div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className={`wizard-step glass-card ${!file ? 'disabled' : ''}`}>
          <div className="step-badge">4</div>
          <div className="step-content">
            <h3>Top-K Results</h3>
            <div className="pill-group">
              <div 
                className={`pill ${topK === 5 ? 'active' : ''}`}
                onClick={() => file && setTopK(5)}
              >
                Top 5 (Recommended)
              </div>
              <div 
                className={`pill ${topK === 10 ? 'active' : ''}`}
                onClick={() => file && setTopK(10)}
              >
                Top 10
              </div>
            </div>
          </div>
        </div>

        <button 
          className="btn-primary search-submit-btn" 
          disabled={!file || loading}
          onClick={() => search(file, queryModality, targetModality, topK)}
        >
          {loading ? 'Searching...' : 'Search Now'}
        </button>
      </div>

      <div className="preview-column">
        <div className="glass-card preview-panel">
          <h3>Query Preview</h3>
          
          <div className="preview-image-box">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="preview-img" />
            ) : (
              <div className="empty-preview">Image Preview</div>
            )}
          </div>

          <div className="query-meta-list">
            <div className="meta-row">
              <span>Scene ID</span>
              <strong>{meta.sceneId || '—'}</strong>
            </div>
            <div className="meta-row">
              <span>Patch ID</span>
              <strong>{meta.patchId || '—'}</strong>
            </div>
            <div className="meta-row">
              <span>Size</span>
              <strong>{file ? '256×256' : '—'}</strong>
            </div>
            <div className="meta-row">
              <span>Channels</span>
              <strong>{file ? (queryModality === 'sar' ? 'VV, VH' : 'B4, B8, B11, B12') : '—'}</strong>
            </div>
            <div className="meta-row">
              <span>Modality</span>
              {file ? (
                <span className={`badge ${queryModality === 'sar' ? 'badge-sar' : 'badge-optical'}`}>
                  {queryModality.toUpperCase()}
                </span>
              ) : <strong>—</strong>}
            </div>
            <div className="meta-row">
              <span>File Name</span>
              <strong className="truncate" title={file?.name}>{file ? file.name : '—'}</strong>
            </div>
          </div>

          <div className="tips-card">
            <h4>💡 Tips for best results</h4>
            <p>Ensure your TIFF files are normalized correctly (Z-score for optical, dB scale for SAR) to match the training distribution.</p>
          </div>

          <div className="constraints-list">
            <h4>Available Search Constraints</h4>
            <div className="constraint-item active">
              <span className="check">✓</span> Scene-wise Search
            </div>
            <div className="constraint-item active">
              <span className="check">✓</span> Season Filter
            </div>
            <div className="constraint-item active">
              <span className="check">✓</span> Top-K Selection
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

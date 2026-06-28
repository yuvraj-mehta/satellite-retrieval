import React, { useState, useRef } from 'react';
import { useRetrieval } from '../hooks/useRetrieval';
import { API_BASE } from '../config';

export default function SearchPage() {
  const { search, reset, results, queryImage, retrievalMs, latencyBreakdown, loading } = useRetrieval();
  const fileInputRef = useRef(null);
  const changeFileInputRef = useRef(null);
  
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [queryModality, setQueryModality] = useState('sar');
  const [targetModality, setTargetModality] = useState('optical');
  const [topK, setTopK] = useState(5);
  
  const [previewImage, setPreviewImage] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [compareResult, setCompareResult] = useState(null);
  const [sliderPos, setSliderPos] = useState(50);
  const [hasUnsearchedChanges, setHasUnsearchedChanges] = useState(false);
  const [paramsExpanded, setParamsExpanded] = useState(false);
  const [downloadingResults, setDownloadingResults] = useState(false);

  React.useEffect(() => {
    if (!file) {
      setPreviewImage(null);
      return;
    }
    const fetchPreview = async () => {
      setIsPreviewLoading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('modality', queryModality);
        const res = await fetch(`${API_BASE}/preview`, {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          setPreviewImage(data.image);
        }
      } catch (e) {
        console.error("Preview error", e);
      } finally {
        setIsPreviewLoading(false);
      }
    };
    fetchPreview();
  }, [file, queryModality]);

  const handleSearchClick = async () => {
    setHasUnsearchedChanges(false);
    await search(file, queryModality, targetModality, topK);
  };

  const handleNewSearch = () => {
    setFile(null);
    setPreviewUrl(null);
    setHasUnsearchedChanges(false);
    reset();
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setHasUnsearchedChanges(true);
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

  const handleDragOver = (e) => e.preventDefault();

  const handleDownload = async () => {
    if (!hasResults || downloadingResults) return;
    setDownloadingResults(true);

    try {
      // 1. Download JSON metadata report
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const report = {
        generated_at: new Date().toISOString(),
        query_file: file?.name ?? 'unknown',
        query_modality: queryModality,
        target_modality: targetModality,
        top_k: results.length,
        retrieval_ms: retrievalMs,
        latency_breakdown: latencyBreakdown,
        results: results.map(r => ({
          rank: r.rank,
          scene_id: r.scene_id,
          patch_id: r.patch_id,
          modality: r.modality,
          score: r.score,
          is_ground_truth_match: r.is_match,
          path: r.path,
        })),
      };

      const jsonBlob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const jsonUrl = URL.createObjectURL(jsonBlob);
      const jsonLink = document.createElement('a');
      jsonLink.href = jsonUrl;
      jsonLink.download = `projectVasundhra_results_${timestamp}.json`;
      jsonLink.click();
      URL.revokeObjectURL(jsonUrl);

      // 2. Download each result image from the /image API
      for (const r of results) {
        const imgUrl = `${API_BASE}/image?path=${encodeURIComponent(r.path)}&modality=${r.modality}`;
        try {
          const resp = await fetch(imgUrl);
          if (!resp.ok) continue;
          const blob = await resp.blob();
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = `rank${r.rank}_scene${r.scene_id}_p${r.patch_id}_${r.modality}${r.is_match ? '_MATCH' : ''}.png`;
          a.click();
          URL.revokeObjectURL(blobUrl);
          // Small delay to avoid browser blocking multiple rapid downloads
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (_) {
          // Skip failed images silently
        }
      }
    } finally {
      setDownloadingResults(false);
    }
  };

  const handleSingleDownload = async (e, r) => {
    e.stopPropagation();
    const imgUrl = `${API_BASE}/image?path=${encodeURIComponent(r.path)}&modality=${r.modality}`;
    try {
      const resp = await fetch(imgUrl);
      if (!resp.ok) return;
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `rank${r.rank}_scene${r.scene_id}_p${r.patch_id}_${r.modality}${r.is_match ? '_MATCH' : ''}.png`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch (_) {
      // fail silently for individual download
    }
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
  const hasResults = results && results.length > 0;
  
  // Calculate metrics for results view
  const bestMatchScore = hasResults ? results[0].score : 0;
  const meanScore = hasResults ? results.reduce((acc, r) => acc + r.score, 0) / results.length : 0;
  
  let recallAt5 = 0;
  let f1At5 = 0;
  let mrr = 0;
  
  if (hasResults) {
    const matchIndex = results.findIndex(r => r.is_match);
    if (matchIndex !== -1) {
      mrr = 1 / (matchIndex + 1);
      if (matchIndex < 5) {
        recallAt5 = 1.0;
        // F1 calculation for 1 relevant item retrieved in top 5
        const precisionAt5 = 1 / 5;
        f1At5 = 2 * (precisionAt5 * 1) / (precisionAt5 + 1); 
      }
    }
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto text-white flex flex-col gap-3 animate-fade-in">
      
      {/* Page Header */}
      <div className="flex justify-between items-end mb-1">
        <div>
          <h1 className="text-[1.75rem] font-bold tracking-tight mb-1">Search / Query</h1>
          <p className="text-text-secondary text-[13px]">Find similar satellite images across SAR and Optical modalities using AI-powered cross-modal retrieval.</p>
        </div>
        <button className="border border-accent-violet/50 text-accent-violet-light px-3 py-1.5 rounded-md text-[12px] font-medium hover:bg-accent-violet/10 flex items-center gap-2 transition-colors">
          How it works
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        </button>
      </div>

      <div className="grid grid-cols-12 gap-4 items-start h-full">
        
        {/* ================= LEFT COLUMN ================= */}
        <div className="col-span-3 flex flex-col gap-4">
          
          <div className="bg-[#06080F]/90 backdrop-blur-xl border border-white/5 rounded-xl p-4">
            {!file ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[15px] font-semibold text-white">Upload Query Image</h3>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                </div>
                <p className="text-[13px] text-text-secondary mb-4">Upload a SAR or Optical image (TIFF format)</p>
                
                <div 
                  className={`border border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 border-white/10 bg-white/5 hover:border-accent-violet/50 hover:bg-white/10`}
                  onClick={() => fileInputRef.current.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".tif,.tiff" className="hidden" />
                  
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-violet-light)" strokeWidth="1.5" className="mb-4">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div className="text-[13px] text-text-secondary mb-3">Drag & drop your TIFF image here</div>
                  <div className="text-[11px] text-text-muted mb-4">or</div>
                  <button className="bg-accent-violet hover:bg-accent-violet-light text-white px-5 py-2 rounded-md font-medium text-[13px] transition-colors mb-4" onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }}>
                    Browse Files
                  </button>
                  <div className="text-[11px] text-text-muted mt-2">Supports: .tif, .tiff  •  Max size: 200MB</div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[15px] font-semibold text-white">Query Image</h3>
                  <span className="text-[11px] font-bold text-accent-green bg-accent-green/10 border border-accent-green/20 px-2 py-0.5 rounded flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Uploaded
                  </span>
                </div>
                
                {/* Hidden File Input */}
                <input type="file" ref={changeFileInputRef} onChange={handleFileChange} accept=".tif,.tiff" className="hidden" />
                
                <div className="w-full aspect-square bg-[#06080F]/50 rounded-lg border border-white/10 mb-4 overflow-hidden relative shadow-lg">
                   {isPreviewLoading ? (
                     <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                       <div className="w-6 h-6 border-2 border-accent-violet border-t-transparent rounded-full animate-spin"></div>
                       <div className="text-[12px] text-text-secondary">Generating preview...</div>
                     </div>
                   ) : previewImage ? (
                      <img src={`data:image/png;base64,${previewImage}`} className="w-full h-full object-contain" alt="Query" />
                   ) : queryImage ? (
                      <img src={`data:image/png;base64,${queryImage}`} className="w-full h-full object-contain" alt="Query" />
                   ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-muted text-[12px]">Preview unavailable</div>
                   )}
                </div>

                {hasUnsearchedChanges ? (
                  <button 
                    onClick={handleSearchClick}
                    disabled={loading}
                    className="w-full py-2 bg-accent-violet hover:bg-accent-violet-light text-white rounded-lg text-[12px] font-medium transition-colors flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(124,58,237,0.3)] disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? 'Searching...' : 'Search Again'}
                    {!loading && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>}
                  </button>
                ) : (
                  <button 
                    onClick={() => changeFileInputRef.current.click()} 
                    className="w-full py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[12px] font-medium transition-colors border border-white/10 flex items-center justify-center gap-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    Change Image
                  </button>
                )}

                {/* Collapsible Search Parameters */}
                <div className="mt-3">
                  <button
                    onClick={() => setParamsExpanded(p => !p)}
                    className="flex justify-between items-center text-[12px] w-full text-text-secondary hover:text-white transition-colors"
                  >
                    <span className="flex items-center gap-1.5 font-medium">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                      Search Parameters
                    </span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform duration-200 ${paramsExpanded ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
                  </button>

                  {paramsExpanded && (
                    <div className="flex flex-col gap-2 mt-3 p-3 bg-white/5 border border-white/5 rounded-lg">
                      <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wide mb-1">Query → Target</div>
                      <div className="flex gap-2">
                        <select value={queryModality} onChange={e => { setQueryModality(e.target.value); setHasUnsearchedChanges(true); }}
                          className="flex-1 bg-[#0F121C] border border-white/10 rounded-md px-2 py-1.5 text-white text-[11px] appearance-none focus:outline-none focus:border-accent-violet-light">
                          <option value="sar">SAR</option>
                          <option value="optical">Optical</option>
                        </select>
                        <div className="flex items-center text-text-muted text-[11px]">→</div>
                        <select value={targetModality} onChange={e => { setTargetModality(e.target.value); setHasUnsearchedChanges(true); }}
                          className="flex-1 bg-[#0F121C] border border-white/10 rounded-md px-2 py-1.5 text-white text-[11px] appearance-none focus:outline-none focus:border-accent-violet-light">
                          <option value="optical">Optical</option>
                          <option value="sar">SAR</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="text-[11px] text-text-muted w-10">Top-K:</div>
                        <select value={topK} onChange={e => { setTopK(Number(e.target.value)); setHasUnsearchedChanges(true); }}
                          className="flex-1 bg-[#0F121C] border border-white/10 rounded-md px-2 py-1.5 text-white text-[11px] appearance-none focus:outline-none focus:border-accent-violet-light">
                          <option value={5}>Top 5</option>
                          <option value={10}>Top 10</option>
                          <option value={15}>Top 15</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {file && (
              <>
                <hr className="border-white/5 my-3" />
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[13px] font-semibold text-white">Image Details</h3>
                </div>
                <div className="flex flex-col gap-3 text-[12px]">
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <span className="text-text-secondary">File Name</span>
                    <span className="text-white max-w-[120px] truncate">{file.name}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <span className="text-text-secondary">Dimensions</span>
                    <span className="text-white">256 × 256</span>
                  </div>
                  <div className="flex justify-between items-center pb-3">
                    <span className="text-text-secondary">File Size</span>
                    <span className="text-white">{`${(file.size/1024/1024).toFixed(1)} MB`}</span>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>

        {/* ================= MIDDLE COLUMN ================= */}
        <div className="col-span-6 flex flex-col gap-4">
          
          {!hasResults ? (
            // EMPTY STATE MIDDLE COLUMN
            <>
              <div className="bg-[#06080F]/90 backdrop-blur-xl border border-white/5 rounded-xl p-4 flex flex-col">
                <h3 className="text-[15px] font-semibold text-white mb-5">Search Configuration</h3>
                
                {/* Modalities Section */}
                <div className="flex items-center justify-between gap-6 mb-6 pb-6 border-b border-white/5">
                  <div className="flex-1">
                    <div className="text-[12px] font-medium text-text-secondary mb-3">Query Modality</div>
                    <div className="text-[11px] text-text-muted mb-4">Select the modality of your query image</div>
                    <div className="flex flex-col gap-3">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${queryModality === 'sar' ? 'border-accent-violet-light bg-accent-violet-light' : 'border-text-muted group-hover:border-white'}`}>
                           {queryModality === 'sar' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                        </div>
                        <span className={`text-[13px] ${queryModality === 'sar' ? 'text-white' : 'text-text-secondary group-hover:text-white'}`}>SAR (Sentinel-1)</span>
                        <input type="radio" name="queryModality" value="sar" className="hidden" onChange={() => setQueryModality('sar')} checked={queryModality === 'sar'} />
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${queryModality === 'optical' ? 'border-accent-violet-light bg-accent-violet-light' : 'border-text-muted group-hover:border-white'}`}>
                           {queryModality === 'optical' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                        </div>
                        <span className={`text-[13px] ${queryModality === 'optical' ? 'text-white' : 'text-text-secondary group-hover:text-white'}`}>Optical (Sentinel-2)</span>
                        <input type="radio" name="queryModality" value="optical" className="hidden" onChange={() => setQueryModality('optical')} checked={queryModality === 'optical'} />
                      </label>
                    </div>
                  </div>

                  {/* Swap Icon */}
                  <div className="flex items-center justify-center px-4 mt-8">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="14" x2="21" y2="3"></line><polyline points="8 21 3 21 3 16"></polyline><line x1="20" y1="10" x2="3" y2="21"></line></svg>
                  </div>

                  <div className="flex-1">
                    <div className="text-[12px] font-medium text-text-secondary mb-3">Search In (Target Modality)</div>
                    <div className="text-[11px] text-text-muted mb-4">Select the modality to search in</div>
                    <div className="flex flex-col gap-3">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${targetModality === 'optical' ? 'border-accent-violet-light bg-accent-violet-light' : 'border-text-muted group-hover:border-white'}`}>
                           {targetModality === 'optical' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                        </div>
                        <span className={`text-[13px] ${targetModality === 'optical' ? 'text-white' : 'text-text-secondary group-hover:text-white'}`}>Optical (Sentinel-2)</span>
                        <input type="radio" name="targetModality" value="optical" className="hidden" onChange={() => setTargetModality('optical')} checked={targetModality === 'optical'} />
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${targetModality === 'sar' ? 'border-accent-violet-light bg-accent-violet-light' : 'border-text-muted group-hover:border-white'}`}>
                           {targetModality === 'sar' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                        </div>
                        <span className={`text-[13px] ${targetModality === 'sar' ? 'text-white' : 'text-text-secondary group-hover:text-white'}`}>SAR (Sentinel-1)</span>
                        <input type="radio" name="targetModality" value="sar" className="hidden" onChange={() => setTargetModality('sar')} checked={targetModality === 'sar'} />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Settings Section */}
                <div className="w-1/2 pr-3">
                  <div className="text-[12px] font-medium text-text-secondary mb-3">Top-K Results</div>
                  <div className="text-[11px] text-text-muted mb-4">Number of similar images to retrieve</div>
                  <div className="relative">
                    <select 
                      value={topK}
                      onChange={(e) => setTopK(Number(e.target.value))}
                      className="w-full bg-[#0F121C] border border-white/10 rounded-lg px-4 py-2.5 text-white text-[13px] appearance-none focus:outline-none focus:border-accent-violet-light"
                    >
                      <option value={5}>Top 5</option>
                      <option value={10}>Top 10</option>
                      <option value={20}>Top 20</option>
                      <option value={50}>Top 50</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                  </div>
                </div>
              </div>


              {/* Start Search Button */}
              <button 
                className="w-full py-4 bg-accent-violet hover:bg-accent-violet-light text-white font-medium text-[15px] rounded-lg transition-colors flex justify-center items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(124,58,237,0.3)]"
                disabled={!file || loading}
                onClick={handleSearchClick}
              >
                {loading ? 'Searching...' : 'Start Search'}
                {!loading && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>}
              </button>

            </>
          ) : (
            // RESULTS STATE MIDDLE COLUMN
            <>
              {/* Top-X Retrieved Results */}
              <div className="bg-[#06080F]/90 backdrop-blur-xl border border-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[14px] font-semibold text-white">Retrieved Results</h3>
                  <div className="text-[11px] text-text-muted flex items-center gap-1.5">
                    Search completed in {retrievalMs?.toFixed(0)} ms
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-green"></div>
                  </div>
                </div>
                
                <div className="flex gap-4 overflow-x-auto pb-4 pt-1 custom-scrollbar">
                  {results.slice(0, topK).map((result, idx) => (
                    <div key={idx}
                      onClick={() => { setCompareResult(result); setSliderPos(50); }}
                      className={`relative flex-shrink-0 w-[160px] flex flex-col p-2.5 rounded-lg border cursor-pointer ${idx === 0 ? 'bg-accent-green/5 border-accent-green shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'bg-bg-surface-2 border-white/5 hover:border-white/20'} transition-all group`}>
                      
                      {/* Top Badges */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="bg-bg-primary border border-white/10 px-2 py-0.5 rounded text-white font-bold text-[10px] z-10 shadow-sm">
                          #{idx + 1}
                        </div>
                        <div className={`text-[12px] font-extrabold ${idx === 0 ? 'text-accent-green' : 'text-accent-cyan'}`}>
                          {result.score.toFixed(3)}
                        </div>
                      </div>
                      
                      {/* Image Thumbnail */}
                      <div className="w-full aspect-square rounded-md overflow-hidden border border-white/10 mb-2 relative">
                        <img 
                          src={`${API_BASE}/image?path=${encodeURIComponent(result.path)}&modality=${result.modality}`} 
                          alt={`Result ${idx+1}`} 
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                          <span className="text-white text-[11px] font-semibold flex items-center gap-1.5">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                            Compare
                          </span>
                        </div>
                        {/* Download Button (Overlay) */}
                        <button 
                          onClick={(e) => handleSingleDownload(e, result)}
                          className="absolute top-1.5 right-1.5 text-white/80 hover:text-white bg-black/50 hover:bg-black/80 backdrop-blur-sm p-1.5 rounded transition-all opacity-0 group-hover:opacity-100 z-20"
                          title="Download Image"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                        </button>
                      </div>
                      
                      {/* Meta */}
                      <div className="flex flex-col gap-1 flex-1">
                        <span className="text-[12px] font-medium text-white truncate">Scene {result.scene_id} / Patch {result.patch_id}</span>
                        <span className="text-[11px] text-text-secondary">{result.modality === 'sar' ? 'SAR (Sentinel-1)' : 'Optical (Sentinel-2)'}</span>
                        
                        {idx === 0 && (
                          <div className="mt-3 bg-accent-green/20 text-accent-green border border-accent-green/30 text-[11px] font-bold uppercase rounded py-1 text-center flex-shrink-0">
                            Best Match
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Right Scroll Arrow Indicator */}
                  {results.length > 5 && (
                    <div className="flex-shrink-0 w-10 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white cursor-pointer hover:bg-white/10">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Similarity Sparkline */}
              {results.slice(0, topK).length > 1 && (() => {
                const scores = results.slice(0, topK).map(r => r.score);
                const minS = Math.min(...scores);
                const maxS = Math.max(...scores);
                const W = 600; const H = 50;
                const pts = scores.map((s, i) => {
                  const x = scores.length === 1 ? W / 2 : (i / (scores.length - 1)) * W;
                  const y = maxS === minS ? H / 2 : H - ((s - minS) / (maxS - minS)) * (H - 12) - 6;
                  return [x, y];
                });
                const polyline = pts.map(p => p.join(',')).join(' ');
                return (
                  <div className="bg-[#06080F]/90 backdrop-blur-xl border border-white/5 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-[13px] font-semibold text-white flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                        Similarity Drop-off
                      </h4>
                      <span className="text-[11px] text-text-muted">Top {scores.length} results</span>
                    </div>
                    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{height: '50px'}}>
                      <defs>
                        <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25"/>
                          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0"/>
                        </linearGradient>
                      </defs>
                      <polygon points={`0,${H} ${polyline} ${W},${H}`} fill="url(#sparkGrad)"/>
                      <polyline points={polyline} fill="none" stroke="#06b6d4" strokeWidth="2.5" filter="url(#glow)" strokeLinecap="round" strokeLinejoin="round"/>
                      {pts.map(([x, y], i) => (
                        <g key={i}>
                          <circle cx={x} cy={y} r="5" fill="#06080F" stroke={i === 0 ? '#10b981' : '#06b6d4'} strokeWidth="2"/>
                          <circle cx={x} cy={y} r="2.5" fill={i === 0 ? '#10b981' : '#06b6d4'}/>
                        </g>
                      ))}
                    </svg>
                    <div className="flex justify-between text-[10px] text-text-muted mt-1 px-0.5">
                      {scores.map((s, i) => <span key={i}>#{i + 1} {s.toFixed(3)}</span>)}
                    </div>
                  </div>
                );
              })()}

              {/* Actions */}
              <div className="flex items-center justify-center gap-4 mt-2">
                <button 
                  className="px-6 py-2.5 border border-white/10 text-white text-[13px] font-medium rounded-md hover:bg-white/5 transition-colors flex items-center gap-2"
                  onClick={handleNewSearch}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
                  New Search
                </button>
                <button
                  onClick={handleDownload}
                  disabled={downloadingResults}
                  className="px-6 py-2.5 border border-white/10 text-white text-[13px] font-medium rounded-md hover:bg-white/5 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                >
                  {downloadingResults ? (
                    <>
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg>
                      Downloading...
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                      Download Results
                    </>
                  )}
                </button>
              </div>
            </>
          )}

        </div>

        {/* ================= RIGHT COLUMN ================= */}
        <div className="col-span-3 flex flex-col gap-4">
          
          {/* Analysis Insights */}
          <div className="bg-[#06080F]/90 backdrop-blur-xl border border-white/5 rounded-xl p-4">
            <h3 className="text-[14px] font-semibold text-white mb-4 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
              Analysis Insights
            </h3>

            {!hasResults ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" className="mb-3 opacity-50"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                <div className="text-[12px] text-text-secondary leading-relaxed">Run a search to view AI similarity insights, confidence metrics, and score distributions here.</div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col mb-1">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] text-text-secondary">Retrieval Confidence (Best Match)</span>
                    <span className="text-[12px] font-bold text-accent-green">{(bestMatchScore * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-accent-green transition-all duration-700" style={{ width: `${Math.min((bestMatchScore * 100), 100)}%` }}></div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[12px] border-b border-white/5 pb-3">
                  <span className="text-text-secondary">Score Spread (Top {Math.min(topK, results.length)})</span>
                  <span className="text-white font-medium">{(bestMatchScore - results[Math.min(topK, results.length) - 1].score).toFixed(3)}</span>
                </div>

                <div className="flex justify-between items-center text-[12px] border-b border-white/5 pb-3">
                  <span className="text-text-secondary">{queryModality !== targetModality ? 'Cross-Modal Path' : 'Retrieval Mode'}</span>
                  <span className="text-white font-medium capitalize">{queryModality} → {targetModality}</span>
                </div>

                <div className="flex flex-col border-b border-white/5 pb-3">
                  <div className="flex justify-between items-center text-[12px] w-full mb-3">
                    <span className="text-text-secondary">Search Speed</span>
                    <span className="text-white font-medium">{retrievalMs?.toFixed(1)} ms</span>
                  </div>
                  {latencyBreakdown && (
                    <div className="flex flex-col gap-2 pl-2 border-l-2 border-accent-cyan/30">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-text-muted">🧠 Embedding (Model)</span>
                        <span className="text-accent-cyan font-medium">{latencyBreakdown.embedding_ms?.toFixed(1)} ms</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-text-muted">⚡ FAISS Search</span>
                        <span className="text-accent-violet-light font-medium">{latencyBreakdown.faiss_ms?.toFixed(1)} ms</span>
                      </div>
                      <div className="mt-1">
                        <div className="flex gap-1 h-1.5 w-full rounded-full overflow-hidden">
                          <div className="bg-accent-cyan rounded-full" style={{width: `${(latencyBreakdown.embedding_ms / retrievalMs) * 100}%`}}></div>
                          <div className="bg-accent-violet-light rounded-full flex-1"></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-text-muted mt-1">
                          <span>Embed {((latencyBreakdown.embedding_ms / retrievalMs) * 100).toFixed(0)}%</span>
                          <span>FAISS {((latencyBreakdown.faiss_ms / retrievalMs) * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-text-secondary">Ground Truth Match</span>
                  <span className={`font-medium ${mrr === 1 ? 'text-accent-green' : (mrr > 0 ? 'text-accent-amber' : 'text-text-muted')}`}>
                    {mrr === 1 ? 'Found at Rank #1' : (mrr > 0 ? `Found at Rank #${Math.round(1 / mrr)}` : 'Not in top results')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Tips */}
          <div className="bg-[#06080F]/90 backdrop-blur-xl border border-white/5 rounded-xl p-4">
            <h3 className="text-[13px] font-semibold text-white mb-3 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-violet-light)" strokeWidth="2"><path d="M9 21h6"></path><path d="M12 22v-1"></path><path d="M15.4 15.4A7 7 0 1 0 12 2a7 7 0 0 0-3.4 13.4"></path></svg>
              Quick Tips
            </h3>
            
            <ul className="flex flex-col gap-3 text-[12px] text-text-secondary">
              <li className="flex items-start gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                Use high quality, cloud-free images for better results
              </li>
              <li className="flex items-start gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                SAR ↔ Optical cross-modal retrieval works best
              </li>
              <li className="flex items-start gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                Top-10 recommended for better analysis
              </li>
              <li className="flex items-start gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                Results are ranked by similarity score (higher is better)
              </li>
            </ul>
          </div>



        </div>
      </div>

      {/* ===== COMPARISON MODAL ===== */}
      {compareResult && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{background: 'rgba(4,6,15,0.92)', backdropFilter: 'blur(16px)'}}
          onClick={() => setCompareResult(null)}
        >
          <div
            className="relative w-full max-w-4xl bg-[#0A0D1A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div>
                <h2 className="text-[16px] font-bold text-white">Image Comparison</h2>
                <p className="text-[12px] text-text-secondary mt-0.5">
                  Scene {compareResult.scene_id} / Patch {compareResult.patch_id} &middot; Score: <span className="text-accent-green font-bold">{compareResult.score.toFixed(3)}</span>
                </p>
              </div>
              <button
                onClick={() => setCompareResult(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Swipe Slider */}
            <div className="relative w-full" style={{aspectRatio: '2/1', userSelect: 'none'}}>
              {/* Base: Query Image */}
              <div className="absolute inset-0">
                {previewImage
                  ? <img src={`data:image/png;base64,${previewImage}`} className="absolute inset-0 w-full h-full object-contain" alt="Query" />
                  : queryImage
                    ? <img src={`data:image/png;base64,${queryImage}`} className="absolute inset-0 w-full h-full object-contain" alt="Query" />
                    : <div className="w-full h-full bg-bg-surface-2 flex items-center justify-center text-text-muted text-[12px]">Query image unavailable</div>
                }
                <div className="absolute bottom-3 left-3 bg-black/70 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md">
                  {queryModality === 'sar' ? 'SAR — Query' : 'Optical — Query'}
                </div>
              </div>

              {/* Top: Retrieved Image clipped to right side of slider */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{clipPath: `polygon(${sliderPos}% 0, 100% 0, 100% 100%, ${sliderPos}% 100%)`}}
              >
                <img
                  src={`${API_BASE}/image?path=${encodeURIComponent(compareResult.path)}&modality=${compareResult.modality}`}
                  className="absolute inset-0 w-full h-full object-contain"
                  alt="Retrieved"
                />
                <div className="absolute bottom-3 right-3 bg-black/70 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md">
                  {compareResult.modality === 'sar' ? 'SAR — Retrieved' : 'Optical — Retrieved'}
                </div>
              </div>

              {/* Divider line + handle */}
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)] pointer-events-none"
                style={{left: `${sliderPos}%`, transform: 'translateX(-50%)'}}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white shadow-xl flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a1a2e" strokeWidth="2.5">
                    <polyline points="15 18 9 12 15 6"/>
                    <polyline points="9 18 3 12 9 6" style={{transform: 'translateX(6px)'}}/>
                  </svg>
                </div>
              </div>

              {/* Invisible range input for interaction */}
              <input
                type="range" min="0" max="100" value={sliderPos}
                onChange={e => setSliderPos(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-col-resize"
                style={{zIndex: 10}}
              />
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-white/5 text-center text-[11px] text-text-muted">
              Drag left or right to compare &nbsp;&middot;&nbsp; Press <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white mx-1">Esc</kbd> or click outside to close
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

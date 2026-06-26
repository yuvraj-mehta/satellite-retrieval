import { useState } from "react";
import axios from "axios";
import { API_BASE } from "../config";
import { useQueryHistory } from "./useQueryHistory";

export const useRetrieval = () => {
  const [results, setResults] = useState([]);
  const [queryImage, setQueryImage] = useState(null);
  const [retrievalMs, setRetrievalMs] = useState(null);
  const [latencyBreakdown, setLatencyBreakdown] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { addEntry } = useQueryHistory();

  const search = async (file, queryModality, targetModality, k = 5) => {
    setLoading(true);
    setError(null);
    setResults([]);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("query_modality", queryModality);
    formData.append("target_modality", targetModality);
    formData.append("k", k);

    try {
      const response = await axios.post(`${API_BASE}/query`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      
      setResults(response.data.results);
      setQueryImage(response.data.query_image);
      setRetrievalMs(response.data.retrieval_ms);
      setLatencyBreakdown(response.data.latency_breakdown);

      // Extract scene and patch from filename
      let sceneId = "Unknown";
      let patchId = "Unknown";
      const filenameMatch = file.name.match(/_s\d*_?(\d+)_p(\d+)\.tif$/) || file.name.match(/_(\d+)_p(\d+)\.tif$/);
      if (filenameMatch) {
        sceneId = filenameMatch[1] || filenameMatch[2]; // handle both regex patterns loosely
        patchId = filenameMatch[2] || filenameMatch[3];
        // more strict regex match:
        const strictMatch = file.name.match(/_p(\d+)\.tif$/);
        const sceneMatch = file.name.match(/_(\d+)_p\d+\.tif$/);
        if (strictMatch) patchId = strictMatch[1];
        if (sceneMatch) sceneId = sceneMatch[1];
      }

      // Add to history
      addEntry({
        id: Date.now().toString(),
        queryModality,
        targetModality,
        topK: k,
        sceneId,
        patchId,
        retrievalMs: response.data.retrieval_ms,
        timestamp: Date.now()
      });

    } catch (err) {
      console.error("Retrieval error:", err);
      const errMsg = err.response?.data?.detail || err.message || "Failed to connect to the backend server.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResults([]);
    setQueryImage(null);
    setRetrievalMs(null);
    setLatencyBreakdown(null);
    setLoading(false);
    setError(null);
  };

  return { results, queryImage, retrievalMs, latencyBreakdown, loading, error, search, reset };
};

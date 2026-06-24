import { useState } from "react";
import axios from "axios";
import { API_BASE } from "../config";

export const useRetrieval = () => {
  const [results, setResults] = useState([]);
  const [queryImage, setQueryImage] = useState(null);
  const [retrievalMs, setRetrievalMs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const search = async (file, queryModality, targetModality) => {
    setLoading(true);
    setError(null);
    setResults([]);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("query_modality", queryModality);
    formData.append("target_modality", targetModality);
    formData.append("k", 5);

    try {
      const response = await axios.post(`${API_BASE}/query`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      
      setResults(response.data.results);
      setQueryImage(response.data.query_image);
      setRetrievalMs(response.data.retrieval_ms);
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
    setLoading(false);
    setError(null);
  };

  return { results, queryImage, retrievalMs, loading, error, search, reset };
};

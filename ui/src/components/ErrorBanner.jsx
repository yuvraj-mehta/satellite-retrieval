import React from 'react';
import './ErrorBanner.css';

export default function ErrorBanner({ error }) {
  if (!error) return null;

  let title = "Search Error";
  let description = typeof error === 'string' ? error : JSON.stringify(error);
  let action = "Please check your inputs and try again.";

  // Parse common errors for better UI presentation
  if (typeof error === 'string') {
    if (error.includes("Modality mismatch:")) {
      title = "Format Mismatch Detected";
      const parts = error.split("Please change");
      description = parts[0].replace("Modality mismatch:", "").trim();
      if (parts.length > 1) {
        action = "Action Required: Please change " + parts[1].trim();
      }
    } else if (error.includes("band index") && error.includes("out of range")) {
      title = "Incompatible Image Format";
      description = "The backend failed to process the image bands. This usually happens when you upload a SAR image (2 bands) but search as Optical (requires 4+ bands), or if the image is corrupted.";
      action = "Action Required: Verify your Query Modality matches the uploaded image type (SAR vs Optical).";
    } else if (error.includes("Failed to connect") || error.includes("Network Error")) {
      title = "Backend Connection Failed";
      description = "Could not reach the FastAPI retrieval engine.";
      action = "Ensure the backend is running by executing 'bash backend/start.sh' in the terminal.";
    } else if (error.includes("500") || error.includes("Internal Server Error")) {
      title = "Internal Engine Error";
      description = "The backend encountered an unexpected error while processing your request.";
      action = "Check the backend terminal logs for detailed stack traces.";
    }
  }

  return (
    <div className="error-banner glass-error">
      <div className="error-header">
        <span className="error-icon">⚠️</span>
        <span className="error-title">{title}</span>
      </div>
      <div className="error-content">
        <p className="error-message">{description}</p>
        <div className="error-action">{action}</div>
      </div>
    </div>
  );
}

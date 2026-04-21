import React, { useState, useRef } from "react";
import { Upload, FileText, X, CheckCircle2, Loader2 } from "lucide-react";
import "./ui.css";

export default function FileUpload({ 
  onFileSelect, 
  accept = ".csv,.xlsx", 
  isUploading = false,
  maxSizeMB = 10 
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    validateAndSelect(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    validateAndSelect(file);
  };

  const validateAndSelect = (file) => {
    if (!file) return;

    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`File is too large. Maximum size is ${maxSizeMB}MB.`);
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);
  };

  const clearFile = (e) => {
    e.stopPropagation();
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div 
      className={`file-upload-container ${isDragging ? "dragging" : ""} ${selectedFile ? "has-file" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        style={{ display: "none" }}
      />

      <div className="file-upload-content">
        {!selectedFile ? (
          <>
            <div className="upload-icon-wrapper">
              <Upload className="upload-icon" />
            </div>
            <div className="upload-text">
              <h3>Click or drag to upload</h3>
              <p>Supports {accept.split(',').join(' or ')} files up to {maxSizeMB}MB</p>
            </div>
          </>
        ) : (
          <div className="selected-file-info">
            <div className="file-icon-wrapper">
              <FileText className="file-icon" />
            </div>
            <div className="file-details">
              <span className="file-name">{selectedFile.name}</span>
              <span className="file-size">{(selectedFile.size / 1024).toFixed(1)} KB</span>
            </div>
            {!isUploading ? (
              <button className="clear-file-btn" onClick={clearFile}>
                <X size={18} />
              </button>
            ) : (
              <div className="uploading-indicator">
                <Loader2 className="spinner" size={18} />
              </div>
            )}
          </div>
        )}
      </div>

      {isUploading && (
        <div className="upload-overlay-progress">
           <div className="progress-bar-container">
              <div className="progress-bar-fill animate-progress"></div>
           </div>
           <span>Uploading data...</span>
        </div>
      )}
    </div>
  );
}

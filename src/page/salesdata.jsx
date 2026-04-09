import React, { useState, useMemo, useEffect, useDeferredValue } from "react";
import {
  Plus,
  Trash2,
  X,
  Loader2,
  Upload,
  Search,
  ArrowUpDown,
  Download,
  Eye,
} from "lucide-react";
import "./salesdata.css";
import Dialog from "../ui/Dialog";
import "../ui/ui.css";
import { toast } from "../ui/toast";
import { useData } from "../context/DataContext";

export default function Salesdata() {
  const {
    uploads,
    currentUpload,
    isLoadingSales,
    salesError,
    fetchAllSales,
    fetchSalesById,
    uploadSalesFile,
    deleteSales,
    deleteRecordFromSales,
    exportSales,
    clearSalesError,
    clearCurrentUpload,
    addRecordToSales,
  } = useData();

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAddRecordOpen, setIsAddRecordOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const deferredSortConfig = useDeferredValue(sortConfig);
  const [newRecord, setNewRecord] = useState({});
  const [currentPage, setCurrentPage] = useState(1);

  // Load sales on component mount
  useEffect(() => {
    fetchAllSales();
  }, [fetchAllSales]);

  // Show error toast
  useEffect(() => {
    if (salesError) {
      toast(salesError, "error");
      clearSalesError();
    }
  }, [salesError, clearSalesError]);

  // Handle file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFile(file);
    setIsUploading(true);

    try {
      await uploadSalesFile(file);
      toast("File uploaded successfully!", "success");
      setIsUploadOpen(false);
      setUploadFile(null);
    } catch (error) {
      toast(`Upload failed: ${error.message}`, "error");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle delete upload
  const handleDeleteUpload = async (uploadId) => {
    if (window.confirm("Are you sure you want to delete this upload?")) {
      const success = await deleteSales(uploadId);
      if (success) {
        toast("Upload deleted successfully", "success");
      }
    }
  };

  // Handle delete record
  const handleDeleteRecord = async (recordIndex) => {
    if (!currentUpload) return;

    if (window.confirm("Delete this record?")) {
      const success = await deleteRecordFromSales(currentUpload.id, recordIndex);
      if (success) {
        toast("Record deleted", "success");
      }
    }
  };

  // Handle add record
  const handleAddRecord = async () => {
    if (!currentUpload || Object.keys(newRecord).length === 0) {
      toast("Please fill in all fields", "error");
      return;
    }

    const success = await addRecordToSales(currentUpload.id, newRecord);
    if (success) {
      toast("Record added successfully", "success");
      setNewRecord({});
      setIsAddRecordOpen(false);
    }
  };

  // Handle export
  const handleExport = async (uploadId) => {
    const success = await exportSales(uploadId);
    if (success) {
      toast("File exported!", "success");
    }
  };

  // Filter and sort records
  const filteredRecords = useMemo(() => {
    if (!currentUpload?.records) return [];

    let filtered = currentUpload.records;

    // Only run the heavy search logic if the user is actually searching
    if (deferredSearchTerm) {
      const searchStr = deferredSearchTerm.toLowerCase();
      filtered = filtered.filter((record) => {
        for (const key in record) {
          if (Object.prototype.hasOwnProperty.call(record, key)) {
            const val = record[key];
            if (val != null && String(val).toLowerCase().includes(searchStr)) {
              return true;
            }
          }
        }
        return false;
      });
    }

    if (deferredSortConfig.key) {
      // Must create a shallow copy before sorting to avoid mutating the original dataset
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[deferredSortConfig.key];
        const bVal = b[deferredSortConfig.key];
        const comparison = aVal < bVal ? -1 : 1;
        return deferredSortConfig.direction === "asc" ? comparison : -comparison;
      });
    }

    return filtered;
  }, [currentUpload?.records, deferredSearchTerm, deferredSortConfig]);

  // Reset to first page when data or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearchTerm, currentUpload]);

  // Paginated records (50 per page)
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * 50;
    return filteredRecords.slice(start, start + 50);
  }, [filteredRecords, currentPage]);

  if (isLoadingSales && uploads.length === 0) {
    return (
      <div className="page-center">
        <Loader2 size={32} className="spinner" />
        <p>Loading sales data...</p>
      </div>
    );
  }

  return (
    <div className="salesdata-page">
      <div className="page-header">
        <h1>Sales Data Management</h1>
        <button
          className="btn-primary"
          onClick={() => setIsUploadOpen(true)}
          disabled={isUploading}
        >
          <Upload size={18} />
          Upload File
        </button>
      </div>

      {/* Uploads List */}
      {!currentUpload ? (
        <div className="uploads-section">
          <h2>Your Uploads</h2>
          {uploads.length === 0 ? (
            <div className="empty-state">
              <p>No uploads yet. Start by uploading a CSV or Excel file.</p>
            </div>
          ) : (
            <div className="uploads-grid">
              {uploads.map((upload) => (
                <div key={upload.id} className="upload-card">
                  <h3>{upload.filename}</h3>
                  <p className="upload-meta">
                    {upload.record_count} records
                  </p>
                  <div className="upload-actions">
                    <button
                      className="btn-secondary"
                      onClick={() => fetchSalesById(upload.id)}
                    >
                      <Eye size={16} /> View
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => handleExport(upload.id)}
                    >
                      <Download size={16} /> Export
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => handleDeleteUpload(upload.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Records Table */
        <div className="records-section">
          <div className="section-header">
            <button
              className="btn-secondary"
              onClick={() => clearCurrentUpload()}
            >
              ← Back to Uploads
            </button>
            <h2>{currentUpload.filename}</h2>
            <button
              className="btn-primary"
              onClick={() => setIsAddRecordOpen(true)}
            >
              <Plus size={18} /> Add Record
            </button>
          </div>

          <div className="records-toolbar">
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search records..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <p className="record-count">
              {filteredRecords.length} of {currentUpload.record_count} records
            </p>
          </div>

          <div className="table-container">
            <table className="records-table">
              <thead>
                <tr>
                  {currentUpload.columns?.map((col) => (
                    <th
                      key={col}
                      onClick={() =>
                        setSortConfig({
                          key: col,
                          direction:
                            sortConfig.key === col &&
                              sortConfig.direction === "asc"
                              ? "desc"
                              : "asc",
                        })
                      }
                    >
                      <div className="header-cell">
                        {col}
                        {sortConfig.key === col && (
                          <ArrowUpDown size={14} />
                        )}
                      </div>
                    </th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td
                      colSpan={
                        (currentUpload.columns?.length || 0) + 1
                      }
                      className="empty-cell"
                    >
                      No records found
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((record, idx) => {
                    // Map index back to original array for proper deletion if filtered/sorted
                    // Actually, simpler to just pass the real index or handle it differently, 
                    // but we will use the current dataset index for now
                    const realIdx = (currentPage - 1) * 50 + idx;
                    return (
                      <tr key={realIdx}>
                        {currentUpload.columns?.map((col) => (
                          <td key={`${realIdx}-${col}`}>
                            {String(record[col]).substring(0, 50)}
                          </td>
                        ))}
                        <td className="action-cell">
                          <button
                            className="btn-icon-danger"
                            onClick={() => handleDeleteRecord(realIdx)}
                            title="Delete record"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredRecords.length > 0 && (
            <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', padding: '1rem', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
              <button
                className="btn-secondary"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                Previous
              </button>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Page {currentPage} of {Math.ceil(filteredRecords.length / 50) || 1}
              </span>
              <button
                className="btn-secondary"
                disabled={currentPage >= Math.ceil(filteredRecords.length / 50)}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)}>
        <div className="dialog-header">
          <h2>Upload Sales Data</h2>
          <button
            className="dialog-close"
            onClick={() => setIsUploadOpen(false)}
          >
            <X size={24} />
          </button>
        </div>
        <div className="dialog-content">
          <p>Upload a CSV or Excel file with your sales data</p>
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="file-input"
          />
          {isUploading && (
            <div className="upload-progress">
              <Loader2 size={20} className="spinner" />
              <p>Uploading...</p>
            </div>
          )}
        </div>
      </Dialog>

      {/* Add Record Dialog */}
      <Dialog isOpen={isAddRecordOpen} onClose={() => setIsAddRecordOpen(false)}>
        <div className="dialog-header">
          <h2>Add New Record</h2>
          <button
            className="dialog-close"
            onClick={() => setIsAddRecordOpen(false)}
          >
            <X size={24} />
          </button>
        </div>
        <div className="dialog-content">
          {currentUpload?.columns?.map((col) => (
            <input
              key={col}
              type="text"
              placeholder={col}
              value={newRecord[col] || ""}
              onChange={(e) => setNewRecord({ ...newRecord, [col]: e.target.value })}
            />
          ))}
          <div className="dialog-footer">
            <button className="btn btn-ghost" onClick={() => setIsAddRecordOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAddRecord}>Add Record</button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

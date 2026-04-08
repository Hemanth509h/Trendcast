import React, { useState, useMemo, useEffect } from "react";
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
    addRecordToSales,
  } = useData();

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAddRecordOpen, setIsAddRecordOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [newRecord, setNewRecord] = useState({});

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
    
    let filtered = currentUpload.records.filter((record) => {
      const searchStr = searchTerm.toLowerCase();
      return Object.values(record).some((val) =>
        String(val).toLowerCase().includes(searchStr)
      );
    });

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        const comparison = aVal < bVal ? -1 : 1;
        return sortConfig.direction === "asc" ? comparison : -comparison;
      });
    }

    return filtered;
  }, [currentUpload?.records, searchTerm, sortConfig]);

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
              onClick={() => setCurrentUpload(null)}
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
                  filteredRecords.map((record, idx) => (
                    <tr key={idx}>
                      {currentUpload.columns?.map((col) => (
                        <td key={`${idx}-${col}`}>
                          {String(record[col]).substring(0, 50)}
                        </td>
                      ))}
                      <td className="action-cell">
                        <button
                          className="btn-icon-danger"
                          onClick={() => handleDeleteRecord(idx)}
                          title="Delete record"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
              onChange={(e) =>
                setNewRecord({ ...newRecord, [col]: e.target.value })
              }
              className="dialog-input"
            />
          ))}
          <div className="dialog-actions">
            <button
              className="btn-secondary"
              onClick={() => setIsAddRecordOpen(false)}
            >
              Cancel
            </button>
            <button className="btn-primary" onClick={handleAddRecord}>
              Add Record
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
  const [isopenimportdialog, setisopenimportdialog] = useState(false);
  const [isopenadddialog, setisopenadddialog] = useState(false);
  const [isuploding, setisuploding] = useState(false);
  const [salesdatauploaed, setsalesdatauploaed] = useState(false);
  const [formData, setFormData] = useState({});
  const [dataloading, setDataloading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const [importedfile, setimportedfile] = useState(null);
  const [importedfilename, setimportedfilename] = useState(() => sessionStorage.getItem("sales_filename") || null);
  const [importedfilerecord, setimportedfilerecord] = useState(() => Number(sessionStorage.getItem("sales_recordcount")) || 0);
  
  // Initialize from sessionStorage or empty array
  const [salesdata, setsalesdata] = useState(() => {
    const stored = sessionStorage.getItem("salesdata");
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    // Only fetch if sessionStorage is empty
    if (salesdata.length === 0 && !sessionStorage.getItem("salesdata")) {
      fatchdata();
    }
  }, []);

  const handleupload = async () => {
    if (!importedfile) return alert("Please select a file to upload.");
    setisuploding(true);
    const body = new FormData();
    body.append("file", importedfile);

    try {
      const token = localStorage.getItem("authToken");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch(getApiUrl("/api/upload"), {
        method: "POST",
        headers,
        body,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }
      setimportedfilename(result.filename);
      setimportedfilerecord(result.records);
      sessionStorage.setItem("sales_filename", result.filename);
      sessionStorage.setItem("sales_recordcount", result.records);
      toast("File uploaded successfully!", "success");

      setisopenimportdialog(false);
      setimportedfile(null);
      setsalesdatauploaed(true);
      // Clear sessionStorage to refresh data
      sessionStorage.removeItem("salesdata");
      fatchdata();
    } catch (error) {
      toast(error.message, "error");
    }
    setisuploding(false);
  };

  const deletedata = async () => {
    if (!window.confirm("Are you sure you want to clear all data?")) return;
    try {
      const token = localStorage.getItem("authToken");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch(getApiUrl("/api/delete"), {
        method: "GET",
        headers,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      } else {
        toast(result.message, result.type);
        setsalesdata([]);
        // Clear sessionStorage
        sessionStorage.removeItem("salesdata");
        sessionStorage.removeItem("sales_filename");
        sessionStorage.removeItem("sales_recordcount");
        setimportedfilename(null);
        setimportedfilerecord(0);
      }
    } catch (error) {
      toast(error.message, "error");
    }
  };

  const fatchdata = async () => {
    try {
      setDataloading(true);
      const token = localStorage.getItem("authToken");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch(getApiUrl("/api/salesdata"), {
        method: "GET",
        headers,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Failed to fetch data");
      }

      setsalesdata(result.data || []);
      if (result.filename) {
        setimportedfilename(result.filename);
        sessionStorage.setItem("sales_filename", result.filename);
      }
      if (result.record_count !== undefined) {
        setimportedfilerecord(result.record_count);
        sessionStorage.setItem("sales_recordcount", result.record_count);
      }
      // Store in sessionStorage
      sessionStorage.setItem("salesdata", JSON.stringify(result.data || []));
      toast("Data Synchronized", "success");
    } catch (error) {
      console.error("Fetch error:", error);
      toast(error.message, "error");
    } finally {
      setDataloading(false);
    }
  };

  const handleaddrecord = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("authToken");
      const headers = {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      };
      const response = await fetch(getApiUrl("/api/addrecord"), {
        method: "POST",
        headers,
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error);
      }
      toast("Record saved successfully!", "success");
      setisopenadddialog(false);
      // Clear sessionStorage to refresh data
      sessionStorage.removeItem("salesdata");
      fatchdata();
    } catch (error) {
      toast(error.message, "error");
    }
  };

  const handledeleterecord = async (record) => {
    if (!window.confirm("Delete this record?")) return;
    try {
      const token = localStorage.getItem("authToken");
      const headers = {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      };
      const response = await fetch(getApiUrl("/api/deleterecord"), {
        method: "POST",
        headers,
        body: JSON.stringify({ record }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error);
      }
      toast("Record removed", "success");
      // Clear sessionStorage to refresh data
      sessionStorage.removeItem("salesdata");
      fatchdata();
    } catch (error) {
      toast(error.message, "error");
    }
  };

  const handlededit = async (record) => {
    setFormData(record);
    setisopenadddialog(true);
  };

  const exportcsv = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch(getApiUrl("/api/export"), { 
        method: "GET",
        headers,
      });
      if (!response.ok) {
        throw new Error("Failed to export data");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `sales_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast(error.message, "error");
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedData = useMemo(() => {
    let result = [...salesdata];

    // Search filter
    if (searchTerm) {
      result = result.filter(item => 
        Object.values(item).some(val => 
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Sort
    if (sortConfig.key) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [salesdata, searchTerm, sortConfig]);

  return (
    <>
      <div className="sales-data-page">
        <div className="sales-data-header-section">
          <h1 className="sales-registry-header">Sales Registry</h1>
          <p className="page-description">
            Monitor and maintain your commercial performance records.
          </p>
          {importedfilename && (
            <div className="import-status-badge">
              <FileSpreadsheet size={14} />
              <span>{importedfilename} • {importedfilerecord} records</span>
            </div>
          )}
        </div>

        <div className="action-toolbar">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Filter records..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="button-group">
            <button className="btn btn-secondary" onClick={fatchdata}>
              Sync
            </button>
            <button className="btn btn-secondary" onClick={exportcsv}>
              Export
            </button>
            <button className="btn btn-danger" onClick={deletedata}>
              <Trash2 size={16} />
              Reset
            </button>
            <button className="btn btn-primary" onClick={() => setisopenimportdialog(true)}>
              <Upload size={16} />
              Import
            </button>
            <button className="btn btn-success" onClick={() => { setFormData({}); setisopenadddialog(true); }}>
              <Plus size={16} />
              Add
            </button>
          </div>
        </div>
      </div>

      <div className="sales-data-container">
        {dataloading ? (
          <div className="loading-state">
            <Loader2 className="spinner" size={32} />
            <p>Fetching sales intelligence...</p>
          </div>
        ) : filteredAndSortedData.length > 0 ? (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  {Object.keys(salesdata[0]).map((key) => (
                    <th key={key} onClick={() => handleSort(key)} className="sortable-th">
                      <div className="th-content">
                        {key}
                        <ArrowUpDown size={12} className={sortConfig.key === key ? "active-sort" : "inactive-sort"} />
                      </div>
                    </th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedData.map((record, index) => (
                  <tr key={index}>
                    {Object.values(record).map((value, i) => (
                      <td key={i}>
                        {typeof value === "object" ? JSON.stringify(value) : String(value)}
                      </td>
                    ))}
                    <td className="actions-cell">
                      <div className="row-actions">
                        <button className="icon-btn edit" onClick={() => handlededit(record)} title="Edit">
                          <Edit2 size={14} />
                        </button>
                        <button className="icon-btn delete" onClick={() => handledeleterecord(record)} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <h3>No Records Found</h3>
            <p>Start by importing a CSV or adding a manual entry.</p>
          </div>
        )}
      </div>

      <Dialog
        isopen={isopenimportdialog}
        isclose={() => {
          setisopenimportdialog(false);
          setimportedfile(null);
          setisuploding(false);
        }}
        title="Import Intelligence"
      >
        <div className="dialog-content">
          <div className="upload-zone">
            <input
              type="file"
              id="file-upload"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => setimportedfile(e.target.files[0])}
              hidden
            />
            <label htmlFor="file-upload" className="upload-label">
              <Upload size={32} />
              <span>{importedfile ? importedfile.name : "Choose CSV file"}</span>
            </label>
          </div>
          <div className="dialog-footer">
            <button className="btn btn-ghost" onClick={() => setisopenimportdialog(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={!importedfile || isuploding} onClick={handleupload}>
              {isuploding ? <Loader2 className="spinner-sm" /> : <Upload size={16} />}
              Upload
            </button>
          </div>
        </div>
      </Dialog>

      <Dialog
        isopen={isopenadddialog}
        isclose={() => setisopenadddialog(false)}
        title={formData.id ? "Update Record" : "New Sales Entry"}
      >
        <div className="dialog-content">
          <form className="record-form" onSubmit={handleaddrecord}>
            <div className="form-grid">
              {(salesdata.length > 0 ? Object.keys(salesdata[0]) : ["Date", "Amount", "Category"]).map((key) => (
                <div className="form-group" key={key}>
                  <label>{key}</label>
                  <input
                    type="text"
                    value={formData[key] || ""}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    placeholder={`Enter ${key.toLowerCase()}`}
                    required={key !== "id"}
                    disabled={key === "id"}
                  />
                </div>
              ))}
            </div>
            <div className="dialog-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setisopenadddialog(false)}>Discard</button>
              <button type="submit" className="btn btn-primary">Save Changes</button>
            </div>
          </form>
        </div>
      </Dialog>
    </>
  );
}


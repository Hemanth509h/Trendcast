import React, { useState, useEffect } from "react";
import {
  Edit2,
  Plus,
  Trash2,
  X,
  Loader2,
  ChevronUp,
  ChevronDown,
  Upload,
} from "lucide-react";

import "./salesdata.css";
import Dialog from "../ui/Dialog";
import "../ui/ui.css";
import { toast } from "../ui/toast";
import { getApiUrl } from "../utils/api";

export default function Salesdata() {
  const [isopenimportdialog, setisopenimportdialog] = useState(false);
  const [isopenadddialog, setisopenadddialog] = useState(false);
  const [isuploding, setisuploding] = useState(false);
  const [salesdatauploaed, setsalesdatauploaed] = useState(false);
  const [formData, setFormData] = useState({});
  const [dataloading, setDataloading] = useState(false);

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
      const response = await fetch(getApiUrl("/api/upload"), {
        method: "POST",
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
    try {
      const response = await fetch(getApiUrl("/api/delete"), {
        method: "GET",
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
      const response = await fetch(getApiUrl("/api/salesdata"), {
        method: "GET",
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error);
      }
      setsalesdata(result.data);
      // Store in sessionStorage
      sessionStorage.setItem("salesdata", JSON.stringify(result.data));
      setDataloading(false);
      toast(result.message, "success");
    } catch (error) {
      toast(error.message, "error");
    }
    finally {
      setDataloading(false);
    }
  };

  const handleaddrecord = async (e) => {
    e.preventDefault();
    const response = await fetch(getApiUrl("/api/addrecord"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error);
    }
    toast("Record added successfully!", "success");
    setisopenadddialog(false);
    // Clear sessionStorage to refresh data
    sessionStorage.removeItem("salesdata");
    fatchdata();
  };

  const handledeleterecord = async (record) => {
    try {
      const response = await fetch(getApiUrl("/api/deleterecord"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ record }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error);
      }
      toast("Record deleted successfully!", "success");
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
      const response = await fetch(getApiUrl("/api/export"), { method: "GET" });
      if (!response.ok) {
        throw new Error("Failed to export data");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "sales_data.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast(error.message, "error");
    }
  };
  return (
    <>
      <div className="sales-data-page">
        <div className="sales-data-header-section">
          <h1 className="sales-registry-header">Sales Registry</h1>

          <p className="page-description">
            Manage and track your historical sales data points.
          </p>

          {importedfilename && (
            <p className="imported-filename">
              Imported file: {importedfilename} with {importedfilerecord}{" "}
              records
            </p>
          )}
        </div>

        <div className="buttons">
          <div className="action-container">
            <button className="btn btn-refrash" onClick={fatchdata}>
              Refresh
            </button>

            <button className="btn btn-export" onClick={() => exportcsv()}>
              Export CSV
            </button>

            <button className="btn btn-clear" onClick={deletedata}>
              <Trash2 size={16} />
              Clear Data
            </button>

            <button
              className="btn btn-import"
              onClick={() => setisopenimportdialog(true)}
            >
              <Upload size={16} />
              Import CSV
            </button>

            <button
              className="btn btn-add"
              onClick={() => {
                setisopenadddialog(true);
              }}
            >
              <Plus size={16} />
              Add Record
            </button>
          </div>
        </div>
      </div>

      {/* Data Section */}
      <div className="sales-data-container">
        <div className="upload-success-message">
          {dataloading ? (
            <div className="loading-data">
              <p className="loading-sales-data">Loading sales data...</p>
              <Loader2 className="spinner-sm" size={16} />
            </div>
          ) : salesdata && salesdata.length > 0 ? (
            <div className="sales-table">
              <table>
                <thead>
                  <tr>
                    {Object.keys(salesdata[0]).map((key) => (
                      <th key={key}>{key}</th>
                    ))}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {salesdata.map((record, index) => (
                    <tr key={index}>
                      {Object.values(record).map((value, i) => (
                        <td key={i}>
                          {typeof value === "object"
                            ? JSON.stringify(value)
                            : value}
                        </td>
                      ))}
                      <td>
                        <div style={{ display: "flex", gap: 10 }}>
                          <button
                            className="btn btn-edit-small"
                            onClick={() => handlededit(record)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-delete-small"
                            onClick={() => handledeleterecord(record)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-data-container">
              <p className="no-data-message">
                No sales data available. Please import a CSV file to get
                started.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Import Dialog */}
      <Dialog
        isopen={isopenimportdialog}
        isclose={() => {
          setisopenimportdialog(false);
          setimportedfile(null);
          setisuploding(false);
        }}
        title="Import Sales Data"
      >
        <div className="dialog-body">
          <div
            className="dialog-icon"
            style={{
              backgroundColor: "#0303034d",
              height: 58,
              borderRadius: 8,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 10,
              marginTop: 20
            }}
          >
            <Upload size={20} style={{ color: "#4866ca" }} />
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => setimportedfile(e.target.files[0])}
              style={{
                padding: "10px",
                border: "2px solid #4866ca",
                borderRadius: "6px",
                backgroundColor: "#f9f9f9",
                cursor: "pointer",
                width: "250px",
                fontSize: "14px",
              }}
            />
          </div>

          <p
            className="dialog-instruction"
            style={{ margin: "15px 0", textAlign: "center" }}
          >
            Please select a CSV file containing your sales data. Ensure the file
            follows the required format.
          </p>
          <div
            className="dialog-actions"
            style={{ display: "flex", gap: "10px", justifyContent: "center" }}
          >
            <button
              className="btn btn-upload"
              disabled={!importedfile || isuploding}
              onClick={handleupload}
            >
              {isuploding ? (
                <Loader2 className="spinner-sm" size={16} />
              ) : (
                <Upload size={16} />
              )}

              <span>Upload</span>
            </button>

            <button
              className="btn btn-cancel"
              onClick={() => {
                setisopenimportdialog(false);
                setimportedfile(null);
                setisuploding(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </Dialog>

      <Dialog
        isopen={isopenadddialog}
        isclose={() => setisopenadddialog(false)}
        title="Add Sales Record"
      >
        <div className="dialog-body">
          <p style={{ textAlign: "center" }}>
            Form to add a new sales record goes here.
          </p>
          <div>
            <form className="add-record-form" onSubmit={handleaddrecord}>
              <table className="data-table">
                <tbody>
                  {salesdata && salesdata.length > 0 ? (
                    Object.keys(salesdata[0]).map((key) => (
                      <tr key={key}>
                        <td>
                          <label htmlFor={key}>{key}</label>
                        </td>

                        <td>
                          <input
                            type="text"
                            name={key}
                            id={key}
                            value={formData[key] || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                [key]: e.target.value,
                              })
                            }
                            placeholder={`Enter ${key}`}
                            required
                          />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="2">No data fields available.</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <br />

              <button type="submit">Submit</button>
            </form>
          </div>
        </div>
      </Dialog>
    </>
  );
}

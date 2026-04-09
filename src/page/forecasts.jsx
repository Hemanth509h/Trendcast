import React, { useState, useEffect, useRef } from "react";
import { Loader2, RefreshCw, Download, Trash2 } from "lucide-react";
import "./forecasts.css";
import { toast } from "../ui/toast";
import { useData } from "../context/DataContext";
import Dialog from "../ui/Dialog";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
);

export default function Forecasts() {
  const {
    uploads,
    currentUpload,
    isLoadingSales,
    isLoadingForecast,
    generateForecast,
    fetchSalesById,
    fetchAllSales,
  } = useData();

  // Ensure sales data is loaded when visiting forecasts page directly
  useEffect(() => {
    if (uploads.length === 0) {
      fetchAllSales();
    }
  }, [fetchAllSales, uploads.length]);

  const [selectedUpload, setSelectedUpload] = useState(null);
  const [selectedUploadId, setSelectedUploadId] = useState("");
  const [selectedColumn, setSelectedColumn] = useState("");
  const [forecastHorizon, setForecastHorizon] = useState(12);
  const [forecastModel, setForecastModel] = useState("timeseries");
  const [forecastData, setForecastData] = useState(null);
  const [metrics, setMetrics] = useState(null);
  
  const [groupBy, setGroupBy] = useState("");
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [selectedColumnsToForecast, setSelectedColumnsToForecast] = useState([]);

  const [chartType, setChartType] = useState("line");
  const [zoomMode, setZoomMode] = useState("x");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const chartRef = useRef(null);

  const [isFetchingDataset, setIsFetchingDataset] = useState(false);

  // Automatically select the dataset if coming from sales page
  useEffect(() => {
    if (currentUpload && !selectedUploadId) {
      const uId = currentUpload.id || currentUpload._id;
      setSelectedUploadId(uId);
      setSelectedUpload(currentUpload);
      if (currentUpload.columns?.length > 0) {
        setSelectedColumn(currentUpload.columns[0]);
      }
    }
  }, [currentUpload, selectedUploadId]);

  // Load upload data when selected
  const handleSelectUpload = async (uploadId) => {
    setSelectedUploadId(uploadId);
    setForecastData(null);
    setMetrics(null);
    
    if (!uploadId) {
      setSelectedUpload(null);
      return;
    }

    // If it's the currently cached upload, no need to refetch
    if (currentUpload && (currentUpload.id === uploadId || currentUpload._id === uploadId)) {
      setSelectedUpload(currentUpload);
      if (currentUpload.columns?.length > 0) {
        setSelectedColumn(currentUpload.columns[0]);
      }
      return;
    }

    setIsFetchingDataset(true);
    const data = await fetchSalesById(uploadId, { limit: 1, updateState: false });
    setIsFetchingDataset(false);

    if (data) {
      setSelectedUpload(data);
      if (data.columns?.length > 0) {
        setSelectedColumn(data.columns[0]);
      }
    } else {
      toast("Failed to load dataset details.", "error");
    }
  };

  // Generate single forecast
  const handleGenerateForecast = async () => {
    if (!selectedUpload || !selectedColumn) {
      toast("Please select an upload and column", "error");
      return;
    }

    try {
      const params = {
        column: selectedColumn,
        horizon: forecastHorizon,
        model: forecastModel,
        group_by: groupBy || null
      };

      const uId = selectedUpload.id || selectedUpload._id;
      const data = await generateForecast(uId, params);
      
      setForecastData(data);
      setMetrics(data.metrics);

      toast("Forecast generated successfully!", "success");
    } catch (error) {
      toast(`Forecast failed: ${error.message}`, "error");
    }
  };

  const executeMultiColumnForecast = async (columns) => {
    if (columns.length === 0) {
      toast("Please select at least one column", "error");
      return;
    }
    
    setIsSelectionModalOpen(false);
    
    try {
      const uId = selectedUpload.id || selectedUpload._id;
      for (const col of columns) {
        const params = {
          column: col,
          horizon: forecastHorizon,
          model: forecastModel,
          group_by: groupBy || null,
        };
        await generateForecast(uId, params);
      }
      
      toast(`Successfully generated forecasts for ${columns.length} columns!`, "success");
      
      // Load the last generated one into view
      const lastCol = columns[columns.length - 1];
      const params = {
        column: lastCol,
        horizon: forecastHorizon,
        model: forecastModel,
        group_by: groupBy || null,
      };
      const data = await generateForecast(uId, params);
      setForecastData(data);
      setMetrics(data.metrics);
      setSelectedColumn(lastCol);

    } catch (error) {
      toast(`Multi-forecast failed: ${error.message}`, "error");
    }
  };

  const resetZoom = () => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
    }
  };

  const zoomToForecast = () => {
    if (!chartRef.current || !forecastData) return;
    const chart = chartRef.current;
    
    let totalLength = 0;
    let histLength = 0;
    
    if (forecastData.is_grouped) {
      const histDateSet = new Set();
      Object.values(forecastData.groups || {}).forEach((g) => {
        (g.dates || []).forEach((d) => histDateSet.add(d));
      });
      histLength = histDateSet.size;
      totalLength = histLength + (forecastData.dates?.length || 0);
    } else {
      histLength = (forecastData.historical?.dates || []).length;
      totalLength = histLength + (forecastData.dates?.length || 0);
    }

    if (histLength === 0 || totalLength === 0) return;

    chart.scales.x.options.min = Math.max(0, histLength - (Math.floor((forecastData.dates?.length || 0) / 2)) - 2);
    chart.scales.x.options.max = totalLength - 1;
    chart.update();
  };

  const getDatasets = () => {
    if (!forecastData) return [];

    if (forecastData.is_grouped && forecastData.groups) {
      // Grouped Logic
      const datasets = [];
      const colors = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899'];
      let colorIdx = 0;
      
      Object.entries(forecastData.groups).forEach(([groupName, groupData]) => {
        const color = colors[colorIdx % colors.length];
        colorIdx++;
        
        datasets.push({
          label: `${groupName} (Historical)`,
          data: groupData.historical || [],
          borderColor: color,
          backgroundColor: color,
          borderDash: [],
          pointRadius: 0,
          borderWidth: 2,
        });

        const padding = new Array((groupData.historical || []).length).fill(null);
        let forecastY = padding.concat(groupData.forecast || []);
        
        if ((groupData.historical || []).length > 0 && (groupData.forecast || []).length > 0) {
            const lastHist = groupData.historical[groupData.historical.length - 1];
            forecastY[groupData.historical.length - 1] = lastHist;
        }

        datasets.push({
          label: `${groupName} (Forecast)`,
          data: forecastY,
          borderColor: color,
          backgroundColor: color,
          borderDash: [5, 5],
          pointRadius: 2,
          borderWidth: 3,
        });
      });
      return datasets;
    } else {
      // Single series
      const histData = forecastData.historical?.values || [];
      const fcstData = forecastData.forecast || [];
      
      const padding = new Array(histData.length).fill(null);
      let fcstY = padding.concat(fcstData);
      
      if (histData.length > 0 && fcstData.length > 0) {
        fcstY[histData.length - 1] = histData[histData.length - 1];
      }

      const trendData = forecastData.historical?.trend || [];

      return [
        {
          label: "Historical Values",
          data: histData,
          borderColor: "rgba(161, 161, 170, 0.4)",
          backgroundColor: "rgba(161, 161, 170, 0.4)",
          pointRadius: 0,
          borderWidth: 2,
        },
        {
          label: "Historical Trend",
          data: trendData,
          borderColor: "#ec4899", 
          backgroundColor: "#ec4899",
          borderDash: [2, 2],
          pointRadius: 0,
          borderWidth: 1.5,
        },
        {
          label: "Forecast",
          data: fcstY,
          borderColor: "#06b6d4",
          backgroundColor: "rgba(6, 182, 212, 0.2)",
          borderWidth: 3,
          pointRadius: 2,
          fill: true,
        }
      ];
    }
  };

  const xScaleConfig = {
    display: true,
    title: { display: true, text: "Date", color: "#a1a1aa" },
    grid: { color: "rgba(255,255,255,0.05)" },
    ticks: { color: "#a1a1aa" }
  };

  if (isLoadingSales && uploads.length === 0) {
    return (
      <div className="forecast-container">
        <div className="center-loader">
          <Loader2 size={32} className="spinner" />
          <p>Loading forecasts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="forecast-container">
      <div className="forecast-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1>Sales Forecasting</h1>
          <p>Generate time series forecasts from your sales data</p>
        </div>
        <button
          className="btn-secondary"
          onClick={() => fetchAllSales(true)}
          disabled={isLoadingSales}
          style={{ alignSelf: "center" }}
        >
          <RefreshCw size={18} className={isLoadingSales ? "spinner" : ""} />
          Refresh Datasets
        </button>
      </div>

      {/* Config Panel */}
      <div className="forecast-config">
        <div className="config-group">
          <label>Select Dataset</label>
          <select
            value={selectedUploadId}
            onChange={(e) => {
              handleSelectUpload(e.target.value);
            }}
          >
            <option value="">Choose a dataset...</option>
            {uploads.map((upload) => {
              const uId = upload.id || upload._id;
              return (
                <option key={uId} value={uId}>
                  {upload.filename} ({upload.record_count} records)
                </option>
              );
            })}
          </select>
        </div>

        {isFetchingDataset && (
          <div className="empty-forecast" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', color: '#a1a1aa' }}>
            <Loader2 size={36} className="spinner" />
            <p>Fetching dataset...</p>
          </div>
        )}

        {!isFetchingDataset && selectedUpload && (
          <div className="forecasts-buttons">
            <div className="config-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '25px', marginTop: '15px' }}>
              <div className="config-group">
                <label>Column</label>
                <select
                  value={selectedColumn}
                  onChange={(e) => setSelectedColumn(e.target.value)}
                >
                  <option value="">Select column</option>
                  {selectedUpload.records?.length > 0 &&
                    Object.keys(selectedUpload.records[0]).map((key) => (
                      <option key={key} value={key}>
                        {key}
                      </option>
                    ))}
                </select>
              </div>

              <div className="config-group">
                <label>Horizon (periods)</label>
                <select
                  value={forecastHorizon}
                  onChange={(e) => setForecastHorizon(e.target.value)}
                >
                  {[1, 2, 3, 4, 6, 12, 14, 21, 24, 30, 90].map((num) => (
                    <option key={num} value={num}>
                      {num} {num === 1 ? 'Period' : 'Periods'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="config-group">
                <label>Model</label>
                <select
                  value={forecastModel}
                  onChange={(e) => setForecastModel(e.target.value)}
                >
                  <option value="timeseries">Time Series Model</option>
                  <option value="arima">ARIMA</option>
                  <option value="exp_smooth">Exponential Smoothing</option>
                </select>
              </div>

              <div className="config-group">
                <label>Group By</label>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                >
                  <option value="">No Grouping</option>
                  {selectedUpload.records?.length > 0 &&
                    Object.keys(selectedUpload.records[0]).map((key) => (
                      <option key={key} value={key}>
                        {key}
                      </option>
                    ))}
                </select>
              </div>

              <div className="config-group">
                <label>Chart</label>
                <select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value)}
                >
                  <option value="line">Line Chart</option>
                  <option value="bar">Bar Chart</option>
                </select>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '15px' }}>
              <button
                className="btn-generate"
                onClick={handleGenerateForecast}
                disabled={isLoadingForecast}
                style={{ flex: 1, margin: 0 }}
              >
                {isLoadingForecast ? (
                  <>
                    <Loader2 size={18} className="spinner" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw size={18} />
                    Generate Forecast
                  </>
                )}
              </button>
              <button
                className="btn-generate"
                onClick={() => setIsSelectionModalOpen(true)}
                disabled={isLoadingForecast}
                style={{ flex: 1, margin: 0, background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#fff', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)' }}
              >
                Multi-Column Selection
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Forecast Results */}
      {forecastData && (
        <div className="forecast-results" style={{ position: isFullscreen ? 'relative' : 'static', zIndex: isFullscreen ? 9999 : 'auto' }}>
          {/* Metrics */}
          {metrics && (
            <div className="metrics-grid">
              <div className="metric-card">
                <label>Mean Absolute Error</label>
                <span className="metric-value">{metrics.mae?.toFixed(3)}</span>
              </div>
              <div className="metric-card">
                <label>RMSE</label>
                <span className="metric-value">{metrics.rmse?.toFixed(3)}</span>
              </div>
              <div className="metric-card">
                <label>R² Score</label>
                <span className="metric-value">{metrics.r2?.toFixed(3)}</span>
              </div>
              <div className="metric-card">
                <label>Accuracy</label>
                <span className="metric-value">{metrics.accuracy?.toFixed(1)}%</span>
              </div>
            </div>
          )}

          {/* Chart JS User Replacement */}
          <div className="forecast-results" style={{ marginTop: '20px', position: isFullscreen ? 'relative' : 'static', zIndex: isFullscreen ? 100 : 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
              <h2 style={{ margin: 0 }}>
                Forecast Chart ({chartType.charAt(0).toUpperCase() + chartType.slice(1)})
              </h2>
            </div>

            <div style={{ marginBottom: "15px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={zoomToForecast}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px",
                  transition: "all 0.3s ease",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#059669";
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#10b981";
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                }}
              >
                🔍 Zoom to Forecast
              </button>
              <button
                onClick={resetZoom}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#6366f1",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px",
                  transition: "all 0.3s ease",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#4f46e5";
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#6366f1";
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                }}
              >
                ↺ Reset Zoom
              </button>

              <button
                onClick={() => setZoomMode(zoomMode === "x" ? "xy" : "x")}
                style={{
                  padding: "8px 16px",
                  backgroundColor: zoomMode === "xy" ? "#f59e0b" : "#94a3b8",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px",
                  transition: "all 0.3s ease",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                {zoomMode === "xy"
                  ? "🔒 Unlock Y-Axis Zoom"
                  : "🔓 Lock Y-Axis Zoom"}
              </button>
              <button
                onClick={() => setIsFullscreen(true)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#ec4899",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px",
                  transition: "all 0.3s ease",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#be185d";
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#ec4899";
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                }}
              >
                ⛶ Enlarge Chart
              </button>
            </div>

            {isFullscreen && (
              <div 
                className="dialog-overlay" 
                onClick={() => setIsFullscreen(false)} 
                style={{ zIndex: 9998, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(5px)' }}
              />
            )}
            <div
              className="chart-container"
              style={{
                position: isFullscreen ? "fixed" : "relative",
                top: isFullscreen ? "50%" : "auto",
                left: isFullscreen ? "50%" : "auto",
                transform: isFullscreen ? "translate(-50%, -50%)" : "none",
                width: isFullscreen ? "90vw" : "100%",
                maxWidth: isFullscreen ? "1400px" : "none",
                height: isFullscreen ? "85vh" : "600px",
                zIndex: isFullscreen ? 9999 : 1,
                background: isFullscreen ? "#18181b" : "rgba(9, 9, 11, 0.4)",
                padding: isFullscreen ? "30px" : "20px",
                borderRadius: isFullscreen ? "16px" : "10px",
                boxShadow: isFullscreen ? "0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.1)" : "0 4px 6px rgba(0,0,0,0.05)",
                border: isFullscreen ? "1px solid #3f3f46" : "none",
                display: "flex",
                flexDirection: "column"
              }}
            >
              {isFullscreen && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                  <h2 style={{ color: '#fff', margin: 0 }}>Forecast Chart ({chartType.charAt(0).toUpperCase() + chartType.slice(1)})</h2>
                  <button 
                    onClick={() => setIsFullscreen(false)}
                    style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}
                    onMouseEnter={(e) => { e.target.style.background = '#dc2626'; e.target.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={(e) => { e.target.style.background = '#ef4444'; e.target.style.transform = 'translateY(0)' }}
                  >
                    ✕ Close
                  </button>
                </div>
              )}
              <div style={{ flex: 1, position: 'relative' }}>
                {chartType === "line" && (
                  <Line
                    ref={chartRef}
                    data={{
                      labels: forecastData.is_grouped
                        ? (() => {
                            const histDateSet = new Set();
                            Object.values(forecastData.groups || {}).forEach((g) => {
                              (g.dates || []).forEach((d) => histDateSet.add(d));
                            });
                            const histDates = Array.from(histDateSet).sort();
                            const fcstDates = forecastData.dates || [];
                            return [...histDates, ...fcstDates];
                          })()
                        : [
                            ...(forecastData.historical?.dates || []),
                            ...(forecastData.dates || []),
                          ],
                      datasets: getDatasets(),
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      color: '#a1a1aa',
                      plugins: {
                        legend: { position: "top", labels: { color: '#a1a1aa' } },
                        zoom: {
                          zoom: {
                            wheel: { enabled: true },
                            pinch: { enabled: true },
                            mode: zoomMode,
                          },
                          pan: { enabled: true, mode: zoomMode },
                        },
                      },
                      scales: {
                        x: xScaleConfig,
                        y: {
                          beginAtZero: false,
                          title: { display: true, text: "Value", color: '#a1a1aa' },
                          grid: { color: "rgba(255,255,255,0.05)" },
                          ticks: { color: "#a1a1aa" }
                        },
                      },
                    }}
                  />
                )}
                {chartType === "bar" && (
                  <Bar
                    ref={chartRef}
                    data={{
                      labels: forecastData.is_grouped
                        ? (() => {
                            const histDateSet = new Set();
                            Object.values(forecastData.groups || {}).forEach((g) => {
                              (g.dates || []).forEach((d) => histDateSet.add(d));
                            });
                            const histDates = Array.from(histDateSet).sort();
                            const fcstDates = forecastData.dates || [];
                            return [...histDates, ...fcstDates];
                          })()
                        : [
                            ...(forecastData.historical?.dates || []),
                            ...(forecastData.dates || []),
                          ],
                      datasets: getDatasets(),
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      color: '#a1a1aa',
                      plugins: {
                        legend: { position: "top", labels: { color: '#a1a1aa' } },
                        zoom: {
                          zoom: {
                            wheel: { enabled: true },
                            pinch: { enabled: true },
                            mode: zoomMode,
                          },
                          pan: { enabled: true, mode: zoomMode },
                        },
                      },
                      scales: {
                        x: xScaleConfig,
                        y: {
                          beginAtZero: false,
                          title: { display: true, text: "Value", color: '#a1a1aa' },
                          grid: { color: "rgba(255,255,255,0.05)" },
                          ticks: { color: "#a1a1aa" }
                        },
                      },
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="forecast-data-table" style={{ marginTop: '30px', background: 'rgba(9, 9, 11, 0.4)', padding: '20px', borderRadius: '10px' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#fff' }}>Forecast Results Table</h3>
            
            {forecastData.is_grouped ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {Object.entries(forecastData.groups || {}).map(([groupName, groupData]) => (
                  <div key={groupName} className="group-table" style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px' }}>
                    <h4 style={{ color: '#06b6d4', margin: '0 0 10px 0' }}>{groupName}</h4>
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', color: '#a1a1aa', fontSize: '14px' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#18181b', zIndex: 1 }}>
                          <tr>
                            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #3f3f46', fontWeight: 600 }}>Date</th>
                            <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #3f3f46', fontWeight: 600 }}>Forecast</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(forecastData.dates || []).map((date, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #27272a' }}>
                              <td style={{ padding: '8px' }}>{date}</td>
                              <td style={{ padding: '8px', textAlign: 'right', color: '#fff', fontWeight: '500' }}>
                                {groupData.forecast && groupData.forecast[idx] !== undefined 
                                  ? Number(groupData.forecast[idx]).toLocaleString(undefined, { maximumFractionDigits: 2 }) 
                                  : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid #27272a' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', color: '#a1a1aa', fontSize: '14px' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#18181b', zIndex: 1 }}>
                    <tr>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #3f3f46', fontWeight: '600' }}>Date</th>
                      <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #3f3f46', fontWeight: '600', color: '#06b6d4' }}>Forecast Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(forecastData.dates || []).map((date, idx) => (
                      <tr key={`fcst-${idx}`} style={{ borderBottom: '1px solid #27272a', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '10px 12px' }}>{date}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#fff', fontWeight: 'bold' }}>
                          {forecastData.forecast && forecastData.forecast[idx] !== undefined 
                            ? Number(forecastData.forecast[idx]).toLocaleString(undefined, { maximumFractionDigits: 2 }) 
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Export */}
          <div className="forecast-actions" style={{ marginTop: '20px' }}>
            <button className="btn-secondary">
              <Download size={18} /> Export Results
            </button>
          </div>
        </div>
      )}

      {!forecastData && !isFetchingDataset && selectedUpload && (
        <div className="empty-forecast">
          <p>Configure the forecast parameters and click "Generate Forecast" to see results</p>
        </div>
      )}

      {!selectedUpload && !isFetchingDataset && uploads.length > 0 && (
        <div className="empty-forecast">
          <p>Select a dataset to begin forecasting</p>
        </div>
      )}

      {uploads.length === 0 && (
        <div className="empty-forecast">
          <p>No datasets available. Please upload sales data first.</p>
        </div>
      )}

      <Dialog
        isOpen={isSelectionModalOpen}
        onClose={() => setIsSelectionModalOpen(false)}
        title="Select Columns"
      >
        <div style={{ padding: "10px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
              marginBottom: "20px",
            }}
          >
            {selectedUpload?.records?.length > 0 &&
              Object.keys(selectedUpload.records[0])
                .filter((key) => typeof selectedUpload.records[0][key] === "number")
                .map((col) => (
                  <label
                    key={col}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      color: "#fff"
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedColumnsToForecast.includes(col)}
                      onChange={(e) =>
                        e.target.checked
                          ? setSelectedColumnsToForecast([
                              ...selectedColumnsToForecast,
                              col,
                            ])
                          : setSelectedColumnsToForecast(
                              selectedColumnsToForecast.filter(
                                (c) => c !== col,
                              ),
                            )
                      }
                    />
                    {col}
                  </label>
                ))}
          </div>
          <div
            style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}
          >
            <button
              className="btn btn-secondary"
              onClick={() => setIsSelectionModalOpen(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-generate"
              onClick={() =>
                executeMultiColumnForecast(selectedColumnsToForecast)
              }
            >
              Start
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

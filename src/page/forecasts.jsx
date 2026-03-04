import React, { useEffect, useMemo } from "react";
import { toast } from "../ui/toast";
import "./forecasts.css";
import "../ui/ui.css";
import { getApiUrl } from "../utils/api";
import { Info } from "lucide-react";
import Dialog from "../ui/Dialog";
import { Line, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin,
);

export default function Forecasts() {
  const [salesdata, setsalesdata] = React.useState(() => {
    const stored = sessionStorage.getItem("salesdata");
    return stored ? JSON.parse(stored) : [];
  });
  const [importedfilename, setimportedfilename] = React.useState(
    () => sessionStorage.getItem("sales_filename") || null,
  );
  const [importedfilerecord, setimportedfilerecord] = React.useState(
    () => Number(sessionStorage.getItem("sales_recordcount")) || 0,
  );
  const [selectedColumn, setSelectedColumn] = React.useState("");
  const [selectedHorizon, setSelectedHorizon] = React.useState("12");
  const [selectmodel, setselectmodel] = React.useState("timeseries");
  const [groupBy, setGroupBy] = React.useState("");
  const [chartType, setChartType] = React.useState("line");
  const [forecastData, setForecastData] = React.useState(null);
  const [metrics, setMetrics] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [hoveredMetric, setHoveredMetric] = React.useState(null);
  const [zoomRange, setZoomRange] = React.useState({ min: null, max: null });
  const [isAllColumnsMode, setIsAllColumnsMode] = React.useState(false);
  const [isSelectionModalOpen, setIsSelectionModalOpen] = React.useState(false);
  const [selectedColumnsToForecast, setSelectedColumnsToForecast] =
    React.useState([]);
  const [zoomMode, setZoomMode] = React.useState("x");

  const chartRef = React.useRef(null);

  const [zoomorreset, setzoomorreset] = React.useState(false);

  useEffect(() => {
    if (salesdata.length === 0 && !sessionStorage.getItem("salesdata")) {
      fetchdata();
    }
  }, []);

  useEffect(() => {
    if (salesdata && salesdata.length > 0 && !selectedColumn) {
      const keys = Object.keys(salesdata[0]);
      if (keys.length > 0) {
        setSelectedColumn(keys[0]);
      }
    }
  }, [salesdata]);

  const xScaleConfig = useMemo(() => {
    const config = {
      title: {
        display: true,
        text: "Date",
        font: { size: 14, weight: "bold" },
      },
      ticks: { font: { size: 11 }, maxRotation: 45, minRotation: 0 },
      grid: { color: "rgba(200, 200, 200, 0.1)" },
    };
    if (zoomRange.min !== null && typeof zoomRange.min === "number")
      config.min = zoomRange.min;
    if (zoomRange.max !== null && typeof zoomRange.max === "number")
      config.max = zoomRange.max;
    return config;
  }, [zoomRange.min, zoomRange.max]);

  const fetchdata = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch(getApiUrl("/api/salesdata"), {
        method: "GET",
        headers,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      const data = result.data;
      if (data && data.length > 0) {
        const sortedData = [...data].sort((a, b) => new Date(a.date || a.Date) - new Date(b.date || b.Date));
        setsalesdata(sortedData);
        sessionStorage.setItem("salesdata", JSON.stringify(sortedData));
        
        if (!selectedColumn) {
          const keys = Object.keys(sortedData[0]);
          const defaultCol = keys.find(k => k.toLowerCase() === 'weekly_sales') || keys[0];
          setSelectedColumn(defaultCol);
        }
      }
    } catch (error) {
      toast(error.message, "error");
    }
  };

  const handleGenerateForecast = async () => {
    if (!selectedColumn || !selectedHorizon || !selectmodel) {
      toast("Please complete all selections.", "warning");
      return;
    }
    setIsLoading(true);
    setIsAllColumnsMode(false);
    try {
      const token = localStorage.getItem("authToken");
      const headers = {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      };
      const response = await fetch(getApiUrl("/api/generateforecast"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          column: selectedColumn,
          horizon: parseInt(selectedHorizon),
          model: selectmodel,
          group_by: groupBy || null,
        }),
      });
      const result = await response.json();
      console.log("forecast result", result); // debug
      if (!response.ok)
        throw new Error(result.error || "Failed to generate forecast");
      setForecastData(result);
      setMetrics(result.metrics);
      toast("Forecast generated successfully!", "success");
      if (groupBy && !result.is_grouped) {
        toast(`Warning: grouping by \"${groupBy}\" had no effect`, "warning");
      }
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAllColumnsForecast = () => {
    if (!salesdata || salesdata.length === 0) {
      toast("No data available to forecast.", "warning");
      return;
    }
    const numericColumns = Object.keys(salesdata[0]).filter((key) => {
      const val = salesdata[0][key];
      return (
        (typeof val === "number" ||
          (!isNaN(parseFloat(val)) && isFinite(val))) &&
        !["Date", "Store_ID", "Department"].includes(key)
      );
    });
    setSelectedColumnsToForecast(numericColumns);
    setIsSelectionModalOpen(true);
  };

  const executeMultiColumnForecast = async (columnsToProcess) => {
    setIsLoading(true);
    setIsAllColumnsMode(true);
    setIsSelectionModalOpen(false);
    try {
      const allResults = await Promise.all(
        columnsToProcess.map(async (col) => {
          const token = localStorage.getItem("authToken");
          const headers = {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          };
          const response = await fetch(getApiUrl("/api/generateforecast"), {
            method: "POST",
            headers,
            body: JSON.stringify({
              column: col,
              horizon: parseInt(selectedHorizon),
              model: selectmodel,
            }),
          });
          const result = await response.json();
          if (!response.ok)
            throw new Error(result.error || `Failed for ${col}`);
          return { column: col, ...result };
        }),
      );
      setForecastData({
        isAll: true,
        dates: allResults[0].dates,
        historical: { dates: allResults[0].historical.dates },
        results: allResults,
      });
      setMetrics(null);
      toast("Multi-column forecast generated!", "success");
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const zoomToForecast = () => {
    if (!chartRef.current || !forecastData) return;
    const chart = chartRef.current;
    const historicalLength = forecastData.historical?.dates?.length || 0;
    const totalLength = historicalLength + (forecastData.dates?.length || 0);
    chart.zoomScale("x", {
      min: Math.max(0, historicalLength - 2),
      max: totalLength - 1,
    });
  };

  const resetZoom = () => setZoomRange({ min: null, max: null });


  const TooltipIcon = ({ metric, explanation }) => (
    <div style={{ position: "relative", display: "flex", cursor: "help" }}>
      <div
        onMouseEnter={() => setHoveredMetric(metric)}
        onMouseLeave={() => setHoveredMetric(null)}
      >
        <Info size={16} style={{ color: "#4f46e5" }} />
      </div>
      {hoveredMetric === metric && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#1f2937",
            color: "#fff",
            padding: "8px 12px",
            borderRadius: "6px",
            fontSize: "12px",
            whiteSpace: "nowrap",
            zIndex: 1000,
            marginBottom: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            border: "1px solid #374151",
          }}
        >
          {explanation}
          <div
            style={{
              position: "absolute",
              bottom: "-4px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "0",
              height: "0",
              borderLeft: "4px solid transparent",
              borderRight: "4px solid transparent",
              borderTop: "4px solid #1f2937",
            }}
          />
        </div>
      )}
    </div>
  );

  const getDatasets = () => {
    if (!forecastData) return [];
    const colors = [
      "#3b82f6",
      "#10b981",
      "#f59e0b",
      "#ef4444",
      "#8b5cf6",
      "#ec4899",
      "#06b6d4",
      "#f97316",
    ];

    if (forecastData.is_grouped) {
      // determine unified historical dates across all groups
      const histDateSet = new Set();
      Object.values(forecastData.groups || {}).forEach((g) => {
        (g.dates || []).forEach((d) => histDateSet.add(d));
      });
      const histDates = Array.from(histDateSet).sort();
      const fcstDates = forecastData.dates || [];

      return Object.entries(forecastData.groups).map(([group, data], idx) => {
        // build a map of date -> historical value for this group
        const histMap = {};
        (data.dates || []).forEach((d, i) => {
          if (data.historical && data.historical[i] != null) {
            histMap[d] = data.historical[i];
          }
        });
        const histArr = histDates.map((d) =>
          histMap[d] !== undefined ? histMap[d] : null,
        );
        const fcstArr = data.forecast ? [...data.forecast] : [];
        return {
          label: group,
          data:
            chartType === "pie"
              ? [fcstArr.reduce((a, b) => a + b, 0)]
              : [...histArr, ...fcstArr],
          backgroundColor:
            chartType === "bar" ? colors[idx % colors.length] : "transparent",
          borderColor: colors[idx % colors.length],
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointRadius: 3,
          spanGaps: true,
        };
      });
    }

    if (!forecastData.isAll) {
      return [
        {
          label: "Historical",
          data: forecastData.historical?.values || [],
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 4,
        },
        {
          label: "Trend",
          data: [
            ...(forecastData.historical?.trend || []),
            ...Array((forecastData.dates || []).length).fill(null),
          ],
          borderColor: "#f59e0b",
          borderDash: [2, 2],
          fill: false,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 4,
        },
        {
          label: "Forecast",
          data: [
            ...Array((forecastData.historical?.values?.length || 1) - 1).fill(
              null,
            ),
            forecastData.historical?.values?.[
              (forecastData.historical?.values?.length || 1) - 1
            ],
            ...(forecastData.forecast || []),
          ],
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          borderDash: [5, 5],
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 4,
        },
      ];
    }

    return forecastData.results.flatMap((res, idx) => {
      const color = colors[idx % colors.length];
      return [
        {
          label: `${res.column} (Hist)`,
          data: res.historical.values,
          borderColor: color,
          fill: false,
          tension: 0.4,
          borderWidth: 1,
          pointRadius: 2,
        },
        {
          label: `${res.column} (Fcst)`,
          data: [
            ...Array(res.historical.values.length - 1).fill(null),
            res.historical.values[res.historical.values.length - 1],
            ...res.forecast,
          ],
          borderColor: color,
          borderDash: [5, 5],
          fill: false,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 4,
        },
      ];
    });
  };



  

  return (
    <div className="forecasts-container">
      <div className="forecast-header">
        <h1>Sales Revenue Forecast</h1>
        <p>Advanced machine learning predictions for your sales pipeline</p>
        {importedfilename && (
          <p className="imported-info">
            Data source: {importedfilename} ({importedfilerecord} records)
          </p>
        )}
      </div>
      <div className="forecasts-buttons">
        <label>
          Column:
          <select
            className="select-column"
            value={selectedColumn}
            onChange={(e) => setSelectedColumn(e.target.value)}
          >
            <option value="">Select column</option>
            {salesdata?.length > 0 &&
              Object.keys(salesdata[0]).map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
          </select>
        </label>
        <label>
          Horizon (months):
          <select
            className="select-column"
            value={selectedHorizon}
            onChange={(e) => setSelectedHorizon(e.target.value)}
          >
            {[1, 2, 3, 4, 6, 12, 24].map((num) => (
              <option key={num} value={num}>
                {num}
              </option>
            ))}
          </select>
        </label>
        <label>
          Model:
          <select
            className="select-column"
            value={selectmodel}
            onChange={(e) => setselectmodel(e.target.value)}
          >
            <option value="timeseries">Time Series Model</option>
          </select>
        </label>
        <label>
          Group By:
          <select
            className="select-column"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
          >
            <option value="">No Grouping</option>
            <option value="Region">Region</option>
            <option value="Product_Category">Product Category</option>
          </select>
        </label>
        {/* only line chart is supported now */}
        <label>
          Chart:
          <select
            className="select-column"
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
          >
            <option value="line">Line Chart</option>
          </select>
        </label>
        <button
          className="btn btn-generate"
          onClick={handleGenerateForecast}
          disabled={isLoading}
        >
          {isLoading ? "Generating..." : "Generate Forecast"}
        </button>
        <button
          className="btn btn-all-columns"
          onClick={handleAllColumnsForecast}
          disabled={isLoading}
        >
          Forecast Selection
        </button>
      </div>

      <Dialog
        isopen={isSelectionModalOpen}
        isclose={() => setIsSelectionModalOpen(false)}
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
            {salesdata?.length > 0 &&
              Object.keys(salesdata[0])
                .filter((key) => typeof salesdata[0][key] === "number")
                .map((col) => (
                  <label
                    key={col}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
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
              className="btn"
              onClick={() => setIsSelectionModalOpen(false)}
            >
              Cancel
            </button>
            <button
              className="btn"
              onClick={() =>
                executeMultiColumnForecast(selectedColumnsToForecast)
              }
            >
              Start
            </button>
          </div>
        </div>
      </Dialog>

      {/* show results once we have any forecastData; metrics shown separately */}
      {forecastData && (
        <div>
          {!forecastData.isAll && metrics && (
            <div className="metrics-grid">
              <div className="metric-card primary">
                <div className="metric-icon">📊</div>
                <div className="metric-content">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span className="metric-label">Target Column</span>
                    <TooltipIcon
                      metric="column"
                      explanation="The data column selected for forecasting"
                    />
                  </div>
                  <span className="metric-value">{selectedColumn}</span>
                </div>
              </div>
              <div className="metric-card success">
                <div className="metric-icon">📈</div>
                <div className="metric-content">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span className="metric-label">R² Score</span>
                    <TooltipIcon
                      metric="r2"
                      explanation="Coefficient of determination (0-100%). Higher is better."
                    />
                  </div>
                  <span className="metric-value">
                    {(metrics.r2 * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
              <div className="metric-card warning">
                <div className="metric-icon">📉</div>
                <div className="metric-content">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span className="metric-label">MAE</span>
                    <TooltipIcon
                      metric="mae"
                      explanation="Mean Absolute Error. Lower is better."
                    />
                  </div>
                  <span className="metric-value">
                    ₹{metrics.mae?.toFixed(2) || "N/A"}
                  </span>
                </div>
              </div>
              <div className="metric-card info">
                <div className="metric-icon">📊</div>
                <div className="metric-content">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span className="metric-label">RMSE</span>
                    <TooltipIcon
                      metric="rmse"
                      explanation="Root Mean Square Error. Lower is better."
                    />
                  </div>
                  <span className="metric-value">
                    ₹{metrics.rmse?.toFixed(2) || "N/A"}
                  </span>
                </div>
              </div>
              <div className="metric-card primary">
                <div className="metric-icon">🎯</div>
                <div className="metric-content">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span className="metric-label">Accuracy</span>
                    <TooltipIcon
                      metric="accuracy"
                      explanation="Model accuracy based on R² score. Higher is better."
                    />
                  </div>
                  <span className="metric-value">
                    {metrics.accuracy != null 
                      ? `${metrics.accuracy.toFixed(2)}%`
                      : metrics.r2 != null
                      ? `${(metrics.r2 * 100).toFixed(2)}%`
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="forecast-results">
            <h2>
              Forecast Chart (
              {chartType.charAt(0).toUpperCase() + chartType.slice(1)})
            </h2>

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
            </div>

            <div
              className="chart-container"
              style={{
                position: "relative",
                height: "600px",
                width: "100%",
                background: "white",
                padding: "20px",
                borderRadius: "10px",
                boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
              }}
            >
              {chartType === "line" && (
                <Line
                  ref={chartRef}
                  data={{
                    labels: forecastData.is_grouped
                      ? (() => {
                          // union all group historical dates to ensure consistent labels
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
                    plugins: {
                      legend: { position: "top" },
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
                        title: { display: true, text: "Value" },
                      },
                    },
                  }}
                />
              )}
            </div>

            <h2>Forecast Results Table</h2>
            <div className="forecast-table-container">
              {forecastData.is_grouped ? (
                (() => {
                  // build unified date list as used for chart
                  const histDateSet = new Set();
                  Object.values(forecastData.groups || {}).forEach((g) => {
                    (g.dates || []).forEach((d) => histDateSet.add(d));
                  });
                  const histDates = Array.from(histDateSet).sort();
                  const fcstDates = forecastData.dates || [];
                  const allDates = [...histDates, ...fcstDates];
                  const groupsArray = Object.entries(forecastData.groups || {});
                  return (
                    <table className="forecast-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          {groupsArray.map(([grp]) => (
                            <th key={grp}>{grp}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {allDates.map((date, idx) => (
                          <tr key={idx}>
                            <td>{date}</td>
                            {groupsArray.map(([grp, data]) => {
                              let value = null;
                              if (idx < histDates.length) {
                                const histIdx = data.dates?.indexOf(date);
                                if (histIdx >= 0 && data.historical) {
                                  value = data.historical[histIdx];
                                }
                              } else {
                                const fcstIdx = idx - histDates.length;
                                if (data.forecast && data.forecast[fcstIdx] != null) {
                                  value = data.forecast[fcstIdx];
                                }
                              }
                              return (
                                <td key={grp}>
                                  {value != null ? `$${value.toFixed(2)}` : "N/A"}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()
              ) : (
                <table className="forecast-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Forecast Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecastData?.dates?.map((date, index) => (
                      <tr key={index}>
                        <td>{date}</td>
                        <td>
                          {forecastData?.forecast?.[index] != null
                            ? `$${forecastData.forecast[index].toFixed(2)}`
                            : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


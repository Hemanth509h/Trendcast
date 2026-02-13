import React, { useEffect, useMemo } from "react";
import { toast } from "../ui/toast";
import "./forecasts.css";
import "../ui/ui.css";
import { getApiUrl } from "../utils/api";
import { Info } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);
ChartJS.register(zoomPlugin);

export default function Forecasts() {
  // ========== ALL STATE HOOKS AT TOP ==========
  // Initialize from sessionStorage or empty array
  const [salesdata, setsalesdata] = React.useState(() => {
    const stored = sessionStorage.getItem("salesdata");
    return stored ? JSON.parse(stored) : [];
  });
  const [importedfilename, setimportedfilename] = React.useState(() => sessionStorage.getItem("sales_filename") || null);
  const [importedfilerecord, setimportedfilerecord] = React.useState(() => Number(sessionStorage.getItem("sales_recordcount")) || 0);
  const [selectedColumn, setSelectedColumn] = React.useState("");
  const [selectedHorizon, setSelectedHorizon] = React.useState("12");
  const [selectmodel, setselectmodel] = React.useState("timeseries");
  const [forecastData, setForecastData] = React.useState(null);
  const [metrics, setMetrics] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [hoveredMetric, setHoveredMetric] = React.useState(null);
  const [zoomRange, setZoomRange] = React.useState({ min: null, max: null });
  const [isAllColumnsMode, setIsAllColumnsMode] = React.useState(false);

  // ========== ALL REF HOOKS ==========
  const chartRef = React.useRef(null);

  // ========== ALL EFFECT HOOKS ==========
  useEffect(() => {
    // Only fetch if sessionStorage is empty
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

  // ========== MEMOIZED VALUES ==========
  const xScaleConfig = useMemo(() => {
    const config = {
      title: {
        display: true,
        text: "Date",
        font: {
          size: 14,
          weight: "bold",
        },
      },
      ticks: {
        font: {
          size: 11,
        },
        maxRotation: 45,
        minRotation: 0,
      },
      grid: {
        color: "rgba(200, 200, 200, 0.1)",
      },
    };

    // Only add min/max if they have actual numeric values (not null)
    if (zoomRange.min !== null && typeof zoomRange.min === "number") {
      config.min = zoomRange.min;
    }
    if (zoomRange.max !== null && typeof zoomRange.max === "number") {
      config.max = zoomRange.max;
    }

    return config;
  }, [zoomRange.min, zoomRange.max]);

  // ========== FUNCTION DEFINITIONS ==========
  const fetchdata = async () => {
    try {
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
    } catch (error) {
      toast(error.message, "error");
    }
  };

  const handleGenerateForecast = async () => {
    if (!selectedColumn) {
      toast("Please select a column to forecast.", "warning");
      return;
    }

    if (!selectedHorizon) {
      toast("Please select forecast horizon.", "warning");
      return;
    }

    if (!selectmodel) {
      toast("Please select a model.", "warning");
      return;
    }

    setIsLoading(true);
    setIsAllColumnsMode(false);
    try {
      const response = await fetch(getApiUrl("/api/generateforecast"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          column: selectedColumn,
          horizon: parseInt(selectedHorizon),
          model: selectmodel,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to generate forecast");
      }

      setForecastData(result);
      setMetrics(result.metrics);
      toast("Forecast generated successfully!", "success");
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAllColumnsForecast = async () => {
    if (!salesdata || salesdata.length === 0) {
      toast("No data available to forecast.", "warning");
      return;
    }

    const numericColumns = Object.keys(salesdata[0]).filter(key => {
      const val = salesdata[0][key];
      return typeof val === 'number' || (!isNaN(parseFloat(val)) && isFinite(val));
    });

    if (numericColumns.length === 0) {
      toast("No numeric columns found for forecasting.", "error");
      return;
    }

    setIsLoading(true);
    setIsAllColumnsMode(true);
    try {
      const allResults = await Promise.all(numericColumns.map(async (col) => {
        const response = await fetch(getApiUrl("/api/generateforecast"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            column: col,
            horizon: parseInt(selectedHorizon),
            model: selectmodel,
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `Failed for ${col}`);
        return { column: col, ...result };
      }));

      // Merge results for "All Columns" view
      const mergedDates = allResults[0].dates;
      const mergedHistoricalDates = allResults[0].historical.dates;
      
      setForecastData({
        isAll: true,
        dates: mergedDates,
        historical: { dates: mergedHistoricalDates },
        results: allResults
      });
      setMetrics(null); // Metrics don't make sense for combined view
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
    const forecastLength = forecastData.dates?.length || 0;
    const totalLength = historicalLength + forecastLength;

    const minIndex = Math.max(0, historicalLength - 2);
    const maxIndex = totalLength - 1;

    chart.zoomScale("x", {
      min: minIndex,
      max: maxIndex,
    });
  };

  const resetZoom = () => {
    setZoomRange({ min: null, max: null });
  };

  // ========== COMPONENT DEFINITIONS ==========
  const TooltipIcon = ({ metric, explanation }) => {
    return (
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
  };

  const numberlist = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30,
    32, 34, 36, 38, 40, 42, 44, 46, 48, 50,
  ];

  const getDatasets = () => {
    if (!forecastData) return [];
    
    if (!forecastData.isAll) {
      return [
        {
          label: "Historical Data",
          data: forecastData.historical?.values || [],
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          fill: true,
          tension: 0.4,
          borderWidth: 2,
        },
        {
          label: "Trend",
          data: [
            ...(forecastData.historical?.trend || []),
            ...Array((forecastData.dates || []).length).fill(null),
          ],
          borderColor: "#f59e0b",
          backgroundColor: "transparent",
          borderDash: [2, 2],
          fill: false,
          tension: 0.4,
          borderWidth: 2,
        },
        {
          label: "Forecast",
          data: [
            ...Array(
              (forecastData.historical?.values?.length || 1) - 1,
            ).fill(null),
            forecastData.historical?.values?.[
              forecastData.historical.values.length - 1
            ],
            ...(forecastData.forecast || []),
          ],
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          borderDash: [5, 5],
          fill: true,
          tension: 0.4,
          borderWidth: 2,
        },
      ];
    }

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    return forecastData.results.flatMap((res, idx) => {
      const color = colors[idx % colors.length];
      return [
        {
          label: `${res.column} (Hist)`,
          data: res.historical.values,
          borderColor: color,
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.4,
          borderWidth: 1,
          pointRadius: 0,
        },
        {
          label: `${res.column} (Fcst)`,
          data: [
            ...Array(res.historical.values.length - 1).fill(null),
            res.historical.values[res.historical.values.length - 1],
            ...res.forecast
          ],
          borderColor: color,
          borderDash: [5, 5],
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.4,
          borderWidth: 2,
        }
      ];
    });
  };

  // ========== RENDER ==========

  return (
    <div className="forecasts-container">
      <div className="forecast-header">
        <h1>Sales Revenue Forecast</h1>
        <p>Advanced machine learning predictions for your sales pipeline</p>
        {importedfilename && (
          <p className="imported-info" style={{ fontSize: '0.9rem', color: '#666', marginTop: '5px' }}>
            Data source: {importedfilename} ({importedfilerecord} records)
          </p>
        )}
      </div>
      <div className="forecasts-buttons">
        <label>
          Select Column for Forecasting:
          <select
            className="select-column"
            value={selectedColumn}
            onChange={(e) => setSelectedColumn(e.target.value)}
          >
            <option value="">Select column</option>

            {salesdata && salesdata.length > 0 ? (
              Object.keys(salesdata[0]).map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))
            ) : (
              <option value="">No data available</option>
            )}
          </select>
        </label>

        <label>
          Select Forecast Horizon (months):
          <select
            className="select-column"
            value={selectedHorizon}
            onChange={(e) => setSelectedHorizon(e.target.value)}
          >
            <option value="">Select horizon</option>
            {numberlist.map((num) => (
              <option key={num} value={num}>
                {num}
              </option>
            ))}
          </select>
        </label>

        <label>
          Select Model:
          <select
            className="select-column"
            value={selectmodel}
            onChange={(e) => setselectmodel(e.target.value)}
          >
            <option value="">Select model</option>
            <option value="timeseries">
              Time Series Model (Historical Analysis)
            </option>
          </select>
        </label>

        <button
          className="btn btn-generate"
          onClick={handleGenerateForecast}
          disabled={isLoading}
        >
          {isLoading && !isAllColumnsMode ? "Generating..." : "Generate Forecast"}
        </button>

        <button
          className="btn btn-all-columns"
          onClick={handleAllColumnsForecast}
          disabled={isLoading}
          style={{
            padding: "10px 20px",
            backgroundColor: "#8b5cf6",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "600",
            transition: "all 0.3s ease",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          {isLoading && isAllColumnsMode ? "Generating All..." : "Forecast All Columns"}
        </button>
      </div>

      {((metrics && forecastData) || (forecastData && forecastData.isAll)) && (
        <div>
          {!forecastData.isAll && metrics && (
            <div className="metrics-grid">
              <div className="metric-card primary">
                <div className="metric-icon">📊</div>
                <div className="metric-content">
                  <div
                    style={{ display: "flex", alignItems: "center", gap: "6px" }}
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
                    style={{ display: "flex", alignItems: "center", gap: "6px" }}
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
                    style={{ display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    <span className="metric-label">MAE</span>
                    <TooltipIcon
                      metric="mae"
                      explanation="Mean Absolute Error. Lower is better."
                    />
                  </div>
                  <span className="metric-value">
                    ${metrics.mae?.toFixed(2) || "N/A"}
                  </span>
                </div>
              </div>
              <div className="metric-card info">
                <div className="metric-icon">📊</div>
                <div className="metric-content">
                  <div
                    style={{ display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    <span className="metric-label">RMSE</span>
                    <TooltipIcon
                      metric="rmse"
                      explanation="Root Mean Square Error. Lower is better."
                    />
                  </div>
                  <span className="metric-value">
                    ${metrics.rmse?.toFixed(2) || "N/A"}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="forecast-results">
            <h2>Forecast Chart</h2>

            <div style={{ marginBottom: "15px", display: "flex", gap: "10px" }}>
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
            </div>

            <div
              className="chart-container"
              style={{
                height: "600px",
                marginBottom: "40px",
                background: "white",
                padding: "20px",
                borderRadius: "10px",
                boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
              }}
            >
              <Line
                ref={chartRef}
                data={{
                  labels: [
                    ...(forecastData.historical?.dates || []),
                    ...(forecastData.dates || []),
                  ],
                  datasets: getDatasets(),
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: {
                    mode: "index",
                    intersect: false,
                  },
                  scales: {
                    y: {
                      min: 0,
                      beginAtZero: false,
                      grace: "10%",
                      title: {
                        display: true,
                        text: selectedColumn,
                        font: {
                          size: 14,
                          weight: "bold",
                        },
                      },
                      ticks: {
                        callback: function (value) {
                          return "$" + value.toLocaleString();
                        },
                        font: {
                          size: 12,
                        },
                        padding: 10,
                      },
                      grid: {
                        color: "rgba(200, 200, 200, 0.1)",
                        drawBorder: true,
                      },
                    },
                    x: xScaleConfig,
                  },
                  plugins: {
                    legend: {
                      display: true,
                      position: "top",
                    },
                    zoom: {
                      zoom: {
                        wheel: {
                          enabled: true,
                          speed: 0.1,
                        },
                        pinch: {
                          enabled: true,
                        },
                        mode: "x",
                        onZoomStart() {},
                        onZoom({ chart }) {
                          chart.scales.y.options.grace = "10%";
                        },
                        onZoomComplete({ chart }) {},
                      },
                      pan: {
                        enabled: true,
                        mode: "x",
                        onPan({ chart }) {},
                      },
                      limits: {
                        x: { min: "original", max: "original" },
                        y: { min: "original", max: "original" },
                      },
                    },
                  },
                }}
              />
            </div>

            <h2>Forecast Results Table</h2>
            <div className="forecast-table-container">
              <table className="forecast-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Forecast Value</th>
                    <th>Lower Bound (95% CI)</th>
                    <th>Upper Bound (95% CI)</th>
                  </tr>
                </thead>
                <tbody>
                  {forecastData?.dates?.map((date, index) => (
                    <tr key={index}>
                      <td>{date}</td>
                      <td>
                        ${forecastData?.forecast?.[index]?.toFixed(2) || "N/A"}
                      </td>
                      <td>
                        $
                        {forecastData?.confidence_bounds?.lower?.[
                          index
                        ]?.toFixed(2) || "N/A"}
                      </td>
                      <td>
                        $
                        {forecastData?.confidence_bounds?.upper?.[
                          index
                        ]?.toFixed(2) || "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!metrics && (
        <div className="metrics-grid">
          <div className="metric-card primary">
            <div className="metric-icon">📊</div>
            <div className="metric-content">
              <span className="metric-label">Target Column</span>
              <span className="metric-value">{selectedColumn || "—"}</span>
            </div>
          </div>
          <div className="metric-card success">
            <div className="metric-icon">🎯</div>
            <div className="metric-content">
              <span className="metric-label">Model Accuracy</span>
              <span className="metric-value">—%</span>
            </div>
          </div>
          <div className="metric-card warning">
            <div className="metric-icon">📈</div>
            <div className="metric-content">
              <span className="metric-label">Forecast Average</span>
              <span className="metric-value">—</span>
            </div>
          </div>
          <div className="metric-card info">
            <div className="metric-icon">📉</div>
            <div className="metric-content">
              <span className="metric-label">Historical Average</span>
              <span className="metric-value">—</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

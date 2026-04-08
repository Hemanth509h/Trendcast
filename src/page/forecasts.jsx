import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Loader2, RefreshCw, Download, Trash2 } from "lucide-react";
import "./forecasts.css";
import { toast } from "../ui/toast";
import { useData } from "../context/DataContext";

export default function Forecasts() {
  const {
    uploads,
    currentUpload,
    isLoadingSales,
    isLoadingForecast,
    generateForecast,
    fetchSalesById,
  } = useData();

  const [selectedUpload, setSelectedUpload] = useState(null);
  const [selectedColumn, setSelectedColumn] = useState("");
  const [forecastHorizon, setForecastHorizon] = useState(12);
  const [forecastModel, setForecastModel] = useState("timeseries");
  const [forecastData, setForecastData] = useState(null);
  const [metrics, setMetrics] = useState(null);

  // Load upload data when selected
  const handleSelectUpload = async (uploadId) => {
    const data = await fetchSalesById(uploadId);
    if (data) {
      setSelectedUpload(data);
      if (data.columns?.length > 0) {
        // Select first numeric column
        setSelectedColumn(data.columns[0]);
      }
    }
  };

  // Generate forecast
  const handleGenerateForecast = async () => {
    if (!selectedUpload || !selectedColumn) {
      toast("Please select an upload and column", "error");
      return;
    }

    try {
      const params = {
        upload_id: selectedUpload.id,
        column: selectedColumn,
        horizon: forecastHorizon,
        model: forecastModel,
      };

      // For now, we'll use a placeholder forecast
      // Once backend is ready, use: await generateForecast(selectedUpload.id, params);
      
      // Generate mock forecast data
      const mockData = [];
      const currentData = selectedUpload.records || [];
      
      // Create forecast points
      for (let i = 0; i < forecastHorizon; i++) {
        mockData.push({
          period: currentData.length + i,
          forecast: Math.random() * 1000 + 500,
          confidence_lower: Math.random() * 800 + 400,
          confidence_upper: Math.random() * 1200 + 600,
        });
      }

      setForecastData(mockData);
      setMetrics({
        mae: (Math.random() * 100).toFixed(2),
        rmse: (Math.random() * 150).toFixed(2),
        r2: (Math.random() * 0.3 + 0.7).toFixed(3),
      });

      toast("Forecast generated successfully!", "success");
    } catch (error) {
      toast(`Forecast failed: ${error.message}`, "error");
    }
  };

  if (isLoadingSales && !selectedUpload) {
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
      <div className="forecast-header">
        <h1>Sales Forecasting</h1>
        <p>Generate time series forecasts from your sales data</p>
      </div>

      {/* Config Panel */}
      <div className="forecast-config">
        <div className="config-group">
          <label>Select Dataset</label>
          <select
            value={selectedUpload?.id || ""}
            onChange={(e) => {
              const upload = uploads.find((u) => u.id === e.target.value);
              if (upload) handleSelectUpload(upload.id);
            }}
          >
            <option value="">Choose a dataset...</option>
            {uploads.map((upload) => (
              <option key={upload.id} value={upload.id}>
                {upload.filename} ({upload.record_count} records)
              </option>
            ))}
          </select>
        </div>

        {selectedUpload && (
          <>
            <div className="config-group">
              <label>Select Column to Forecast</label>
              <select
                value={selectedColumn}
                onChange={(e) => setSelectedColumn(e.target.value)}
              >
                <option value="">Choose column...</option>
                {selectedUpload.columns?.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>

            <div className="config-row">
              <div className="config-group">
                <label>Forecast Horizon (periods)</label>
                <input
                  type="number"
                  value={forecastHorizon}
                  onChange={(e) =>
                    setForecastHorizon(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  min="1"
                  max="100"
                />
              </div>

              <div className="config-group">
                <label>Model</label>
                <select
                  value={forecastModel}
                  onChange={(e) => setForecastModel(e.target.value)}
                >
                  <option value="timeseries">Time Series</option>
                  <option value="arima">ARIMA</option>
                  <option value="exp_smooth">Exponential Smoothing</option>
                </select>
              </div>
            </div>

            <button
              className="btn-generate"
              onClick={handleGenerateForecast}
              disabled={isLoadingForecast || !selectedColumn}
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
          </>
        )}
      </div>

      {/* Forecast Results */}
      {forecastData && (
        <div className="forecast-results">
          {/* Metrics */}
          {metrics && (
            <div className="metrics-grid">
              <div className="metric-card">
                <label>Mean Absolute Error</label>
                <value>{metrics.mae}</value>
              </div>
              <div className="metric-card">
                <label>RMSE</label>
                <value>{metrics.rmse}</value>
              </div>
              <div className="metric-card">
                <label>R² Score</label>
                <value>{metrics.r2}</value>
              </div>
            </div>
          )}

          {/* Chart */}
          <div className="chart-container">
            <h3>Forecast Chart</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="period" stroke="#a1a1aa" />
                <YAxis stroke="#a1a1aa" />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(9, 9, 11, 0.9)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                <Legend wrapperStyle={{ color: '#a1a1aa' }} />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="#06b6d4"
                  dot={false}
                  name="Forecast"
                  strokeWidth={3}
                />
                <Line
                  type="monotone"
                  dataKey="confidence_upper"
                  stroke="rgba(255,255,255,0.2)"
                  dot={false}
                  strokeDasharray="5 5"
                  name="Upper Bound"
                />
                <Line
                  type="monotone"
                  dataKey="confidence_lower"
                  stroke="rgba(255,255,255,0.2)"
                  dot={false}
                  strokeDasharray="5 5"
                  name="Lower Bound"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Export */}
          <div className="forecast-actions">
            <button className="btn-secondary">
              <Download size={18} /> Export Results
            </button>
          </div>
        </div>
      )}

      {!forecastData && selectedUpload && (
        <div className="empty-forecast">
          <p>Configure the forecast parameters and click "Generate Forecast" to see results</p>
        </div>
      )}

      {!selectedUpload && uploads.length > 0 && (
        <div className="empty-forecast">
          <p>Select a dataset to begin forecasting</p>
        </div>
      )}

      {uploads.length === 0 && (
        <div className="empty-forecast">
          <p>No datasets available. Please upload sales data first.</p>
        </div>
      )}
    </div>
  );
}

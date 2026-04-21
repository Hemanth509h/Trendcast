import React, { useContext, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { DataContext } from "./Contexts";

export const DataProvider = ({ children }) => {
  const [uploads, setUploads] = useState(() => {
    try {
      const saved = sessionStorage.getItem("trendcast_uploads");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to load uploads from session storage", e);
    }
    return [];
  });
  
  // Sync uploads array to sessionStorage
  React.useEffect(() => {
    try {
      sessionStorage.setItem("trendcast_uploads", JSON.stringify(uploads));
    } catch (e) {
      console.warn("Uploads array too large for session storage", e);
    }
  }, [uploads]);
  const [currentUpload, setCurrentUpload] = useState(() => {
    try {
      const saved = sessionStorage.getItem("trendcast_current_upload");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to load dataset from session storage", e);
    }
    return null;
  });
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [salesError, setSalesError] = useState(null);

  // Sync currentUpload to sessionStorage
  React.useEffect(() => {
    try {
      if (currentUpload) {
        sessionStorage.setItem("trendcast_current_upload", JSON.stringify(currentUpload));
      } else {
        sessionStorage.removeItem("trendcast_current_upload");
      }
    } catch (e) {
      console.warn("Dataset too large for session storage or error saving", e);
    }
  }, [currentUpload]);

  // Forecast State
  const [forecasts, setForecasts] = useState([]);
  const [currentForecast, setCurrentForecast] = useState(() => {
    try {
      const saved = sessionStorage.getItem("trendcast_current_forecast");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to load forecast from session storage", e);
    }
    return null;
  });
  const [isLoadingForecast, setIsLoadingForecast] = useState(false);
  const [forecastError, setForecastError] = useState(null);

  // UI Selection State (to persist across pages)
  const [forecastUIState, setForecastUIState] = useState(() => {
    try {
      const saved = sessionStorage.getItem("trendcast_forecast_ui");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to load UI state from session storage", e);
    }
    return {
      selectedUploadId: "",
      selectedColumn: "",
      horizon: 12,
      model: "timeseries",
      groupBy: ""
    };
  });

  const { getToken } = useAuth();

  // ==================== SALES OPERATIONS ====================

  const fetchAllSales = useCallback(async (force = false) => {
    if (!force && uploads.length > 0) return uploads;
    
    setIsLoadingSales(true);
    setSalesError(null);
    
    try {
      const token = getToken();
      const response = await fetch("/api/sales", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch sales");
      const data = await response.json();
      setUploads(data.uploads || []);
      return data.uploads;
    } catch (error) {
      setSalesError(error.message);
      return [];
    } finally {
      setIsLoadingSales(false);
    }
  }, [getToken, uploads.length]);

  const fetchSalesById = useCallback(async (uploadId, options = {}) => {
    const { updateState = true } = options;
    
    setIsLoadingSales(true);
    
    try {
        // ALWAYS use cached uploads array first!
        const existing = uploads.find(u => u.id === uploadId || u._id === uploadId);
        if (existing && existing.records) {
            if (updateState) setCurrentUpload(existing);
            return existing;
        }
        
        // Session storage fallback
        const saved = sessionStorage.getItem("trendcast_current_upload");
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.id === uploadId || parsed._id === uploadId) {
                if (updateState) setCurrentUpload(parsed);
                return parsed;
            }
        }
    } catch (e) {
        console.warn("Error reading cache natively", e);
    } finally {
        setIsLoadingSales(false);
    }
    
    toast("Dataset not available locally! Unable to fetch per constraints.", "error");
    return null;
  }, [uploads]);

  const uploadSalesFile = useCallback(async (file) => {
    setIsLoadingSales(true);
    setSalesError(null);
    
    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = getToken();
      const response = await fetch("/api/sales/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Upload failed");
      }

      const data = await response.json();
      // Instantly inject the newly uploaded dataset into local storage directly!
      setUploads(prev => [...prev, data]);
      return data;
    } catch (error) {
      setSalesError(error.message);
      throw error;
    } finally {
      setIsLoadingSales(false);
    }
  }, [getToken]);

  const deleteSales = useCallback(async (uploadId) => {
    setIsLoadingSales(true);
    setSalesError(null);
    
    try {
      const token = getToken();
      const response = await fetch(`/api/sales/${uploadId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to delete sales");
      
      if (currentUpload?.id === uploadId || currentUpload?._id === uploadId) {
        setCurrentUpload(null);
      }
      // Mutate local state instantly to skip slow API updates
      setUploads(prev => prev.filter(u => u.id !== uploadId && u._id !== uploadId));
      return true;
    } catch (error) {
      setSalesError(error.message);
      return false;
    } finally {
      setIsLoadingSales(false);
    }
  }, [getToken, currentUpload, fetchAllSales]);

  const addRecordToSales = useCallback(async (uploadId, record) => {
    setIsLoadingSales(true);
    setSalesError(null);
    
    try {
      const token = getToken();
      const response = await fetch(`/api/sales/${uploadId}/records`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ data: record }),
      });

      if (!response.ok) throw new Error("Failed to add record");
      
      // Instant local state mutation without fetching
      setUploads(prev => prev.map(u => {
        if (u.id === uploadId || u._id === uploadId) {
            const updated = { ...u, records: [...(u.records || []), record], record_count: (u.record_count || 0) + 1 };
            setCurrentUpload(prevUpload => prevUpload ? updated : null);
            return updated;
        }
        return u;
      }));
      return true;
    } catch (error) {
      setSalesError(error.message);
      return false;
    } finally {
      setIsLoadingSales(false);
    }
  }, [getToken, fetchSalesById]);

  const deleteRecordFromSales = useCallback(async (uploadId, recordIndex) => {
    setIsLoadingSales(true);
    setSalesError(null);
    
    try {
      const token = getToken();
      const response = await fetch(`/api/sales/${uploadId}/records/${recordIndex}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to delete record");
      
      // Instant local state mutation without fetching
      setUploads(prev => prev.map(u => {
        if (u.id === uploadId || u._id === uploadId) {
            const newRecords = [...(u.records || [])];
            newRecords.splice(recordIndex, 1);
            const updated = { ...u, records: newRecords, record_count: newRecords.length };
            setCurrentUpload(prevUpload => prevUpload ? updated : null);
            return updated;
        }
        return u;
      }));
      return true;
    } catch (error) {
      setSalesError(error.message);
      return false;
    } finally {
      setIsLoadingSales(false);
    }
  }, [getToken, fetchSalesById]);

  const exportSales = useCallback(async (uploadId) => {
    try {
      const token = getToken();
      const response = await fetch(`/api/sales/${uploadId}/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sales_${uploadId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return true;
    } catch (error) {
      setSalesError(error.message);
      return false;
    }
  }, [getToken]);

  // ==================== FORECAST OPERATIONS ====================

  // Sync currentForecast and UI state to sessionStorage
  React.useEffect(() => {
    try {
      if (currentForecast) {
        sessionStorage.setItem("trendcast_current_forecast", JSON.stringify(currentForecast));
      } else {
        sessionStorage.removeItem("trendcast_current_forecast");
      }
    } catch (e) {
      console.warn("Forecast data too large for session storage", e);
    }
  }, [currentForecast]);

  React.useEffect(() => {
    try {
      sessionStorage.setItem("trendcast_forecast_ui", JSON.stringify(forecastUIState));
    } catch (e) {
      console.warn("Failed to save UI state", e);
    }
  }, [forecastUIState]);

  const generateForecast = useCallback(async (uploadId, params) => {
    setIsLoadingForecast(true);
    setForecastError(null);
    
    try {
      const token = getToken();
      const response = await fetch("/api/forecasts/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          upload_id: uploadId,
          ...params,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Forecast generation failed");
      }

      const data = await response.json();
      setCurrentForecast(data);
      // Update UI state with used params
      setForecastUIState(prev => ({
        ...prev,
        selectedUploadId: uploadId,
        selectedColumn: params.column,
        horizon: params.horizon,
        model: params.model,
        groupBy: params.group_by || ""
      }));
      return data;
    } catch (error) {
      setForecastError(error.message);
      throw error;
    } finally {
      setIsLoadingForecast(false);
    }
  }, [getToken]);

  const fetchForecasts = useCallback(async () => {
    setIsLoadingForecast(true);
    setForecastError(null);
    
    try {
      const token = getToken();
      const response = await fetch("/api/forecasts", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch forecasts");
      const data = await response.json();
      setForecasts(data.forecasts || []);
      return data.forecasts;
    } catch (error) {
      setForecastError(error.message);
      return [];
    } finally {
      setIsLoadingForecast(false);
    }
  }, [getToken]);

  const deleteForecast = useCallback(async (forecastId) => {
    setIsLoadingForecast(true);
    setForecastError(null);
    
    try {
      const token = getToken();
      const response = await fetch(`/api/forecasts/${forecastId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to delete forecast");
      
      if (currentForecast?.id === forecastId) {
        setCurrentForecast(null);
      }
      await fetchForecasts();
      return true;
    } catch (error) {
      setForecastError(error.message);
      return false;
    } finally {
      setIsLoadingForecast(false);
    }
  }, [getToken, currentForecast, fetchForecasts]);

  // ==================== CLEAR ERRORS ====================

  const clearSalesError = () => setSalesError(null);
  const clearForecastError = () => setForecastError(null);
  
  const clearCurrentUpload = useCallback(() => {
    setCurrentUpload(null);
  }, []);

  const value = React.useMemo(() => ({
    // Sales
    uploads,
    currentUpload,
    isLoadingSales,
    salesError,
    fetchAllSales,
    fetchSalesById,
    uploadSalesFile,
    deleteSales,
    addRecordToSales,
    deleteRecordFromSales,
    exportSales,
    clearSalesError,
    clearCurrentUpload,

    // Forecasts
    forecasts,
    currentForecast,
    isLoadingForecast,
    forecastError,
    generateForecast,
    fetchForecasts,
    deleteForecast,
    clearForecastError,
    forecastUIState,
    setForecastUIState,
  }), [
    uploads,
    currentUpload,
    isLoadingSales,
    salesError,
    fetchAllSales,
    fetchSalesById,
    uploadSalesFile,
    deleteSales,
    addRecordToSales,
    deleteRecordFromSales,
    exportSales,
    clearCurrentUpload,
    forecasts,
    currentForecast,
    isLoadingForecast,
    forecastError,
    generateForecast,
    fetchForecasts,
    deleteForecast,
    forecastUIState
  ]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within DataProvider");
  }
  return context;
};

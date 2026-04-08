import React, { createContext, useContext, useState, useCallback } from "react";
import { useAuth } from "../page/AuthModal";

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  // Sales Data State
  const [uploads, setUploads] = useState([]);
  const [currentUpload, setCurrentUpload] = useState(null);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [salesError, setSalesError] = useState(null);

  // Forecast State
  const [forecasts, setForecasts] = useState([]);
  const [currentForecast, setCurrentForecast] = useState(null);
  const [isLoadingForecast, setIsLoadingForecast] = useState(false);
  const [forecastError, setForecastError] = useState(null);

  const { getToken } = useAuth();

  // ==================== SALES OPERATIONS ====================

  const fetchAllSales = useCallback(async () => {
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
  }, [getToken]);

  const fetchSalesById = useCallback(async (uploadId) => {
    setIsLoadingSales(true);
    setSalesError(null);
    
    try {
      const token = getToken();
      const response = await fetch(`/api/sales/${uploadId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch sales data");
      const data = await response.json();
      setCurrentUpload(data);
      return data;
    } catch (error) {
      setSalesError(error.message);
      return null;
    } finally {
      setIsLoadingSales(false);
    }
  }, [getToken]);

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
      // Refresh the sales list
      await fetchAllSales();
      return data;
    } catch (error) {
      setSalesError(error.message);
      throw error;
    } finally {
      setIsLoadingSales(false);
    }
  }, [getToken, fetchAllSales]);

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
      
      if (currentUpload?.id === uploadId) {
        setCurrentUpload(null);
      }
      await fetchAllSales();
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
      
      // Refresh current upload
      await fetchSalesById(uploadId);
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
      
      // Refresh current upload
      await fetchSalesById(uploadId);
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

  const value = {
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

    // Forecasts
    forecasts,
    currentForecast,
    isLoadingForecast,
    forecastError,
    generateForecast,
    fetchForecasts,
    deleteForecast,
    clearForecastError,
  };

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

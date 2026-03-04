// API base URL configuration
// Leave empty when using the Vite proxy or running on same origin.
// This prevents CORS issues during development by keeping requests relative.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export const getApiUrl = (endpoint) => {
  // if the base URL is blank, just return the endpoint itself
  return API_BASE_URL ? `${API_BASE_URL}${endpoint}` : endpoint;
};

// API helper with auth token
export const apiCall = async (endpoint, options = {}) => {
  try {
    const token = localStorage.getItem("authToken");

    const headers = {
      ...options.headers,
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    const response = await fetch(getApiUrl(endpoint), {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Unauthorized - clear token
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        // Only redirect if not on root to avoid loops
        if (window.location.pathname !== "/") {
          window.location.href = "/";
        }
      }
      const errorData = await response.json();
      throw new Error(errorData.detail || `API Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API call failed:", error);
    throw error;
  }
};

export default API_BASE_URL;

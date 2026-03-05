const API_BASE_URL = 'https://trendcast.onrender.com';

export const getApiUrl = (endpoint) => {
  return `${API_BASE_URL}${endpoint}`;
};

export default API_BASE_URL;

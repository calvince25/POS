import axios from 'axios';

// For production, we strictly use relative path /api to ensure it matches the Vercel domain.
// In development, we fallback to VITE_API_URL or '/api'.
const isProd = import.meta.env.PROD;
const api = axios.create({
  baseURL: isProd ? '/api' : (import.meta.env.VITE_API_URL || '/api'),
});

// Request interceptor to add JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle logout or refresh logic
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

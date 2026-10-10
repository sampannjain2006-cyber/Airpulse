import axios from 'axios';

// During development, Vite proxies /api to the Express backend.
// In production, this can be an absolute URL if the backend is on a different domain.
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// We can add interceptors here later for global error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log API errors globally if needed
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

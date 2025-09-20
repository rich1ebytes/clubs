// src/services/api.js
import axios from "axios";

// Create axios instance with default configuration
// For development, use relative URLs to work with Vite proxy
// For production, use the full base URL
const api = axios.create({
  baseURL: import.meta.env.PROD ? import.meta.env.VITE_API_BASE_URL : "",
  timeout: 10000, // 10 seconds timeout
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("userToken") || localStorage.getItem("adminToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common error scenarios
    if (error.response?.status === 401) {
      // Unauthorized - clear tokens and redirect to appropriate login
      const adminToken = localStorage.getItem("adminToken");
      const adminRole = localStorage.getItem("adminRole");
      const isAdmin = adminToken && adminRole === "admin";

      localStorage.removeItem("userToken");
      localStorage.removeItem("adminToken");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("adminRole");
      localStorage.removeItem("userRole");
      localStorage.removeItem("isAdmin");

      // Redirect to appropriate login page
      if (isAdmin) {
        window.location.href = "/admin";
      } else {
        window.location.href = "/for-clubs";
      }
    }

    if (error.response?.status === 403) {
      console.error("Access forbidden");
    }

    if (error.response?.status >= 500) {
      console.error("Server error:", error.response?.data?.message);
    }

    return Promise.reject(error);
  }
);

// API service functions
export const apiService = {
  // Generic HTTP methods
  get: (url, config = {}) => api.get(url, config),
  post: (url, data = {}, config = {}) => api.post(url, data, config),
  put: (url, data = {}, config = {}) => api.put(url, data, config),
  delete: (url, config = {}) => api.delete(url, config),
  patch: (url, data = {}, config = {}) => api.patch(url, data, config),

  // File upload method
  upload: (url, formData, config = {}) =>
    api.post(url, formData, {
      ...config,
      headers: {
        ...config.headers,
        "Content-Type": "multipart/form-data",
      },
    }),

  // Auth endpoints
  auth: {
    login: (credentials) => api.post("/api/auth/login", credentials),
    adminLogin: (credentials) => api.post("/api/admin/login", credentials),
    register: (userData) => api.post("/api/auth/register", userData),
  },

  // Events endpoints
  events: {
    getAll: () => api.get("/api/events/"),
    getById: (id) => api.get(`/api/events/${id}`),
    create: (eventData) => api.post("/api/club-members/events", eventData),
    update: (id, eventData) =>
      api.put(`/api/club-members/events/${id}`, eventData),
    delete: (id) => api.delete(`/api/club-members/events/${id}`),
    getMyEvents: () => api.get("/api/club-members/events/my"),
  },

  // Openings endpoints
  openings: {
    getAll: () => api.get("/api/openings/"),
    getById: (id) => api.get(`/api/openings/${id}`),
    create: (openingData) =>
      api.post("/api/club-members/openings", openingData),
    update: (id, openingData) =>
      api.put(`/api/club-members/openings/${id}`, openingData),
    delete: (id) => api.delete(`/api/club-members/openings/${id}`),
    getMyOpenings: () => api.get("/api/club-members/openings/my"),
  },

  // Clubs endpoints
  clubs: {
    getAll: () => api.get("/api/clubs/"),
    getById: (id) => api.get(`/api/clubs/${id}`),
  },

  // Admin endpoints
  admin: {
    getClubAccounts: () => api.get("/api/admin/club-accounts"),
    createClubAccount: (accountData) =>
      api.post("/api/admin/club-accounts", accountData),
    updateClubAccount: (id, accountData) =>
      api.put(`/api/admin/club-accounts/${id}`, accountData),
    deleteClubAccount: (id) => api.delete(`/api/admin/club-accounts/${id}`),
  },

  // Utility methods
  utils: {
    // Handle file upload with progress
    uploadWithProgress: (url, formData, onProgress) =>
      api.post(url, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        },
      }),

    // Batch requests
    batchRequests: (requests) => Promise.all(requests),

    // Retry mechanism
    retry: async (requestFn, maxRetries = 3, delay = 1000) => {
      let lastError;
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await requestFn();
        } catch (error) {
          lastError = error;
          if (i < maxRetries - 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, delay * Math.pow(2, i))
            );
          }
        }
      }
      throw lastError;
    },
  },
};

export default api;

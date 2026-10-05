import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://127.0.0.1:5000" : "");
if (!API_BASE_URL) throw new Error("VITE_API_URL is required for production builds.");

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

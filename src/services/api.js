// src/services/api.js
import axios from 'axios';

// Base URL is read from env (VITE_API_BASE_URL). In mock mode we still create an instance for consistency.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  // In a real app you would attach auth token here.
});

export default api;

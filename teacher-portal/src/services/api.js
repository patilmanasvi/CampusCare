// src/services/api.js
// Shared axios client for the real backend. Only service files import this;
// components never call axios directly.
import axios from 'axios';
import { API_BASE_URL } from '../config/env';
import { tokenStorage } from '../utils/tokenStorage';
import { normalizeError } from '../utils/errors';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // allows cookie-based sessions if Member 2 uses them
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let unauthorizedHandler = null;
/** AuthContext registers a callback so an expired session logs the teacher out. */
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalized = normalizeError(error);
    const isLoginCall = String(error?.config?.url || '').includes('/auth/login');
    if (normalized.status === 401 && unauthorizedHandler && !isLoginCall) {
      unauthorizedHandler();
    }
    return Promise.reject(normalized);
  }
);

export default api;

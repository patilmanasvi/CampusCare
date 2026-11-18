// src/services/authService.js
import api from './api';
import { ENDPOINTS } from './endpoints';
import { USE_MOCK_API } from '../config/env';
import { mockAuthService } from '../mock/authService';

// Expected login response: { teacher: {...}, token?: string }
// (token only if Member 2 uses bearer tokens instead of httpOnly cookies)
const realAuthService = {
  async login({ email, password }) {
    const { data } = await api.post(ENDPOINTS.auth.login, { email, password });
    return data;
  },
  async logout() {
    await api.post(ENDPOINTS.auth.logout);
  },
  async getCurrentUser() {
    const { data } = await api.get(ENDPOINTS.auth.me);
    return data?.teacher ?? data;
  },
};

export const authService = USE_MOCK_API ? mockAuthService : realAuthService;

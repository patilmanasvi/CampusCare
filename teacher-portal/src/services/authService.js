// src/services/authService.js
import api from './api';
import { ENDPOINTS } from './endpoints';
import { USE_MOCK_API } from '../config/env';
import { mockAuthService } from '../mock/authService';
import { backendUrl } from '../utils/backendUrl';

const normalizeUser = (user) => user?.avatarUrl ? { ...user, avatarUrl: backendUrl(user.avatarUrl) } : user;

// Expected login response: { teacher: {...}, token?: string }
// (token only if Member 2 uses bearer tokens instead of httpOnly cookies)
const realAuthService = {
  async login({ email, password }) {
    const { data } = await api.post(ENDPOINTS.auth.login, { email, password });
    return { ...data, teacher: normalizeUser(data?.teacher ?? data?.user) };
  },
  async logout() {
    await api.post(ENDPOINTS.auth.logout);
  },
  async getCurrentUser() {
    const { data } = await api.get(ENDPOINTS.auth.me);
    return normalizeUser(data?.teacher ?? data?.user ?? data);
  },
};

export const authService = USE_MOCK_API ? mockAuthService : realAuthService;

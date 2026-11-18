// src/services/dashboardService.js
import api from './api';
import { ENDPOINTS } from './endpoints';
import { USE_MOCK_API } from '../config/env';
import { mockDashboardService } from '../mock/dashboardService';

// Expected summary: { total, open, inProgress, awaitingVerification, resolved }
const realDashboardService = {
  async getSummary() {
    const { data } = await api.get(ENDPOINTS.dashboard.summary);
    return data;
  },
  async getRecentRequests({ limit = 5 } = {}) {
    const { data } = await api.get(ENDPOINTS.dashboard.recentRequests, { params: { limit } });
    return data?.items ?? data;
  },
};

export const dashboardService = USE_MOCK_API ? mockDashboardService : realDashboardService;

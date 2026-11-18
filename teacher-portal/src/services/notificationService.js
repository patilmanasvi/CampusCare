// src/services/notificationService.js
// The backend sends emails. The portal only shows in-app notifications.
import api from './api';
import { ENDPOINTS } from './endpoints';
import { USE_MOCK_API } from '../config/env';
import { mockNotificationService } from '../mock/notificationService';

const realNotificationService = {
  /** params: { unreadOnly, page, pageSize } -> { items, total, unreadCount } */
  async list(params = {}) {
    const { data } = await api.get(ENDPOINTS.notifications.list, { params });
    return data;
  },
  async getUnreadCount() {
    const { data } = await api.get(ENDPOINTS.notifications.unreadCount);
    return typeof data === 'number' ? data : data?.count ?? 0;
  },
  async markRead(id) {
    await api.post(ENDPOINTS.notifications.markRead(id));
  },
  async markAllRead() {
    await api.post(ENDPOINTS.notifications.markAllRead);
  },
};

export const notificationService = USE_MOCK_API ? mockNotificationService : realNotificationService;

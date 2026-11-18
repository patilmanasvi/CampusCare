// src/mock/notificationService.js
// Mock in-app notifications. Email delivery is the backend's job.
import { delay, getDb, saveDb, currentTeacher, clone } from './db';

const mine = (teacherId) => getDb().notifications.filter((n) => n.teacherId === teacherId);
const toDto = ({ teacherId, ...rest }) => clone(rest);

export const mockNotificationService = {
  async list({ unreadOnly = false, page = 1, pageSize = 20 } = {}) {
    await delay();
    const me = currentTeacher();
    const all = mine(me.id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const rows = unreadOnly ? all.filter((n) => !n.read) : all;
    const start = (Math.max(1, page) - 1) * pageSize;
    return {
      items: rows.slice(start, start + pageSize).map(toDto),
      total: rows.length,
      unreadCount: all.filter((n) => !n.read).length,
    };
  },

  async getUnreadCount() {
    await delay(150);
    const me = currentTeacher();
    return mine(me.id).filter((n) => !n.read).length;
  },

  async markRead(id) {
    await delay(150);
    const me = currentTeacher();
    const n = mine(me.id).find((x) => x.id === id);
    if (n) n.read = true;
    saveDb();
  },

  async markAllRead() {
    await delay(250);
    const me = currentTeacher();
    mine(me.id).forEach((n) => {
      n.read = true;
    });
    saveDb();
  },
};

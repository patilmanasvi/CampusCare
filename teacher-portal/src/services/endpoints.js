// src/services/endpoints.js
// ---------------------------------------------------------------------------
// PROVISIONAL endpoint paths. These are placeholders so the real-API code is
// ready; they are NOT the agreed contract. Confirm every path, payload and
// response shape with Member 2 (backend) and update only this file.
// ---------------------------------------------------------------------------
const enc = encodeURIComponent;

export const ENDPOINTS = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    me: '/auth/me',
  },
  dashboard: {
    summary: '/teacher/dashboard/summary',
    recentRequests: '/teacher/dashboard/recent-requests',
  },
  pcs: {
    lookupByQrToken: (token) => `/pcs/lookup/${enc(token)}`,
    blocks: '/locations/blocks',
    rooms: (blockId) => `/locations/blocks/${enc(blockId)}/rooms`,
    pcsInRoom: (roomId) => `/locations/rooms/${enc(roomId)}/pcs`,
    detail: (pcId) => `/pcs/${enc(pcId)}`,
    activeTickets: (pcId) => `/pcs/${enc(pcId)}/active-tickets`,
  },
  categories: '/issue-categories',
  tickets: {
    list: '/teacher/tickets',
    create: '/teacher/tickets',
    duplicateCheck: '/teacher/tickets/duplicate-check',
    detail: (id) => `/teacher/tickets/${enc(id)}`,
    addInformation: (id) => `/teacher/tickets/${enc(id)}/information`,
    comments: (id) => `/teacher/tickets/${enc(id)}/comments`,
    verification: (id) => `/teacher/tickets/${enc(id)}/verification`,
  },
  uploads: {
    config: '/uploads/config',
    upload: '/uploads',
  },
  notifications: {
    list: '/teacher/notifications',
    unreadCount: '/teacher/notifications/unread-count',
    markRead: (id) => `/teacher/notifications/${enc(id)}/read`,
    markAllRead: '/teacher/notifications/read-all',
  },
  profile: {
    get: '/teacher/profile',
    update: '/teacher/profile',
    avatar: '/teacher/profile/avatar',
  },
};

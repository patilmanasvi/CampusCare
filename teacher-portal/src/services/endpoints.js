// src/services/endpoints.js
// ---------------------------------------------------------------------------
// Paths match the Express routes and teacher compatibility aliases in backend/src/routes.
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

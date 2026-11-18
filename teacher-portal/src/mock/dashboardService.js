// src/mock/dashboardService.js
// Mock dashboard API — counts are calculated from the mock tickets.
// In real mode the backend returns these numbers.
import { delay, getDb, currentTeacher } from './db';
import { canSeeTicket, ticketListItemDto } from './ticketService';

const GROUPS = {
  open: ['SUBMITTED', 'ACKNOWLEDGED', 'WAITING_FOR_INFO', 'REOPENED'],
  inProgress: ['IN_PROGRESS'],
  awaitingVerification: ['FIXED', 'AWAITING_VERIFICATION'],
  resolved: ['CLOSED'],
};

export const mockDashboardService = {
  async getSummary() {
    await delay();
    const me = currentTeacher();
    const mine = getDb().tickets.filter((t) => canSeeTicket(t, me.id));
    const count = (statuses) => mine.filter((t) => statuses.includes(t.status)).length;
    return {
      total: mine.length,
      open: count(GROUPS.open),
      inProgress: count(GROUPS.inProgress),
      awaitingVerification: count(GROUPS.awaitingVerification),
      resolved: count(GROUPS.resolved),
    };
  },

  async getRecentRequests({ limit = 5 } = {}) {
    await delay();
    const me = currentTeacher();
    return getDb()
      .tickets.filter((t) => canSeeTicket(t, me.id))
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
      .slice(0, limit)
      .map((t) => ticketListItemDto(t, me.id));
  },
};

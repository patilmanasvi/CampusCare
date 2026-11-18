// src/mock/dashboardService.js
/**
 * Mock dashboard service – returns summary counts and recent tickets.
 * Replace with real API calls when backend is ready.
 */
export const mockDashboardService = {
  async getSummary() {
    // static numbers for now – can be randomised later
    return {
      total: 42,
      open: 5,
      inProgress: 8,
      awaitingVerification: 3,
      resolved: 26,
    };
  },

  async getRecentTickets() {
    return [
      {
        id: 'TCK-001',
        pcCode: '522/A/12',
        description: 'Monitor flickering',
        date: '2024-09-15',
        status: 'Open',
        urgency: 'High',
      },
      {
        id: 'TCK-002',
        pcCode: '523/B/07',
        description: 'Keyboard not responding',
        date: '2024-09-14',
        status: 'In Progress',
        urgency: 'Medium',
      },
      {
        id: 'TCK-003',
        pcCode: '525/C/03',
        description: 'No internet connectivity',
        date: '2024-09-13',
        status: 'Awaiting Verification',
        urgency: 'Critical',
      },
    ];
  },
};

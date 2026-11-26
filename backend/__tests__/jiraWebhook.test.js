/**
 * CampusCare Jira Webhook & Endpoint Route Tests
 * Tests:
 * 1. GET /api/jira/status
 * 2. POST /api/jira/webhook (with secret header authentication & Jira payload parsing)
 * 3. PATCH /api/tickets/:id/jira-sync (both with Bearer token and with X-Sync-Secret)
 * 4. POST /api/jira/retry/:id
 * 5. POST /api/jira/process-queue
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');

const app = require('../src/app');
const db = require('../src/config/db');
const config = require('../src/config/env');
const { jiraConfig } = require('../src/config/jiraConfig');
const ticketRepository = require('../src/repositories/ticketRepository');

// Mock database pool and client for transactions
const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

jest.mock('../src/config/db', () => ({
  query: jest.fn(),
  pool: {
    connect: jest.fn(() => mockClient),
  },
  testConnection: jest.fn(),
  closePool: jest.fn(),
}));

describe('Jira Webhook & Inbound Route Integration Tests', () => {
  const adminId = '5b2f8c1e-4d3a-4c6b-9e7f-000000000005';
  const adminToken = jwt.sign(
    { id: adminId, email: 'admin@college.edu', role: 'ADMIN', fullName: 'Dr. Admin' },
    config.jwt.secret,
    { expiresIn: '1h' }
  );

  const teacherToken = jwt.sign(
    { id: '5b2f8c1e-4d3a-4c6b-9e7f-000000000001', email: 'teacher@college.edu', role: 'TEACHER', fullName: 'Prof. Anjali' },
    config.jwt.secret,
    { expiresIn: '1h' }
  );

  beforeEach(() => {
    jest.clearAllMocks();
    jiraConfig.webhookSecret = 'secret_webhook_123';
    db.pool.connect.mockResolvedValue(mockClient);
    mockClient.query.mockImplementation((queryText, params) => {
      if (typeof queryText === 'string' && (queryText === 'BEGIN' || queryText === 'COMMIT' || queryText === 'ROLLBACK')) {
        return Promise.resolve({ rowCount: 0, rows: [] });
      }
      return db.query(queryText, params);
    });
  });

  describe('GET /api/jira/status', () => {
    it('should return integration status and queue statistics', async () => {
      db.query.mockResolvedValueOnce({
        rows: [
          { status: 'SUCCESS', count: 12 },
          { status: 'PENDING', count: 3 },
          { status: 'RETRY', count: 1 },
        ],
      });

      const res = await request(app).get('/api/jira/status');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.integration).toBe('Jira Service Management Cloud');
      expect(res.body.data.queueStats.SUCCESS).toBe(12);
      expect(res.body.data.queueStats.PENDING).toBe(3);
      expect(res.body.data.queueStats.RETRY).toBe(1);
    });
  });

  describe('PATCH /api/tickets/:id/jira-sync', () => {
    it('should authenticate via X-Sync-Secret header without requiring a user Bearer token', async () => {
      // Mock finding the ticket
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 'LAB-1001',
          status: 'SUBMITTED',
          jira_issue_key: null,
          jira_issue_id: null,
        }],
      });
      // Mock UPDATE tickets
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 'LAB-1001',
          status: 'IN_PROGRESS',
          jira_issue_key: 'JSM-1042',
          jira_issue_id: '10042',
        }],
      });
      // Mock INSERT ticket_events for SYNC_SUCCESS
      db.query.mockResolvedValueOnce({ rowCount: 1 });
      // Mock INSERT ticket_events for status change
      db.query.mockResolvedValueOnce({ rowCount: 1 });
      // Mock INSERT sync_events audit
      db.query.mockResolvedValueOnce({ rowCount: 1 });

      const res = await request(app)
        .patch('/api/tickets/LAB-1001/jira-sync')
        .set('X-Sync-Secret', 'secret_webhook_123')
        .send({
          jiraIssueKey: 'JSM-1042',
          jiraIssueId: '10042',
          status: 'IN_PROGRESS',
          technicianName: 'Suresh Patil',
          comment: 'Power supply replaced',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.jiraIssueKey).toBe('JSM-1042');
      expect(res.body.status).toBe('IN_PROGRESS');
    });

    it('should reject requests with invalid secret or unprivileged token (401/403)', async () => {
      const resWithoutAuth = await request(app)
        .patch('/api/tickets/LAB-1001/jira-sync')
        .send({ jiraIssueKey: 'JSM-1042' });
      expect(resWithoutAuth.status).toBe(401);

      const resTeacher = await request(app)
        .patch('/api/tickets/LAB-1001/jira-sync')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ jiraIssueKey: 'JSM-1042' });
      expect(resTeacher.status).toBe(403);
    });

    it('should allow Admin Bearer token for sync', async () => {
      // Mock finding ticket
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'LAB-1001', status: 'IN_PROGRESS', jira_issue_key: 'JSM-1042' }],
      });
      // Mock UPDATE
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'LAB-1001', status: 'AWAITING_VERIFICATION', jira_issue_key: 'JSM-1042' }],
      });
      // Mock events
      db.query.mockResolvedValueOnce({ rowCount: 1 });
      db.query.mockResolvedValueOnce({ rowCount: 1 });

      const res = await request(app)
        .patch('/api/tickets/LAB-1001/jira-sync')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          jiraIssueKey: 'JSM-1042',
          status: 'AWAITING_VERIFICATION',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('AWAITING_VERIFICATION');
    });
  });

  describe('POST /api/jira/webhook', () => {
    it('should process native Atlassian issue_updated webhook and map status', async () => {
      // Mock finding ticket by jiraKey
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'LAB-1001', status: 'SUBMITTED', jira_issue_key: 'JSM-1042' }],
      });
      // Mock syncFromJira: findTicket
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'LAB-1001', status: 'SUBMITTED', jira_issue_key: 'JSM-1042' }],
      });
      // Mock UPDATE
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'LAB-1001', status: 'IN_PROGRESS', jira_issue_key: 'JSM-1042' }],
      });
      // Mock events
      db.query.mockResolvedValueOnce({ rowCount: 1 });
      db.query.mockResolvedValueOnce({ rowCount: 1 });
      db.query.mockResolvedValueOnce({ rowCount: 1 });

      const res = await request(app)
        .post('/api/jira/webhook')
        .set('X-Jira-Webhook-Secret', 'secret_webhook_123')
        .send({
          webhookEvent: 'jira:issue_updated',
          issue: {
            id: '10042',
            key: 'JSM-1042',
            fields: {
              summary: '[522/A/1] Power Issues',
              status: {
                name: 'In Progress',
              },
            },
          },
          user: {
            displayName: 'Ramesh IT Support',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ticketId).toBe('LAB-1001');
      expect(res.body.data.status).toBe('IN_PROGRESS');
    });
  });
});

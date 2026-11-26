/**
 * CampusCare Jira Integration Unit & Functional Tests
 * Tests:
 * 1. Jira configuration validation and auth header generation
 * 2. Jira field and status mapping (urgency, status transitions, ADF format)
 * 3. Jira REST client (issue creation, comments, transitions, error handling)
 * 4. Jira Sync Service outbound worker (queue polling, payload enrichment, idempotency, retries)
 * 5. Inbound Webhook handling (signature/secret validation, status synchronization)
 */
const { jiraConfig, isJiraConfigured, getJiraAuthHeader } = require('../src/config/jiraConfig');
const {
  urgencyToJiraPriority,
  jiraPriorityToUrgency,
  normalizeJiraStatus,
  formatDescriptionToADF,
  buildJiraIssuePayload,
} = require('../src/services/jiraMapping');
const { JiraClient } = require('../src/services/jiraClient');
const { JiraSyncService } = require('../src/services/jiraSyncService');
const db = require('../src/config/db');

// Mock db
jest.mock('../src/config/db', () => ({
  query: jest.fn(),
  pool: {
    connect: jest.fn(),
  },
}));

describe('Jira Service Management Integration Tests (Member 3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Configuration & Auth Header', () => {
    it('should correctly format basic auth header from credentials', () => {
      process.env.JIRA_USER_EMAIL = 'admin@college.edu';
      process.env.JIRA_API_TOKEN = 'test_token_123';
      jiraConfig.userEmail = 'admin@college.edu';
      jiraConfig.apiToken = 'test_token_123';

      const header = getJiraAuthHeader();
      expect(header).toBe(`Basic ${Buffer.from('admin@college.edu:test_token_123').toString('base64')}`);
    });

    it('should identify when Jira credentials are placeholders or missing', () => {
      jiraConfig.baseUrl = 'https://your-domain.atlassian.net';
      jiraConfig.apiToken = 'your_jira_api_token';
      expect(isJiraConfigured()).toBe(false);

      jiraConfig.baseUrl = 'https://campuscare.atlassian.net';
      jiraConfig.userEmail = 'support@campuscare.edu';
      jiraConfig.apiToken = 'actual_secure_token';
      expect(isJiraConfigured()).toBe(true);
    });
  });

  describe('2. Mapping Rules & ADF Formatting', () => {
    it('should map CampusCare urgency to Jira priorities correctly', () => {
      expect(urgencyToJiraPriority['LOW']).toBe('Low');
      expect(urgencyToJiraPriority['MEDIUM']).toBe('Medium');
      expect(urgencyToJiraPriority['HIGH']).toBe('High');
      expect(urgencyToJiraPriority['CRITICAL']).toBe('Highest');
    });

    it('should normalize Jira statuses to CampusCare statuses', () => {
      expect(normalizeJiraStatus('Waiting for support')).toBe('SUBMITTED');
      expect(normalizeJiraStatus('Open')).toBe('SUBMITTED');
      expect(normalizeJiraStatus('Assigned')).toBe('ACKNOWLEDGED');
      expect(normalizeJiraStatus('In Progress')).toBe('IN_PROGRESS');
      expect(normalizeJiraStatus('Pending Customer')).toBe('WAITING_FOR_INFO');
      expect(normalizeJiraStatus('Resolved')).toBe('AWAITING_VERIFICATION');
      expect(normalizeJiraStatus('Work Complete')).toBe('AWAITING_VERIFICATION');
      expect(normalizeJiraStatus('Closed')).toBe('CLOSED');
      expect(normalizeJiraStatus('Reopened')).toBe('REOPENED');
    });

    it('should construct valid Atlassian Document Format (ADF) description', () => {
      const adf = formatDescriptionToADF({
        ticketId: 'LAB-1001',
        description: 'System powers off abruptly.',
        remarks: 'Happened during batch A',
        category: 'Hardware',
        urgency: 'HIGH',
        pc: {
          displayCode: '522/A/1',
          assetId: 'ENG-LAB-01',
          labName: 'Advanced Computing Lab',
          roomNumber: '522',
        },
        reporter: {
          fullName: 'Prof. Anjali',
          email: 'teacher@college.edu',
        },
      });

      expect(adf.type).toBe('doc');
      expect(adf.version).toBe(1);
      expect(Array.isArray(adf.content)).toBe(true);
      expect(adf.content.length).toBeGreaterThan(0);
      const textNodes = adf.content.map((p) => p.content[0].text);
      expect(textNodes).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Ticket ID: LAB-1001'),
          expect.stringContaining('System powers off abruptly.'),
          expect.stringContaining('PC Display Code: 522/A/1'),
        ])
      );
    });

    it('should build complete Jira issue creation payload', () => {
      const payload = buildJiraIssuePayload({
        projectKey: 'JSM',
        ticketId: 'LAB-1001',
        pcDisplayCode: '522/A/1',
        categoryName: 'Power Issues',
        urgency: 'HIGH',
        description: 'No power to display',
        reporterName: 'Prof. Deshmukh',
        reporterEmail: 'prof@college.edu',
        labName: 'Lab 522',
        roomNumber: '522',
      });

      expect(payload.fields.project.key).toBe('JSM');
      expect(payload.fields.summary).toBe('[522/A/1] Power Issues');
      expect(payload.fields.priority.name).toBe('High');
      expect(payload.fields.labels).toContain('CampusCare');
      expect(payload.fields.labels).toContain('Lab-522');
    });
  });

  describe('3. Jira REST Client', () => {
    let mockClient;

    beforeEach(() => {
      mockClient = new JiraClient({
        baseUrl: 'https://test.atlassian.net',
        userEmail: 'test@college.edu',
        apiToken: 'valid_token',
        projectKey: 'JSM',
      });
    });

    it('should successfully create ticket via Jira REST API v3', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 201,
        text: async () => JSON.stringify({ key: 'JSM-1042', id: '10042', self: 'https://test.atlassian.net/rest/api/3/issue/10042' }),
      });

      const result = await mockClient.createTicket({
        ticketId: 'LAB-1001',
        description: 'Smoke test',
        urgency: 'MEDIUM',
      });

      expect(result.key).toBe('JSM-1042');
      expect(result.id).toBe('10042');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.atlassian.net/rest/api/3/issue',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: expect.stringMatching(/^Basic /),
          }),
        })
      );
    });

    it('should handle Jira API errors and identify retryable status codes', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: async () => JSON.stringify({ errorMessages: ['Rate limit exceeded'] }),
      });

      await expect(mockClient.createTicket({ ticketId: 'LAB-1001' })).rejects.toMatchObject({
        statusCode: 429,
        isRetryable: true,
      });
    });

    it('should test connection status when configured', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ accountId: 'acc_123', emailAddress: 'test@college.edu', displayName: 'Admin' }),
      });

      const status = await mockClient.testConnection();
      expect(status.connected).toBe(true);
      expect(status.user.displayName).toBe('Admin');
    });
  });

  describe('4. Jira Sync Service (Outbound Worker & Idempotency)', () => {
    let mockClient;
    let syncService;

    beforeEach(() => {
      mockClient = {
        createTicket: jest.fn().mockResolvedValue({ key: 'JSM-5555', id: '55555' }),
        addComment: jest.fn().mockResolvedValue({ id: 'comm_1' }),
        transitionIssue: jest.fn().mockResolvedValue({}),
      };
      syncService = new JiraSyncService(mockClient);
    });

    it('should prevent duplicate Jira issue creation if ticket already has jira_issue_key', async () => {
      // Return ticket that already has jira_issue_key
      db.query.mockResolvedValueOnce({
        rows: [{ id: 'LAB-1001', jira_issue_key: 'JSM-1042', jira_issue_id: '10042', status: 'SUBMITTED' }],
      });
      // Second query: UPDATE sync_events SET status = 'SUCCESS'
      db.query.mockResolvedValueOnce({ rowCount: 1 });

      const outcome = await syncService.processOutboundEvent({
        id: 'event-uuid-1',
        ticket_id: 'LAB-1001',
        event_type: 'TICKET_CREATED',
        payload: { ticketId: 'LAB-1001' },
        retry_count: 0,
      });

      expect(outcome.success).toBe(true);
      expect(outcome.skipped).toBe(true);
      expect(outcome.jiraIssueKey).toBe('JSM-1042');
      // Jira client must NOT have been called
      expect(mockClient.createTicket).not.toHaveBeenCalled();
    });

    it('should create issue in Jira, update ticket with Jira key, and mark event SUCCESS', async () => {
      // 1. Check ticket
      db.query.mockResolvedValueOnce({
        rows: [{ id: 'LAB-1001', jira_issue_key: null, jira_issue_id: null, status: 'SUBMITTED' }],
      });
      // 2. enrichTicketPayload query
      db.query.mockResolvedValueOnce({
        rows: [{
          ticketId: 'LAB-1001',
          urgency: 'HIGH',
          description: 'Broken RAM',
          category: 'Hardware',
          pcDisplayCode: '522/A/2',
          roomNumber: '522',
        }],
      });
      // 3. UPDATE tickets SET jira_issue_key
      db.query.mockResolvedValueOnce({ rowCount: 1 });
      // 4. UPDATE sync_events SET status = 'SUCCESS'
      db.query.mockResolvedValueOnce({ rowCount: 1 });
      // 5. INSERT INTO ticket_events
      db.query.mockResolvedValueOnce({ rowCount: 1 });

      const outcome = await syncService.processOutboundEvent({
        id: 'event-uuid-2',
        ticket_id: 'LAB-1001',
        event_type: 'TICKET_CREATED',
        payload: { ticketId: 'LAB-1001' },
        retry_count: 0,
      });

      expect(outcome.success).toBe(true);
      expect(outcome.jiraIssueKey).toBe('JSM-5555');
      expect(mockClient.createTicket).toHaveBeenCalled();
    });

    it('should increment retry_count and set status=RETRY when Jira creation fails with retryable error', async () => {
      // 1. Check ticket
      db.query.mockResolvedValueOnce({
        rows: [{ id: 'LAB-1001', jira_issue_key: null, jira_issue_id: null, status: 'SUBMITTED' }],
      });
      // 2. enrichTicketPayload
      db.query.mockResolvedValueOnce({ rows: [] });

      const retryableError = new Error('Gateway Timeout');
      retryableError.isRetryable = true;
      mockClient.createTicket.mockRejectedValueOnce(retryableError);

      // 3. UPDATE sync_events SET status = 'RETRY'
      db.query.mockResolvedValueOnce({ rowCount: 1 });

      const outcome = await syncService.processOutboundEvent({
        id: 'event-uuid-3',
        ticket_id: 'LAB-1001',
        event_type: 'TICKET_CREATED',
        payload: { ticketId: 'LAB-1001' },
        retry_count: 1,
      });

      expect(outcome.success).toBe(false);
      expect(outcome.status).toBe('RETRY');
      expect(outcome.retryCount).toBe(2);
    });

    it('should poll active tickets and synchronize inbound status from Jira', async () => {
      // Mock active tickets query
      db.query.mockResolvedValueOnce({
        rows: [{ id: 'LAB-10', status: 'SUBMITTED', jira_issue_key: 'CAM-6', jira_issue_id: '10005' }],
      });

      // Mock client.getIssue
      mockClient.getIssue = jest.fn().mockResolvedValue({
        id: '10005',
        key: 'CAM-6',
        fields: {
          status: { name: 'In Progress' },
          assignee: { displayName: 'Nishita Shinde' },
        },
      });

      // Mock ticketRepository.syncFromJira
      const ticketRepository = require('../src/repositories/ticketRepository');
      jest.spyOn(ticketRepository, 'syncFromJira').mockResolvedValueOnce({
        id: 'LAB-10',
        status: 'IN_PROGRESS',
        jira_issue_key: 'CAM-6',
      });

      const outcome = await syncService.syncInboundStatus(10);
      expect(outcome.checked).toBe(1);
      expect(outcome.updated).toBe(1);
      expect(ticketRepository.syncFromJira).toHaveBeenCalledWith('LAB-10', {
        jiraIssueKey: 'CAM-6',
        jiraIssueId: '10005',
        status: 'IN_PROGRESS',
        technicianName: 'Nishita Shinde',
      });
    });
  });
});

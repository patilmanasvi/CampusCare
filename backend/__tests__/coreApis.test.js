/**
 * CampusCare Core APIs Integration Tests (Phase 3)
 * Tests PC Inventory, QR Lookup, Ticket Creation, Idempotency, Timeline, Comments, and Verification
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');

const app = require('../src/app');
const db = require('../src/config/db');
const config = require('../src/config/env');

// Mock database pool and client for transactions
const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

jest.mock('../src/config/db', () => ({
  query: jest.fn(),
  pool: {
    connect: jest.fn(),
  },
  testConnection: jest.fn(),
  closePool: jest.fn(),
}));

describe('CampusCare Phase 3 - Core APIs Integration Tests', () => {
  const teacherId = '5b2f8c1e-4d3a-4c6b-9e7f-000000000001';
  const otherTeacherId = '5b2f8c1e-4d3a-4c6b-9e7f-000000000002';
  const adminId = '5b2f8c1e-4d3a-4c6b-9e7f-000000000005';
  const pcId = '5b2f8c1e-4d3a-4c6b-9e7f-000000000101';

  const teacherToken = jwt.sign(
    { id: teacherId, email: 'teacher@college.edu', role: 'TEACHER' },
    config.jwt.secret,
    { expiresIn: '1h' }
  );

  const otherTeacherToken = jwt.sign(
    { id: otherTeacherId, email: 'other.teacher@college.edu', role: 'TEACHER' },
    config.jwt.secret,
    { expiresIn: '1h' }
  );

  const adminToken = jwt.sign(
    { id: adminId, email: 'admin@college.edu', role: 'ADMIN' },
    config.jwt.secret,
    { expiresIn: '1h' }
  );

  const mockUserRow = {
    id: teacherId,
    email: 'teacher@college.edu',
    full_name: 'Prof. Anjali Deshmukh',
    role_id: 1,
    role: 'TEACHER',
    account_status: 'ACTIVE',
  };

  const mockOtherTeacherRow = {
    id: otherTeacherId,
    email: 'other.teacher@college.edu',
    full_name: 'Prof. Rahul Mehta',
    role_id: 1,
    role: 'TEACHER',
    account_status: 'ACTIVE',
  };

  const mockAdminRow = {
    id: adminId,
    email: 'admin@college.edu',
    full_name: 'Dr. Arvind Sharma',
    role_id: 3,
    role: 'ADMIN',
    account_status: 'ACTIVE',
  };

  const mockPcRow = {
    id: pcId,
    lab_id: 'room-522',
    pc_number: 1,
    asset_id: 'ENG-522-PC-01',
    display_code: '522/A/1',
    qr_token: 'qr-campuscare-522-01',
    status: 'WORKING',
    notice: null,
    can_report: true,
    is_active: true,
    lab_name: 'Computer Lab 1',
    room_number: '522',
    block_id: 'blk-a',
    block_name: 'Block A',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockTicketRow = {
    id: 'LAB-1001',
    ticket_number: 1001,
    status: 'SUBMITTED',
    urgency: 'HIGH',
    description: 'PC monitor displays no signal',
    remarks: 'Checked HDMI cable',
    reporter_id: teacherId,
    reporter_name: 'Prof. Anjali Deshmukh',
    reporter_email: 'teacher@college.edu',
    category_id: 'cat-display',
    category_name: 'Display / Monitor',
    category_code: 'DISPLAY',
    subcategory_id: 'sub-no-display',
    subcategory_name: 'No display',
    pc_id: pcId,
    display_code: '522/A/1',
    pc_number: 1,
    pc_status: 'WORKING',
    lab_id: 'room-522',
    lab_name: 'Computer Lab 1',
    room_number: '522',
    block_id: 'blk-a',
    block_name: 'Block A',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    db.pool.connect.mockResolvedValue(mockClient);

    // Default mock user lookup for authenticate middleware
    db.query.mockImplementation((text, params) => {
      if (typeof text === 'string' && text.includes('FROM users u')) {
        const uid = params[0];
        if (uid === teacherId) return Promise.resolve({ rowCount: 1, rows: [mockUserRow] });
        if (uid === otherTeacherId) return Promise.resolve({ rowCount: 1, rows: [mockOtherTeacherRow] });
        if (uid === adminId) return Promise.resolve({ rowCount: 1, rows: [mockAdminRow] });
      }
      return Promise.resolve({ rowCount: 0, rows: [] });
    });
  });

  // ============================================================================
  // TASK A: PC AND LOCATION APIS
  // ============================================================================
  describe('TASK A: PC and Location APIs', () => {
    it('GET /api/blocks should return list of blocks', async () => {
      db.query.mockImplementation((text, params) => {
        if (text.includes('FROM users u')) return Promise.resolve({ rowCount: 1, rows: [mockUserRow] });
        if (text.includes('FROM blocks')) {
          return Promise.resolve({
            rowCount: 2,
            rows: [
              { id: 'blk-a', name: 'Block A', description: 'Engineering Wing' },
              { id: 'blk-b', name: 'Block B', description: 'Science Wing' },
            ],
          });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      const res = await request(app)
        .get('/api/blocks')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.items).toHaveLength(2);
      expect(res.body.items[0].name).toBe('Block A');
    });

    it('GET /api/labs should return labs with block details', async () => {
      db.query.mockImplementation((text) => {
        if (text.includes('FROM users u')) return Promise.resolve({ rowCount: 1, rows: [mockUserRow] });
        if (text.includes('FROM labs l')) {
          return Promise.resolve({
            rowCount: 1,
            rows: [
              {
                id: 'room-522',
                block_id: 'blk-a',
                lab_name: 'Computer Lab 1',
                room_number: '522',
                code: 'A',
                pc_count: 20,
                block_name: 'Block A',
              },
            ],
          });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      const res = await request(app)
        .get('/api/labs')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.items[0].lab).toBe('Computer Lab 1');
      expect(res.body.items[0].room).toBe('522');
    });

    it('GET /api/pcs should return PCs with lab and block details', async () => {
      db.query.mockImplementation((text) => {
        if (text.includes('FROM users u')) return Promise.resolve({ rowCount: 1, rows: [mockUserRow] });
        if (text.includes('FROM pcs p')) {
          return Promise.resolve({ rowCount: 1, rows: [mockPcRow] });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      const res = await request(app)
        .get('/api/pcs')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.items[0].displayCode).toBe('522/A/1');
      expect(res.body.items[0].qr_token).toBeUndefined(); // Security check: qr_token never leaked
    });

    it('GET /api/pcs/:id should return single PC details', async () => {
      db.query.mockImplementation((text, params) => {
        if (text.includes('FROM users u')) return Promise.resolve({ rowCount: 1, rows: [mockUserRow] });
        if (text.includes('WHERE p.id = $1')) {
          return Promise.resolve({ rowCount: 1, rows: [mockPcRow] });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      const res = await request(app)
        .get(`/api/pcs/${pcId}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.pc.id).toBe(pcId);
      expect(res.body.pc.block).toBe('Block A');
      expect(res.body.pc.lab).toBe('Computer Lab 1');
    });

    it('GET /api/pcs/:id should return 400 for invalid UUID parameter', async () => {
      const res = await request(app)
        .get('/api/pcs/not-a-valid-uuid')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('GET /api/pcs/qr/:token should find PC using QR token and not expose token', async () => {
      db.query.mockImplementation((text, params) => {
        if (text.includes('FROM users u')) return Promise.resolve({ rowCount: 1, rows: [mockUserRow] });
        if (text.includes('WHERE p.qr_token = $1')) {
          if (params[0] === 'qr-campuscare-522-01') {
            return Promise.resolve({ rowCount: 1, rows: [mockPcRow] });
          }
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      const res = await request(app)
        .get('/api/pcs/qr/qr-campuscare-522-01')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.pc.displayCode).toBe('522/A/1');
      expect(res.body.pc.qrToken).toBeUndefined();
      expect(res.body.pc.qr_token).toBeUndefined();
    });

    it('GET /api/pcs/:id/active-tickets should mask details of other teachers tickets', async () => {
      const otherTeacherTicket = {
        ...mockTicketRow,
        reporter_id: otherTeacherId,
        description: 'Private faculty exam paper software issue',
      };

      db.query.mockImplementation((text, params) => {
        if (text.includes('FROM users u')) return Promise.resolve({ rowCount: 1, rows: [mockUserRow] });
        if (text.includes('WHERE p.id = $1')) {
          return Promise.resolve({ rowCount: 1, rows: [mockPcRow] });
        }
        if (text.includes('WHERE t.pc_id = $1')) {
          return Promise.resolve({ rowCount: 1, rows: [otherTeacherTicket] });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      const res = await request(app)
        .get(`/api/pcs/${pcId}/active-tickets`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.items).toHaveLength(1);
      const ticket = res.body.items[0];
      expect(ticket.isOwn).toBe(false);
      expect(ticket.canView).toBe(false);
      expect(ticket.description).toBeUndefined(); // Masked for privacy
    });
  });

  // ============================================================================
  // TASK B & C: TICKET CREATION, DUPLICATE CHECK & IDEMPOTENCY
  // ============================================================================
  describe('TASK B & C: Ticket Creation & Duplicate Checks', () => {
    it('GET /api/tickets/check-duplicate should identify open tickets on PC', async () => {
      db.query.mockImplementation((text, params) => {
        if (text.includes('FROM users u')) return Promise.resolve({ rowCount: 1, rows: [mockUserRow] });
        if (text.includes('WHERE p.id = $1 AND p.is_active = true')) {
          return Promise.resolve({ rowCount: 1, rows: [mockPcRow] });
        }
        if (text.includes('WHERE t.pc_id = $1')) {
          return Promise.resolve({ rowCount: 1, rows: [mockTicketRow] });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      const res = await request(app)
        .get(`/api/tickets/check-duplicate?pcId=${pcId}&categoryId=cat-display`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.matches).toHaveLength(1);
      expect(res.body.matches[0].sameCategory).toBe(true);
    });

    it('POST /api/tickets should validate required fields (400)', async () => {
      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.errors.some((e) => e.field === 'pcId')).toBe(true);
      expect(res.body.errors.some((e) => e.field === 'categoryId')).toBe(true);
      expect(res.body.errors.some((e) => e.field === 'description')).toBe(true);
    });

    it('POST /api/tickets should reject creation if PC has can_report: false (409)', async () => {
      const nonReportablePc = {
        ...mockPcRow,
        can_report: false,
        notice: 'PC is scheduled for routine OS reinstallation',
      };

      db.query.mockImplementation((text) => {
        if (text.includes('FROM users u')) return Promise.resolve({ rowCount: 1, rows: [mockUserRow] });
        if (text.includes('WHERE p.id = $1')) {
          return Promise.resolve({ rowCount: 1, rows: [nonReportablePc] });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          pcId,
          categoryId: 'cat-power',
          description: 'PC does not turn on',
        });

      expect(res.statusCode).toBe(409);
      expect(res.body.code).toBe('PC_NOT_REPORTABLE');
    });

    it('POST /api/tickets should create ticket and initial event inside transaction (201)', async () => {
      mockClient.query.mockImplementation((text) => {
        if (text === 'BEGIN' || text === 'COMMIT') return Promise.resolve();
        if (text.includes("nextval('tickets_ticket_number_seq')")) {
          return Promise.resolve({ rows: [{ num: '1001' }] });
        }
        if (text.includes('INSERT INTO tickets')) {
          return Promise.resolve({ rows: [mockTicketRow] });
        }
        if (text.includes('INSERT INTO ticket_events')) {
          return Promise.resolve({ rows: [{ id: 'ev-1', event_type: 'SUBMITTED' }] });
        }
        if (text.includes('INSERT INTO sync_events')) {
          return Promise.resolve({ rows: [{ id: 'sync-1' }] });
        }
        return Promise.resolve({ rowCount: 1, rows: [] });
      });

      db.query.mockImplementation((text, params) => {
        if (text.includes('FROM users u')) return Promise.resolve({ rowCount: 1, rows: [mockUserRow] });
        if (text.includes('WHERE p.id = $1')) return Promise.resolve({ rowCount: 1, rows: [mockPcRow] });
        if (text.includes('FROM ticket_categories')) {
          const isSubcategory = params?.[0] === 'sub-no-display';
          return Promise.resolve({ rowCount: 1, rows: [isSubcategory
            ? { id: 'sub-no-display', parent_id: 'cat-display', name: 'No Display' }
            : { id: 'cat-display', parent_id: null, name: 'Display' }] });
        }
        if (text.includes('WHERE t.pc_id = $1')) {
          return Promise.resolve({ rowCount: 0, rows: [] }); // No duplicates
        }
        if (text.includes('WHERE t.id = $1')) {
          return Promise.resolve({ rowCount: 1, rows: [mockTicketRow] });
        }
        if (text.includes('FROM ticket_events e')) {
          return Promise.resolve({ rowCount: 1, rows: [{ id: 'ev-1', event_type: 'SUBMITTED', created_at: new Date().toISOString() }] });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          pcId,
          categoryId: 'cat-display',
          subcategoryId: 'sub-no-display',
          urgency: 'HIGH',
          description: 'PC monitor displays no signal',
          attachmentIds: ['att-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.ticket.id).toBe('LAB-1001');
      expect(res.body.ticket.status).toBe('SUBMITTED');
      expect(mockClient.query.mock.calls.some(([sql, values]) =>
        String(sql).includes('UPDATE attachments') && values?.[2]?.includes('att-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
      )).toBe(true);
    });

    it('POST /api/tickets/:id/comments should reject a different teacher', async () => {
      db.query.mockImplementation((text) => {
        if (text.includes('FROM users u')) return Promise.resolve({ rowCount: 1, rows: [mockOtherTeacherRow] });
        if (text.includes('WHERE t.id = $1')) return Promise.resolve({ rowCount: 1, rows: [mockTicketRow] });
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      const res = await request(app)
        .post('/api/tickets/LAB-1001/comments')
        .set('Authorization', `Bearer ${otherTeacherToken}`)
        .send({ body: 'This is not my ticket.' });

      expect(res.statusCode).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN_TICKET_ACCESS');
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('POST /api/tickets should enforce idempotency key and return cached response on retry', async () => {
      const idempotencyKey = 'idem-unique-key-12345';

      // First call (creates and caches)
      mockClient.query.mockImplementation((text) => {
        if (text === 'BEGIN' || text === 'COMMIT') return Promise.resolve();
        if (text.includes("nextval('tickets_ticket_number_seq')")) return Promise.resolve({ rows: [{ num: '1002' }] });
        if (text.includes('INSERT INTO tickets')) return Promise.resolve({ rows: [{ ...mockTicketRow, id: 'LAB-1002' }] });
        if (text.includes('INSERT INTO ticket_events') || text.includes('INSERT INTO sync_events')) return Promise.resolve({ rows: [{}] });
        return Promise.resolve({ rowCount: 1, rows: [] });
      });

      db.query.mockImplementation((text) => {
        if (text.includes('FROM users u')) return Promise.resolve({ rowCount: 1, rows: [mockUserRow] });
        if (text.includes('WHERE p.id = $1')) return Promise.resolve({ rowCount: 1, rows: [mockPcRow] });
        if (text.includes('FROM ticket_categories')) return Promise.resolve({ rowCount: 1, rows: [{ id: 'cat-display' }] });
        if (text.includes('WHERE t.pc_id = $1')) return Promise.resolve({ rowCount: 0, rows: [] });
        if (text.includes('WHERE t.id = $1')) return Promise.resolve({ rowCount: 1, rows: [{ ...mockTicketRow, id: 'LAB-1002' }] });
        if (text.includes('FROM ticket_events e')) return Promise.resolve({ rowCount: 1, rows: [] });
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      const res1 = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${teacherToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          pcId,
          categoryId: 'cat-display',
          description: 'Testing idempotency key',
        });

      expect(res1.statusCode).toBe(201);
      const ticketId = res1.body.ticket.id;

      // Second call with same idempotency key (must not re-insert, must return same ticket)
      const res2 = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${teacherToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          pcId,
          categoryId: 'cat-display',
          description: 'Testing idempotency key',
        });

      expect(res2.statusCode).toBe(201);
      expect(res2.body.ticket.id).toBe(ticketId);
    });
  });

  // ============================================================================
  // TASK D: TICKET HISTORY, COMMENTS, INFORMATION & VERIFICATION
  // ============================================================================
  describe('TASK D: Ticket History, Comments, Information & Verification', () => {
    it('GET /api/tickets/my should return teachers tickets list', async () => {
      db.query.mockImplementation((text) => {
        if (text.includes('FROM users u')) return Promise.resolve({ rowCount: 1, rows: [mockUserRow] });
        if (text.includes('COUNT(*) AS total')) return Promise.resolve({ rowCount: 1, rows: [{ total: '1' }] });
        if (text.includes('FROM tickets t')) return Promise.resolve({ rowCount: 1, rows: [mockTicketRow] });
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      const res = await request(app)
        .get('/api/tickets/my')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].id).toBe('LAB-1001');
    });

    it('GET /api/tickets/:id should prevent unauthorized teacher access (403)', async () => {
      db.query.mockImplementation((text) => {
        if (text.includes('FROM users u')) return Promise.resolve({ rowCount: 1, rows: [mockOtherTeacherRow] });
        if (text.includes('WHERE t.id = $1')) return Promise.resolve({ rowCount: 1, rows: [mockTicketRow] }); // Reporter is teacherId
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      const res = await request(app)
        .get('/api/tickets/LAB-1001')
        .set('Authorization', `Bearer ${otherTeacherToken}`); // Request from other teacher

      expect(res.statusCode).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN_TICKET_ACCESS');
    });

    it('GET /api/tickets/:id should allow ADMIN to access any ticket', async () => {
      db.query.mockImplementation((text) => {
        if (text.includes('FROM users u')) return Promise.resolve({ rowCount: 1, rows: [mockAdminRow] });
        if (text.includes('WHERE t.id = $1')) return Promise.resolve({ rowCount: 1, rows: [mockTicketRow] });
        if (text.includes('FROM ticket_events e')) return Promise.resolve({ rowCount: 0, rows: [] });
        if (text.includes('FROM ticket_comments c')) return Promise.resolve({ rowCount: 0, rows: [] });
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      const res = await request(app)
        .get('/api/tickets/LAB-1001')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.ticket.id).toBe('LAB-1001');
    });

    it('GET /api/tickets/:id/timeline should return chronological events', async () => {
      db.query.mockImplementation((text) => {
        if (text.includes('FROM users u')) return Promise.resolve({ rowCount: 1, rows: [mockUserRow] });
        if (text.includes('WHERE t.id = $1')) return Promise.resolve({ rowCount: 1, rows: [mockTicketRow] });
        if (text.includes('FROM ticket_events e')) {
          return Promise.resolve({
            rowCount: 2,
            rows: [
              { id: 'ev-1', ticket_id: 'LAB-1001', event_type: 'SUBMITTED', created_at: '2026-11-25T10:00:00Z', note: null },
              { id: 'ev-2', ticket_id: 'LAB-1001', event_type: 'IN_PROGRESS', created_at: '2026-11-25T11:00:00Z', note: 'Technician assigned' },
            ],
          });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      const res = await request(app)
        .get('/api/tickets/LAB-1001/timeline')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.timeline).toHaveLength(2);
      expect(res.body.timeline[0].type).toBe('SUBMITTED');
      expect(res.body.timeline[1].type).toBe('IN_PROGRESS');
    });

    it('POST /api/tickets/:id/comments should add comment and record event', async () => {
      mockClient.query.mockImplementation((text) => {
        if (text === 'BEGIN' || text === 'COMMIT') return Promise.resolve();
        if (text.includes('INSERT INTO ticket_comments')) {
          return Promise.resolve({ rows: [{ id: 'c-1', body: 'HDMI port is loose' }] });
        }
        if (text.includes('INSERT INTO ticket_events') || text.includes('UPDATE tickets')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rowCount: 1, rows: [] });
      });

      db.query.mockImplementation((text) => {
        if (text.includes('FROM users u')) return Promise.resolve({ rowCount: 1, rows: [mockUserRow] });
        if (text.includes('WHERE t.id = $1')) return Promise.resolve({ rowCount: 1, rows: [mockTicketRow] });
        if (text.includes('FROM ticket_events e')) return Promise.resolve({ rowCount: 1, rows: [] });
        if (text.includes('FROM ticket_comments c')) return Promise.resolve({ rowCount: 1, rows: [] });
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      const res = await request(app)
        .post('/api/tickets/LAB-1001/comments')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ body: 'HDMI port is loose' });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('POST /api/tickets/:id/verification should close ticket on result=WORKING', async () => {
      const awaitingVerificationTicket = {
        ...mockTicketRow,
        status: 'AWAITING_VERIFICATION',
      };

      mockClient.query.mockImplementation((text) => {
        if (text === 'BEGIN' || text === 'COMMIT') return Promise.resolve();
        if (text.includes('UPDATE tickets')) {
          return Promise.resolve({ rows: [{ ...awaitingVerificationTicket, status: 'CLOSED' }] });
        }
        if (text.includes('INSERT INTO ticket_events') || text.includes('INSERT INTO sync_events')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rowCount: 1, rows: [] });
      });

      let verificationCallCount = 0;
      db.query.mockImplementation((text) => {
        if (text.includes('FROM users u')) return Promise.resolve({ rowCount: 1, rows: [mockUserRow] });
        if (text.includes('WHERE t.id = $1')) {
          verificationCallCount++;
          if (verificationCallCount === 1) {
            return Promise.resolve({ rowCount: 1, rows: [awaitingVerificationTicket] });
          }
          return Promise.resolve({ rowCount: 1, rows: [{ ...awaitingVerificationTicket, status: 'CLOSED' }] });
        }
        if (text.includes('FROM ticket_events e') || text.includes('FROM ticket_comments c')) {
          return Promise.resolve({ rowCount: 0, rows: [] });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      const res = await request(app)
        .post('/api/tickets/LAB-1001/verification')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          result: 'WORKING',
          rating: 5,
          comment: 'Screen is clear now. Thanks!',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.ticket.status).toBe('CLOSED');
    });

    it('PATCH /api/tickets/:id/jira-sync should update Jira key and status for Admin', async () => {
      mockClient.query.mockImplementation((text) => {
        if (text === 'BEGIN' || text === 'COMMIT') return Promise.resolve();
        if (text.includes('SELECT * FROM tickets WHERE id = $1')) {
          return Promise.resolve({ rowCount: 1, rows: [mockTicketRow] });
        }
        if (text.includes('UPDATE tickets')) {
          return Promise.resolve({
            rows: [{ ...mockTicketRow, jira_issue_key: 'JSM-1042', status: 'IN_PROGRESS' }],
          });
        }
        if (text.includes('INSERT INTO ticket_events') || text.includes('INSERT INTO sync_events')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rowCount: 1, rows: [] });
      });

      db.query.mockImplementation((text) => {
        if (text.includes('FROM users u')) return Promise.resolve({ rowCount: 1, rows: [mockAdminRow] });
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      const res = await request(app)
        .patch('/api/tickets/LAB-1001/jira-sync')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          jiraIssueKey: 'JSM-1042',
          jiraIssueId: '10042',
          status: 'IN_PROGRESS',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.jiraIssueKey).toBe('JSM-1042');
      expect(res.body.status).toBe('IN_PROGRESS');
    });
  });
});


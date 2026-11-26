/**
 * CampusCare Phase 4 Integration Tests
 * Tests Dashboard Aggregations, Profile Protection, Notifications Isolation, and Secure File Uploads
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const app = require('../src/app');
const db = require('../src/config/db');
const config = require('../src/config/env');

jest.mock('../src/config/db', () => ({
  query: jest.fn(),
  pool: {
    connect: jest.fn(),
  },
  testConnection: jest.fn(),
  closePool: jest.fn(),
}));

describe('CampusCare Phase 4 - Advanced APIs Integration Tests', () => {
  const teacherId = '5b2f8c1e-4d3a-4c6b-9e7f-000000000001';
  const otherTeacherId = '5b2f8c1e-4d3a-4c6b-9e7f-000000000002';
  const adminId = '5b2f8c1e-4d3a-4c6b-9e7f-000000000005';

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

  const mockTeacher = {
    id: teacherId,
    email: 'teacher@college.edu',
    full_name: 'Prof. Anjali Deshmukh',
    phone: '9820012345',
    department: 'Computer Engineering',
    designation: 'Assistant Professor',
    avatar_url: null,
    role_id: 1,
    role: 'TEACHER',
    account_status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockOtherTeacher = {
    id: otherTeacherId,
    email: 'other.teacher@college.edu',
    full_name: 'Prof. Rahul Mehta',
    phone: '9819098765',
    department: 'Information Technology',
    designation: 'Associate Professor',
    avatar_url: null,
    role_id: 1,
    role: 'TEACHER',
    account_status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    db.query.mockImplementation((text, params) => {
      if (typeof text === 'string' && text.includes('FROM users u')) {
        const uid = params ? params[0] : null;
        if (uid === teacherId) return Promise.resolve({ rowCount: 1, rows: [mockTeacher] });
        if (uid === otherTeacherId) return Promise.resolve({ rowCount: 1, rows: [mockOtherTeacher] });
      }
      return Promise.resolve({ rowCount: 0, rows: [] });
    });
  });

  // ============================================================================
  // TASK A: DASHBOARD APIS
  // ============================================================================
  describe('TASK A: Dashboard Aggregation APIs', () => {
    it('GET /api/dashboard/summary should return teacher aggregated metrics', async () => {
      db.query.mockImplementation((text, params) => {
        if (text.includes('FROM users u')) return Promise.resolve({ rowCount: 1, rows: [mockTeacher] });
        if (text.includes('COUNT(*)')) {
          expect(params[0]).toBe(teacherId); // Strictly filtered by teacher ID
          return Promise.resolve({
            rowCount: 1,
            rows: [
              {
                total: 5,
                pending: 1,
                in_progress: 2,
                awaiting_verification: 1,
                resolved: 1,
                open: 4,
              },
            ],
          });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      const res = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.total).toBe(5);
      expect(res.body.pending).toBe(1);
      expect(res.body.inProgress).toBe(2);
      expect(res.body.awaitingVerification).toBe(1);
      expect(res.body.resolved).toBe(1);
    });

    it('GET /api/dashboard/recent-requests should return recent requests for teacher', async () => {
      db.query.mockImplementation((text, params) => {
        if (text.includes('FROM users u')) return Promise.resolve({ rowCount: 1, rows: [mockTeacher] });
        if (text.includes('FROM tickets t')) {
          return Promise.resolve({
            rowCount: 1,
            rows: [
              {
                id: 'LAB-1001',
                status: 'SUBMITTED',
                urgency: 'HIGH',
                description: 'Screen flickering',
                reporter_id: teacherId,
                category_id: 'cat-display',
                category_name: 'Display',
                pc_id: 'pc-1',
                display_code: '522/A/1',
                lab_name: 'Computer Lab 1',
                room_number: '522',
                block_name: 'Block A',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
          });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      const res = await request(app)
        .get('/api/dashboard/recent-requests?limit=5')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].id).toBe('LAB-1001');
    });
  });

  // ============================================================================
  // TASK B: PROFILE APIS & SECURITY
  // ============================================================================
  describe('TASK B: Profile Management & Protected Fields', () => {
    it('GET /api/profile should return authenticated teacher profile with editable fields list', async () => {
      db.query.mockImplementation((text) => {
        if (text.includes('FROM users u')) return Promise.resolve({ rowCount: 1, rows: [mockTeacher] });
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      const res = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.profile.email).toBe('teacher@college.edu');
      expect(res.body.profile.editableFields).toContain('phone');
    });

    it('PATCH /api/profile should allow updating approved fields (phone, designation)', async () => {
      const updatedTeacher = { ...mockTeacher, phone: '9999988888', designation: 'Senior Assistant Professor' };

      db.query.mockImplementation((text) => {
        if (text.includes('FROM users u')) return Promise.resolve({ rowCount: 1, rows: [mockTeacher] });
        if (text.includes('UPDATE users')) return Promise.resolve({ rowCount: 1, rows: [updatedTeacher] });
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      const res = await request(app)
        .patch('/api/profile')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          phone: '9999988888',
          designation: 'Senior Assistant Professor',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.profile.phone).toBe('9999988888');
    });

    it('PATCH /api/profile should PREVENT modification of protected field role (403)', async () => {
      const res = await request(app)
        .patch('/api/profile')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ role: 'ADMIN' });

      expect(res.statusCode).toBe(403);
      expect(res.body.code).toBe('PROTECTED_FIELD_MODIFICATION');
    });

    it('PATCH /api/profile should PREVENT modification of user ID or password_hash (403)', async () => {
      const res = await request(app)
        .patch('/api/profile')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ id: '00000000-0000-0000-0000-000000000000' });

      expect(res.statusCode).toBe(403);
      expect(res.body.code).toBe('PROTECTED_FIELD_MODIFICATION');

      const res2 = await request(app)
        .patch('/api/profile')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ password: 'newpassword123' });

      expect(res2.statusCode).toBe(403);
      expect(res2.body.code).toBe('PROTECTED_FIELD_MODIFICATION');
    });
  });

  // ============================================================================
  // TASK C: NOTIFICATION APIS & OWNERSHIP
  // ============================================================================
  describe('TASK C: Notification APIs & Isolation', () => {
    const mockNotification = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      recipient_id: teacherId,
      ticket_id: 'LAB-1001',
      type: 'TICKET_ACKNOWLEDGED',
      title: 'Ticket Acknowledged',
      message: 'Your ticket LAB-1001 has been acknowledged.',
      is_read: false,
      read_at: null,
      created_at: new Date().toISOString(),
    };

    it('GET /api/notifications should list notifications and unread count', async () => {
      db.query.mockImplementation((text, params) => {
        if (text.includes('FROM users u')) return Promise.resolve({ rowCount: 1, rows: [mockTeacher] });
        if (text.includes('SELECT COUNT(*) AS total')) return Promise.resolve({ rowCount: 1, rows: [{ total: '1' }] });
        if (text.includes('SELECT COUNT(*) AS unread')) return Promise.resolve({ rowCount: 1, rows: [{ unread: '1' }] });
        if (text.includes('FROM notifications')) return Promise.resolve({ rowCount: 1, rows: [mockNotification] });
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.unreadCount).toBe(1);
    });

    it('PATCH /api/notifications/:id/read should mark notification as read', async () => {
      db.query.mockImplementation((text) => {
        if (text.includes('FROM users u')) return Promise.resolve({ rowCount: 1, rows: [mockTeacher] });
        if (text.includes('UPDATE notifications')) {
          return Promise.resolve({ rowCount: 1, rows: [{ ...mockNotification, is_read: true }] });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      const res = await request(app)
        .patch('/api/notifications/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/read')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.notification.is_read).toBe(true);
    });

    it('PATCH /api/notifications/:id/read should reject updating another users notification (404)', async () => {
      db.query.mockImplementation((text) => {
        if (text.includes('FROM users u')) return Promise.resolve({ rowCount: 1, rows: [mockOtherTeacher] });
        if (text.includes('UPDATE notifications')) {
          // WHERE id = $1 AND recipient_id = $2 returns 0 rows because recipient_id does not match
          return Promise.resolve({ rowCount: 0, rows: [] });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      const res = await request(app)
        .patch('/api/notifications/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/read')
        .set('Authorization', `Bearer ${otherTeacherToken}`); // Other teacher

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('NOTIFICATION_NOT_FOUND');
    });

    it('PATCH /api/notifications/read-all should mark all notifications read for the user', async () => {
      db.query.mockImplementation((text) => {
        if (text.includes('FROM users u')) return Promise.resolve({ rowCount: 1, rows: [mockTeacher] });
        if (text.includes('UPDATE notifications')) return Promise.resolve({ rowCount: 3, rows: [] });
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      const res = await request(app)
        .patch('/api/notifications/read-all')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.updatedCount).toBe(3);
    });
  });

  // ============================================================================
  // TASK D: SECURE FILE HANDLING
  // ============================================================================
  describe('TASK D: Secure File Handling (Multer & Attachments)', () => {
    it('GET /api/uploads/config should return file limits and accepted MIME types', async () => {
      const res = await request(app).get('/api/uploads/config');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.maxFileSizeBytes).toBeDefined();
      expect(res.body.acceptedMimeTypes).toContain('image/png');
      expect(res.body.acceptedMimeTypes).toContain('application/pdf');
    });

    it('POST /api/uploads should reject forbidden file types (.exe, scripts) with 400', async () => {
      const res = await request(app)
        .post('/api/uploads')
        .set('Authorization', `Bearer ${teacherToken}`)
        .attach('file', Buffer.from('malicious binary'), {
          filename: 'payload.exe',
          contentType: 'application/x-msdownload',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('UNSUPPORTED_FILE_TYPE');
    });

    it('POST /api/uploads should accept valid PNG image and record in PostgreSQL', async () => {
      const mockAttachmentRow = {
        id: 'att-1234',
        ticket_id: null,
        comment_id: null,
        uploader_id: teacherId,
        file_name: 'unique-random-filename.png',
        original_name: 'screenshot.png',
        mime_type: 'image/png',
        file_size: 1024,
        created_at: new Date().toISOString(),
      };

      db.query.mockImplementation((text) => {
        if (text.includes('FROM users u')) return Promise.resolve({ rowCount: 1, rows: [mockTeacher] });
        if (text.includes('INSERT INTO attachments')) return Promise.resolve({ rowCount: 1, rows: [mockAttachmentRow] });
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      const res = await request(app)
        .post('/api/uploads')
        .set('Authorization', `Bearer ${teacherToken}`)
        .attach('file', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j7QAAAABJRU5ErkJggg==', 'base64'), {
          filename: 'screenshot.png',
          contentType: 'image/png',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.attachment.id).toBe('att-1234');
      expect(res.body.attachment.name).toBe('screenshot.png');
    });

    it('POST /api/uploads should reject content that only claims to be a PNG', async () => {
      const res = await request(app)
        .post('/api/uploads')
        .set('Authorization', `Bearer ${teacherToken}`)
        .attach('file', Buffer.from('plain text, not a png'), {
          filename: 'spoof.png',
          contentType: 'image/png',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_FILE_CONTENT');
    });

    it('GET /api/uploads/:id should reject unauthorized user with 403', async () => {
      const attachmentMeta = {
        id: 'att-1234',
        uploader_id: teacherId, // Uploaded by teacherId
        ticket_reporter_id: teacherId,
        original_name: 'test.png',
        mime_type: 'image/png',
        file_path: 'uploads/attachments/dummy.png',
      };

      db.query.mockImplementation((text) => {
        if (text.includes('FROM users u')) return Promise.resolve({ rowCount: 1, rows: [mockOtherTeacher] });
        if (text.includes('FROM attachments a')) return Promise.resolve({ rowCount: 1, rows: [attachmentMeta] });
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      const res = await request(app)
        .get('/api/uploads/att-1234')
        .set('Authorization', `Bearer ${otherTeacherToken}`); // Other teacher

      expect(res.statusCode).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN_ATTACHMENT_ACCESS');
    });
  });
});


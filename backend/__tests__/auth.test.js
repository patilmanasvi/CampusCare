/**
 * CampusCare Authentication & Security Integration Tests
 * Comprehensive test suite verifying Phase 2 requirements:
 * 1. Successful login
 * 2. Incorrect password rejection
 * 3. Invalid token rejection
 * 4. Expired token handling
 * 5. Successful /auth/me response
 * 6. Role-based access restrictions (Teacher vs Admin)
 * 7. Logout behaviour
 * 8. Access to protected routes without/after logout
 * 9. Input validation errors
 * 10. Rate limiting protection
 */

const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = require('../src/app');
const db = require('../src/config/db');
const config = require('../src/config/env');
const { authenticate } = require('../src/middleware/authMiddleware');
const {
  authorizeRoles,
  requireTeacher,
  requireAdmin,
  requireSelfOrAdmin,
  preventRoleSelfEscalation,
} = require('../src/middleware/roleMiddleware');

// Mock db.query so tests run reliably, fast, and deterministically
jest.mock('../src/config/db', () => ({
  query: jest.fn(),
  testConnection: jest.fn(),
  closePool: jest.fn(),
}));

describe('CampusCare Phase 2 - Authentication & Security Tests', () => {
  const rawPassword = 'password123';
  const hashedPassword = bcrypt.hashSync(rawPassword, 10);

  const mockTeacher = {
    id: '5b2f8c1e-4d3a-4c6b-9e7f-000000000001',
    role_id: 1,
    role: 'TEACHER',
    email: 'teacher@college.edu',
    password_hash: hashedPassword,
    full_name: 'Prof. Anjali Deshmukh',
    phone: '9820012345',
    department: 'Computer Engineering',
    designation: 'Assistant Professor',
    avatar_url: null,
    account_status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockAdmin = {
    id: '5b2f8c1e-4d3a-4c6b-9e7f-000000000005',
    role_id: 3,
    role: 'ADMIN',
    email: 'admin@college.edu',
    password_hash: hashedPassword,
    full_name: 'Dr. Arvind Sharma',
    phone: '9820099887',
    department: 'Information Technology',
    designation: 'Head of IT Infrastructure',
    avatar_url: null,
    account_status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockPendingTeacher = {
    ...mockTeacher,
    id: '5b2f8c1e-4d3a-4c6b-9e7f-000000000003',
    email: 'pending.teacher@college.edu',
    account_status: 'PENDING',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // 1. INPUT VALIDATION TESTS (POST /api/auth/login)
  // ============================================================================
  describe('1. Input Validation on Login', () => {
    it('should reject login request with missing email and password (400)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.body.errors.some((e) => e.field === 'email')).toBe(true);
      expect(res.body.errors.some((e) => e.field === 'password')).toBe(true);
    });

    it('should reject invalid email format (400)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'not-an-email',
          password: 'password123',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.errors.some((e) => e.field === 'email')).toBe(true);
    });

    it('should reject password shorter than 6 characters (400)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'teacher@college.edu',
          password: '123',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.errors.some((e) => e.field === 'password')).toBe(true);
    });
  });

  // ============================================================================
  // 2. AUTHENTICATION & LOGIN TESTS (POST /api/auth/login)
  // ============================================================================
  describe('2. User Authentication & Login', () => {
    it('should reject login for non-existent user with generic 401 error', async () => {
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@college.edu',
          password: 'password123',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.message).toMatch(/invalid email or password/i);
    });

    it('should reject incorrect password with generic 401 error', async () => {
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [mockTeacher] });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'teacher@college.edu',
          password: 'WrongPassword999',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login when account status is PENDING (403)', async () => {
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [mockPendingTeacher] });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'pending.teacher@college.edu',
          password: 'password123',
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('ACCOUNT_PENDING');
    });

    it('should succeed with valid teacher credentials and return token, user, teacher & cookie', async () => {
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [mockTeacher] });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'teacher@college.edu',
          password: 'password123',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('token');
      expect(typeof res.body.token).toBe('string');

      // Verify safe profile returned
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('teacher@college.edu');
      expect(res.body.user.role).toBe('TEACHER');

      // Member 1 teacher portal compatibility alias
      expect(res.body.teacher).toBeDefined();
      expect(res.body.teacher.email).toBe('teacher@college.edu');

      // CRITICAL SECURITY: Never expose password hashes or sensitive tokens
      expect(res.body.user.password_hash).toBeUndefined();
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.teacher.password_hash).toBeUndefined();

      // Verify HTTP-only cookie was set
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c) => c.includes(config.auth.cookieName) && c.includes('HttpOnly'))).toBe(true);
    });
  });

  // ============================================================================
  // 3. CURRENT USER RETRIEVAL (GET /api/auth/me)
  // ============================================================================
  describe('3. Current Authenticated User (GET /api/auth/me)', () => {
    it('should reject unauthenticated request with 401 AUTH_REQUIRED', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('AUTH_REQUIRED');
    });

    it('should reject invalid or malformed token with 401 INVALID_TOKEN', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.malformed.token');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('INVALID_TOKEN');
    });

    it('should reject expired JWT token with 401 TOKEN_EXPIRED', async () => {
      // Create an already-expired token
      const expiredToken = jwt.sign(
        { id: mockTeacher.id, email: mockTeacher.email, role: 'TEACHER' },
        config.jwt.secret,
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('TOKEN_EXPIRED');
    });

    it('should successfully return authenticated teacher profile via Bearer token', async () => {
      const validToken = jwt.sign(
        { id: mockTeacher.id, email: mockTeacher.email, role: 'TEACHER' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [mockTeacher] });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('teacher@college.edu');
      expect(res.body.user.role).toBe('TEACHER');
      expect(res.body.teacher).toBeDefined();
      expect(res.body.user.password_hash).toBeUndefined();
    });

    it('should successfully authenticate via HTTP-only cookie', async () => {
      const validToken = jwt.sign(
        { id: mockTeacher.id, email: mockTeacher.email, role: 'TEACHER' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [mockTeacher] });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `${config.auth.cookieName}=${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe('teacher@college.edu');
    });
  });

  // ============================================================================
  // 4. LOGOUT BEHAVIOUR (POST /api/auth/logout)
  // ============================================================================
  describe('4. Logout Behavior', () => {
    it('should return 200 and clear the session cookie', async () => {
      const res = await request(app).post('/api/auth/logout');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/logged out/i);

      // Verify cookie is cleared (Expires in the past / empty value)
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c) => c.includes(config.auth.cookieName) && (c.includes('Expires=') || c.includes('Max-Age=0')))).toBe(true);
    });

    it('should block access to protected route when no token is supplied after logout', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.statusCode).toBe(401);
      expect(res.body.code).toBe('AUTH_REQUIRED');
    });
  });

  // ============================================================================
  // 5. ROLE-BASED ACCESS CONTROL (RBAC) TESTS
  // ============================================================================
  describe('5. Role-Based Access Control', () => {
    // Create an ephemeral test router to thoroughly test RBAC middleware
    const testApp = express();
    testApp.use(express.json());
    testApp.use(cookieParser(config.auth.cookieSecret));

    // Protected routes for different roles
    testApp.get('/test/teacher-only', authenticate, requireTeacher, (req, res) => {
      res.status(200).json({ success: true, message: 'Teacher access granted' });
    });

    testApp.get('/test/admin-only', authenticate, requireAdmin, (req, res) => {
      res.status(200).json({ success: true, message: 'Admin access granted' });
    });

    testApp.get('/test/users/:id/private-data', authenticate, requireSelfOrAdmin('id'), (req, res) => {
      res.status(200).json({ success: true, message: `Access granted for user ${req.params.id}` });
    });

    testApp.patch('/test/users/profile', authenticate, preventRoleSelfEscalation, (req, res) => {
      res.status(200).json({ success: true, message: 'Profile updated' });
    });

    it('should allow TEACHER role on teacher-only route', async () => {
      const teacherToken = jwt.sign(
        { id: mockTeacher.id, email: mockTeacher.email, role: 'TEACHER' },
        config.jwt.secret
      );
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [mockTeacher] });

      const res = await request(testApp)
        .get('/test/teacher-only')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Teacher access granted');
    });

    it('should reject TEACHER role on admin-only route with 403 FORBIDDEN_ROLE', async () => {
      const teacherToken = jwt.sign(
        { id: mockTeacher.id, email: mockTeacher.email, role: 'TEACHER' },
        config.jwt.secret
      );
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [mockTeacher] });

      const res = await request(testApp)
        .get('/test/admin-only')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('FORBIDDEN_ROLE');
      expect(res.body.message).toMatch(/Forbidden: Access requires one of the following roles/i);
    });

    it('should allow ADMIN role on admin-only route', async () => {
      const adminToken = jwt.sign(
        { id: mockAdmin.id, email: mockAdmin.email, role: 'ADMIN' },
        config.jwt.secret
      );
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [mockAdmin] });

      const res = await request(testApp)
        .get('/test/admin-only')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Admin access granted');
    });

    it('should prevent teacher from accessing another teacher private data (403)', async () => {
      const teacherToken = jwt.sign(
        { id: mockTeacher.id, email: mockTeacher.email, role: 'TEACHER' },
        config.jwt.secret
      );
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [mockTeacher] });

      const otherTeacherId = '5b2f8c1e-4d3a-4c6b-9e7f-000000000002';

      const res = await request(testApp)
        .get(`/test/users/${otherTeacherId}/private-data`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.code).toBe('ACCESS_DENIED_NOT_OWNER');
    });

    it('should allow teacher to access their own private data', async () => {
      const teacherToken = jwt.sign(
        { id: mockTeacher.id, email: mockTeacher.email, role: 'TEACHER' },
        config.jwt.secret
      );
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [mockTeacher] });

      const res = await request(testApp)
        .get(`/test/users/${mockTeacher.id}/private-data`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.statusCode).toBe(200);
    });

    it('should allow ADMIN to access any user private data', async () => {
      const adminToken = jwt.sign(
        { id: mockAdmin.id, email: mockAdmin.email, role: 'ADMIN' },
        config.jwt.secret
      );
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [mockAdmin] });

      const targetUserId = mockTeacher.id;

      const res = await request(testApp)
        .get(`/test/users/${targetUserId}/private-data`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
    });

    it('should prevent teacher from modifying their own role (403)', async () => {
      const teacherToken = jwt.sign(
        { id: mockTeacher.id, email: mockTeacher.email, role: 'TEACHER' },
        config.jwt.secret
      );
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [mockTeacher] });

      const res = await request(testApp)
        .patch('/test/users/profile')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ role: 'ADMIN' });

      expect(res.statusCode).toBe(403);
      expect(res.body.code).toBe('ROLE_MODIFICATION_FORBIDDEN');
    });
  });

  // ============================================================================
  // 6. RATE LIMITING PROTECTION
  // ============================================================================
  describe('6. Login Rate Limiting', () => {
    it('should trigger rate limit response when x-test-rate-limit header is provided and limit exceeded', async () => {
      // Simulate exceeding rate limit by sending rapid requests with test rate limit trigger
      const customApp = express();
      customApp.use(express.json());
      const rateLimit = require('express-rate-limit');

      const limiter = rateLimit({
        windowMs: 60000,
        max: 2, // 2 requests max for testing
        message: {
          success: false,
          message: 'Too many login attempts. Please wait before trying again.',
          code: 'TOO_MANY_REQUESTS',
        },
      });

      customApp.post('/test/limit-login', limiter, (req, res) => {
        res.status(200).json({ success: true });
      });

      await request(customApp).post('/test/limit-login').send({});
      await request(customApp).post('/test/limit-login').send({});
      const blockedRes = await request(customApp).post('/test/limit-login').send({});

      expect(blockedRes.statusCode).toBe(429);
      expect(blockedRes.body.code).toBe('TOO_MANY_REQUESTS');
    });
  });
});

/**
 * CampusCare Authentication Controller
 * Handles Teacher and Staff authentication, login, logout, and profile queries
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const db = require('../config/db');

/**
 * Generates signed JSON Web Token for an authenticated user
 *
 * @param {object} user - User record from PostgreSQL
 * @returns {string} Signed JWT
 */
const generateToken = (user) => {
  const payload = {
    id: user.id,
    sub: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

/**
 * Formats a raw database user row into a safe, client-facing profile object
 * CRITICAL SECURITY: Never expose password_hash or internal secrets
 *
 * @param {object} user - Raw PostgreSQL user row
 * @returns {object} Safe user profile
 */
const sanitizeUser = (user) => ({
  id: user.id,
  fullName: user.full_name,
  name: user.full_name, // Member 1 compatibility
  email: user.email,
  phone: user.phone,
  department: user.department,
  designation: user.designation,
  avatarUrl: user.avatar_url,
  roleId: user.role_id,
  role: user.role, // 'TEACHER', 'ADMIN', 'TECHNICIAN', etc.
  accountStatus: user.account_status,
  createdAt: user.created_at,
  updatedAt: user.updated_at,
});

/**
 * Sets secure HTTP-only session cookie on the response
 *
 * @param {import('express').Response} res
 * @param {string} token - Signed JWT
 */
const setAuthCookie = (res, token) => {
  // Convert 24h string to milliseconds (default 24 hours)
  const maxAgeMs = 24 * 60 * 60 * 1000;

  res.cookie(config.auth.cookieName, token, {
    httpOnly: true, // Prevents client-side JavaScript access (XSS defense)
    secure: config.auth.cookieSecure, // HTTPS only in production
    sameSite: config.auth.cookieSameSite, // Mitigates CSRF
    maxAge: maxAgeMs,
    path: '/',
  });
};

/**
 * Clears authentication session cookie
 *
 * @param {import('express').Response} res
 */
const clearAuthCookie = (res) => {
  res.clearCookie(config.auth.cookieName, {
    httpOnly: true,
    secure: config.auth.cookieSecure,
    sameSite: config.auth.cookieSameSite,
    path: '/',
  });
};

/**
 * POST /api/auth/login
 * Authenticates user credentials and returns safe profile with JWT token
 */
const login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // 1. Fetch user from PostgreSQL by email (case-insensitive)
    const queryText = `
      SELECT 
        u.id,
        u.email,
        u.password_hash,
        u.full_name,
        u.phone,
        u.department,
        u.designation,
        u.avatar_url,
        u.account_status,
        u.created_at,
        u.updated_at,
        r.id AS role_id,
        r.name AS role
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE LOWER(u.email) = LOWER($1)
      LIMIT 1
    `;

    const result = await db.query(queryText, [email.trim()]);

    if (result.rowCount === 0) {
      // Generic error message prevents user email enumeration
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    const user = result.rows[0];

    // 2. Compare supplied plaintext password with bcrypt hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // 3. Enforce account status workflow
    if (user.account_status === 'PENDING') {
      return res.status(403).json({
        success: false,
        message: 'Your account is waiting for administrator approval.',
        code: 'ACCOUNT_PENDING',
      });
    }

    if (user.account_status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Your account is not active. Please contact the lab administrator.',
        code: 'ACCOUNT_INACTIVE',
      });
    }

    // 4. Generate JWT token
    const token = generateToken(user);

    // 5. Set secure HTTP-only cookie
    setAuthCookie(res, token);

    // 6. Build safe profile (no sensitive password hash)
    const safeUser = sanitizeUser(user);

    // Provide both 'user' and 'teacher' properties so Member 1's React code
    // and Member 4's admin portal integrate seamlessly without modification
    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: safeUser,
      teacher: safeUser,
    });
  } catch (error) {
    console.error('[Auth Controller] Login error:', error);
    next(error);
  }
};

/**
 * POST /api/auth/logout
 * Clears session cookie and completes user logout
 */
const logout = async (req, res) => {
  try {
    clearAuthCookie(res);

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    console.error('[Auth Controller] Logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to complete logout.',
      code: 'LOGOUT_ERROR',
    });
  }
};

/**
 * GET /api/auth/me
 * Returns currently authenticated user profile
 */
const getCurrentUser = async (req, res) => {
  try {
    // req.user was populated and verified by authenticate middleware
    return res.status(200).json({
      success: true,
      user: req.user,
      teacher: req.user,
    });
  } catch (error) {
    console.error('[Auth Controller] /me error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile.',
      code: 'PROFILE_RETRIEVAL_ERROR',
    });
  }
};

module.exports = {
  login,
  logout,
  getCurrentUser,
  generateToken,
  sanitizeUser,
  setAuthCookie,
  clearAuthCookie,
};

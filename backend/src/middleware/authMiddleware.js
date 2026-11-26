/**
 * CampusCare JWT Authentication Middleware
 * Validates JSON Web Tokens from Authorization headers or HTTP-only cookies
 * Loads and verifies the active user session from PostgreSQL
 */
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const db = require('../config/db');

/**
 * Extracts JWT token from request headers or cookies
 * Prioritizes standard Authorization: Bearer <token>, falls back to HTTP-only cookie
 *
 * @param {import('express').Request} req
 * @returns {string|null} Token string or null if not found
 */
const extractToken = (req) => {
  // 1. Check Authorization header: Bearer <token>
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  // 2. Fall back to HTTP-only cookie
  if (req.cookies) {
    if (req.cookies[config.auth.cookieName]) {
      return req.cookies[config.auth.cookieName];
    }
    if (req.cookies.token) {
      return req.cookies.token;
    }
  }

  return null;
};

/**
 * Express middleware that enforces authentication on protected routes
 */
const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a valid Bearer token or sign in.',
        code: 'AUTH_REQUIRED',
      });
    }

    // Verify JWT cryptographic signature and expiration
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Your session has expired. Please sign in again.',
          code: 'TOKEN_EXPIRED',
          expiredAt: err.expiredAt,
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid or malformed authentication token. Access denied.',
        code: 'INVALID_TOKEN',
      });
    }

    const userId = decoded.id || decoded.sub;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Malformed token payload: Missing user identifier.',
        code: 'INVALID_TOKEN_PAYLOAD',
      });
    }

    // Verify user exists and check account status in PostgreSQL
    const userQuery = `
      SELECT 
        u.id,
        u.email,
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
      WHERE u.id = $1
      LIMIT 1
    `;

    const result = await db.query(userQuery, [userId]);

    if (result.rowCount === 0) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated user no longer exists.',
        code: 'USER_NOT_FOUND',
      });
    }

    const user = result.rows[0];

    // Enforce account status restrictions
    if (user.account_status === 'PENDING') {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending administrator approval.',
        code: 'ACCOUNT_PENDING',
      });
    }

    if (user.account_status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Your account is not active. Please contact campus IT administration.',
        code: 'ACCOUNT_INACTIVE',
      });
    }

    // Attach safe user profile to request (never exposes password_hash)
    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      name: user.full_name,
      phone: user.phone,
      department: user.department,
      designation: user.designation,
      avatarUrl: user.avatar_url,
      roleId: user.role_id,
      role: user.role, // e.g. 'TEACHER', 'ADMIN', 'TECHNICIAN'
      accountStatus: user.account_status,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };

    req.token = token;
    next();
  } catch (error) {
    console.error('[Auth Middleware Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal authentication server error.',
      code: 'AUTH_SERVER_ERROR',
    });
  }
};

module.exports = {
  authenticate,
  extractToken,
};

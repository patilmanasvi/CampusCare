/**
 * CampusCare Authentication Routes
 * Mounts endpoints for login, logout, and current user retrieval
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { loginRules } = require('../validators/authValidator');
const config = require('../config/env');

/**
 * Rate Limiter for Login Endpoint
 * Protects against brute-force password guessing attacks
 */
const loginRateLimiter = rateLimit({
  windowMs: config.auth.rateLimitWindowMs, // default: 15 minutes
  max: config.auth.rateLimitMax, // default: 10 attempts
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting during test runs unless explicitly requested
  skip: (req) => config.env === 'test' && !req.headers['x-test-rate-limit'],
  message: {
    success: false,
    message: 'Too many login attempts. Please wait before trying again.',
    code: 'TOO_MANY_REQUESTS',
  },
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate teacher or staff credentials, set cookie & return JWT
 * @access  Public (Rate limited)
 */
router.post('/login', loginRateLimiter, validate(loginRules), authController.login);

/**
 * @route   POST /api/auth/logout
 * @desc    Clear session cookie and sign out
 * @access  Public / Authenticated
 */
router.post('/logout', authController.logout);

/**
 * @route   GET /api/auth/me
 * @desc    Retrieve currently authenticated user's profile
 * @access  Protected (Requires Bearer token or cookie)
 */
router.get('/me', authenticate, authController.getCurrentUser);

module.exports = router;

/**
 * Express Application Configuration
 * CampusCare IT Support System
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const config = require('./config/env');
const apiRoutes = require('./routes/apiRoutes');
const { AVATARS_DIR } = require('./middleware/uploadMiddleware');
const notFoundHandler = require('./middleware/notFoundHandler');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security HTTP headers
app.use(helmet());

// Cookie parser for reading secure HTTP-only cookies
app.use(cookieParser(config.auth.cookieSecret));

// CORS configuration - Allow React frontend (Member 1) and Admin Dashboard (Member 4)
const allowedOrigins = [
  config.frontendUrl,
  ...(config.env === 'production' ? [] : ['http://localhost:5173', 'http://localhost:3000']),
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps and command-line clients)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Idempotency-Key'],
  })
);

// CORS controls whether a browser can read a response; it does not stop a
// cross-site form from reaching a state-changing route. Reject such writes too.
app.use((req, res, next) => {
  const isWrite = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  const origin = req.get('Origin');
  if (isWrite && origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ success: false, message: 'Request origin is not allowed.', code: 'ORIGIN_NOT_ALLOWED' });
  }
  return next();
});

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Only profile avatars are public. Ticket attachments are served by the
// authenticated download route so the static server cannot bypass ownership checks.
app.use('/uploads/avatars', express.static(AVATARS_DIR, { dotfiles: 'deny', index: false }));

// Mount main API router
app.use('/api', apiRoutes);

// Root path redirection/status
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    system: 'CampusCare Backend API',
    endpoints: {
      health: '/api/health',
      api: '/api',
    },
  });
});

// Fallback 404 handler
app.use(notFoundHandler);

// Global centralized error handler
app.use(errorHandler);

module.exports = app;

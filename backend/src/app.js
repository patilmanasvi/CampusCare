/**
 * Express Application Configuration
 * CampusCare IT Support System
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config/env');
const apiRoutes = require('./routes/apiRoutes');
const notFoundHandler = require('./middleware/notFoundHandler');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration - Allow React frontend (Member 1) and Admin Dashboard (Member 4)
const allowedOrigins = [
  config.frontendUrl,
  'http://localhost:5173', // Vite default
  'http://localhost:3000', // React default
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in local development
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads folder
app.use('/uploads', express.static(config.upload.dir));

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

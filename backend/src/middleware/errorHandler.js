/**
 * Global Error Handler Middleware
 */
const config = require('../config/env');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, {
    message: err.message,
    stack: config.env === 'development' ? err.stack : undefined,
  });

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR',
    ...(config.env === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;

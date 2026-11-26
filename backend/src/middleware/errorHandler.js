/**
 * Global Error Handler Middleware
 */
const config = require('../config/env');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.code === 'LIMIT_FILE_SIZE' ? 413
    : err.code === 'LIMIT_UNEXPECTED_FILE' ? 400
      : err.statusCode || err.status || (res.statusCode === 200 ? 500 : res.statusCode);
  const isClientError = statusCode >= 400 && statusCode < 500;
  const message = config.env !== 'production' || isClientError
    ? err.message || 'Request failed.'
    : 'Internal Server Error';
  
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, {
    message: err.message,
    stack: config.env === 'development' ? err.stack : undefined,
  });

  res.status(statusCode).json({
    success: false,
    message,
    code: isClientError ? (err.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : err.code || 'REQUEST_ERROR') : 'INTERNAL_ERROR',
    ...(config.env === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;

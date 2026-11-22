/**
 * Health Check Controller
 * Verifies API server status and PostgreSQL database connectivity
 */
const { testConnection } = require('../config/db');

/**
 * GET /api/health
 * Returns service status, system uptime, and PostgreSQL connectivity check
 */
const checkHealth = async (req, res) => {
  const startTime = Date.now();
  const uptimeSeconds = process.uptime();

  try {
    const dbStatus = await testConnection();
    const responseTimeMs = Date.now() - startTime;

    return res.status(200).json({
      status: 'UP',
      service: 'CampusCare Backend API',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptimeSeconds)} seconds`,
      responseTime: `${responseTimeMs}ms`,
      checks: {
        server: {
          status: 'UP',
          nodeVersion: process.version,
          memoryUsage: {
            rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
          },
        },
        database: {
          status: 'UP',
          engine: 'PostgreSQL',
          databaseName: dbStatus.database,
          serverVersion: dbStatus.version,
          serverTimestamp: dbStatus.timestamp,
        },
      },
    });
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    console.error('[Health Check Failed] Database connection error:', error.message);

    return res.status(503).json({
      status: 'DEGRADED',
      service: 'CampusCare Backend API',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptimeSeconds)} seconds`,
      responseTime: `${responseTimeMs}ms`,
      checks: {
        server: {
          status: 'UP',
          nodeVersion: process.version,
        },
        database: {
          status: 'DOWN',
          engine: 'PostgreSQL',
          error: error.message,
          code: error.code || 'ECONNREFUSED',
          hint: 'Verify PostgreSQL service is running and credentials in .env are correct.',
        },
      },
    });
  }
};

module.exports = {
  checkHealth,
};

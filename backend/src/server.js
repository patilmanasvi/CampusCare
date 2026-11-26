/**
 * Server Entrypoint
 * Handles HTTP server boot and graceful lifecycle shutdown
 */
const app = require('./app');
const config = require('./config/env');
const { testConnection, closePool } = require('./config/db');
const { jiraSyncService } = require('./services/jiraSyncService');
const { jiraConfig } = require('./config/jiraConfig');

const PORT = config.port;

const server = app.listen(PORT, async () => {
  console.log('====================================================');
  console.log(` CampusCare Backend Server running on port ${PORT}`);
  console.log(` Environment : ${config.env}`);
  console.log(` Health Check: http://localhost:${PORT}/api/health`);
  console.log('====================================================');

  // Verify PostgreSQL database connectivity on server launch
  try {
    const dbInfo = await testConnection();
    console.log(`[Database Connected] Host: ${config.db.host}:${config.db.port} | DB: ${dbInfo.database}`);
    console.log(`[Database Version]   ${dbInfo.version}`);
  } catch (err) {
    console.warn(`[Database Warning]   Could not connect to PostgreSQL: ${err.message}`);
    console.warn('                     Check your .env settings and ensure PostgreSQL is running.');
  }

  // Launch Jira background sync poller if enabled
  if (jiraConfig.autoStartWorker) {
    jiraSyncService.startWorker(jiraConfig.syncIntervalMs);
  }
});

// Graceful shutdown helper
const handleShutdown = async (signal) => {
  console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);

  server.close(async () => {
    console.log('[Server] HTTP server closed.');
    jiraSyncService.stopWorker();
    await closePool();
    console.log('[Server] Process exited gracefully.');
    process.exit(0);
  });

  // Force close if graceful shutdown hangs
  setTimeout(() => {
    console.error('[Server] Forced shutdown timeout exceeded. Exiting immediately.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection] at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[Uncaught Exception]:', error);
  process.exit(1);
});

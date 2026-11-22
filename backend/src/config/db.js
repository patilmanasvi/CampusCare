/**
 * PostgreSQL Connection Pool Configuration
 * CampusCare IT Support System
 */
const { Pool } = require('pg');
const config = require('./env');

// Instantiate PostgreSQL connection pool
const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: String(config.db.password),
  ssl: config.db.ssl,
  max: config.db.max,
  idleTimeoutMillis: config.db.idleTimeoutMillis,
  connectionTimeoutMillis: config.db.connectionTimeoutMillis,
});

// Pool error handling - prevents process crash on idle client errors
pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error] Unexpected error on idle client:', err.message);
});

/**
 * Execute a query with parameters using a pool client
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters for parameterized execution
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (config.env === 'development') {
      console.log(`[SQL Query] duration: ${duration}ms | rows: ${res.rowCount}`);
    }
    return res;
  } catch (error) {
    console.error(`[SQL Error] Query failed: "${text.substring(0, 100)}..."`, error.message);
    throw error;
  }
};

/**
 * Test PostgreSQL database connectivity and return server metrics
 * @returns {Promise<{connected: boolean, timestamp: string, database: string, version: string}>}
 */
const testConnection = async () => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        NOW() AS server_time,
        current_database() AS database_name,
        version() AS pg_version
    `);
    const row = result.rows[0];
    return {
      connected: true,
      timestamp: row.server_time,
      database: row.database_name,
      version: row.pg_version.split(',')[0], // Clean version string
    };
  } finally {
    client.release();
  }
};

/**
 * Graceful pool shutdown handler
 */
const closePool = async () => {
  console.log('[PostgreSQL] Closing connection pool...');
  try {
    await pool.end();
    console.log('[PostgreSQL] Connection pool has been gracefully drained and closed.');
  } catch (err) {
    console.error('[PostgreSQL] Error during pool drain:', err.message);
  }
};

module.exports = {
  pool,
  query,
  testConnection,
  closePool,
};

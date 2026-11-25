/**
 * CampusCare Dashboard Service
 * High-performance PostgreSQL aggregation queries for teacher & institutional dashboards
 */
const db = require('../config/db');
const { formatTicketListItemDto } = require('./ticketService');

/**
 * Service: Get ticket count summary metrics using single-pass PostgreSQL aggregation
 * Filters by teacher ID so faculty only receive their own metrics
 */
const getSummary = async (userId, userRole = 'TEACHER') => {
  const isAdmin = userRole === 'ADMIN' || userRole === 'TECHNICIAN';

  // Teachers only see their own metrics; Admins see campus-wide metrics
  const whereClause = isAdmin ? '' : 'WHERE reporter_id = $1';
  const params = isAdmin ? [] : [userId];

  const query = `
    SELECT
      COUNT(*)::INT AS total,
      COUNT(*) FILTER (WHERE status IN ('SUBMITTED', 'ACKNOWLEDGED'))::INT AS pending,
      COUNT(*) FILTER (WHERE status IN ('IN_PROGRESS', 'WAITING_FOR_INFO'))::INT AS in_progress,
      COUNT(*) FILTER (WHERE status IN ('AWAITING_VERIFICATION', 'FIXED'))::INT AS awaiting_verification,
      COUNT(*) FILTER (WHERE status = 'CLOSED')::INT AS resolved,
      COUNT(*) FILTER (WHERE status != 'CLOSED')::INT AS open
    FROM tickets
    ${whereClause}
  `;

  const result = await db.query(query, params);
  const row = result.rows[0] || {};

  return {
    total: row.total || 0,
    pending: row.pending || 0,
    inProgress: row.in_progress || 0,
    awaitingVerification: row.awaiting_verification || 0,
    resolved: row.resolved || 0,
    open: row.open || 0,
  };
};

/**
 * Service: Get recent ticket requests submitted by this teacher
 */
const getRecentRequests = async (userId, userRole = 'TEACHER', limit = 5) => {
  const isAdmin = userRole === 'ADMIN' || userRole === 'TECHNICIAN';
  const safeLimit = Math.min(Math.max(1, parseInt(limit, 10) || 5), 50);

  const whereClause = isAdmin ? '' : 'WHERE t.reporter_id = $1';
  const params = isAdmin ? [safeLimit] : [userId, safeLimit];

  const query = `
    SELECT 
      t.id,
      t.ticket_number,
      t.status,
      t.urgency,
      t.description,
      t.remarks,
      t.reporter_id,
      t.category_id,
      t.subcategory_id,
      t.created_at,
      t.updated_at,
      c.name AS category_name,
      c.code AS category_code,
      sc.name AS subcategory_name,
      p.id AS pc_id,
      p.display_code,
      p.pc_number,
      l.lab_name,
      l.room_number,
      b.name AS block_name
    FROM tickets t
    JOIN pcs p ON t.pc_id = p.id
    JOIN labs l ON p.lab_id = l.id
    JOIN blocks b ON l.block_id = b.id
    LEFT JOIN ticket_categories c ON t.category_id = c.id
    LEFT JOIN ticket_categories sc ON t.subcategory_id = sc.id
    ${whereClause}
    ORDER BY t.created_at DESC
    LIMIT $${params.length}
  `;

  const result = await db.query(query, params);
  return result.rows.map((r) => formatTicketListItemDto(r, userId));
};

module.exports = {
  getSummary,
  getRecentRequests,
};

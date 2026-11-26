/**
 * CampusCare PC & Location Repository
 * Direct PostgreSQL data access layer for Blocks, Labs, and PCs
 */
const db = require('../config/db');

/**
 * Fetch all campus blocks
 */
const findAllBlocks = async () => {
  const query = `
    SELECT id, name, description, created_at
    FROM blocks
    ORDER BY name ASC
  `;
  const result = await db.query(query);
  return result.rows;
};

/**
 * Fetch all laboratories, optionally filtered by blockId
 * @param {string|null} blockId
 */
const findAllLabs = async (blockId = null) => {
  const query = `
    SELECT 
      l.id,
      l.block_id,
      l.lab_name,
      l.room_number,
      l.code,
      l.pc_count,
      b.name AS block_name
    FROM labs l
    JOIN blocks b ON l.block_id = b.id
    WHERE ($1::VARCHAR IS NULL OR l.block_id = $1)
    ORDER BY l.room_number ASC
  `;
  const result = await db.query(query, [blockId]);
  return result.rows;
};

/**
 * Fetch a specific laboratory by ID
 * @param {string} labId
 */
const findLabById = async (labId) => {
  const query = `
    SELECT 
      l.id,
      l.block_id,
      l.lab_name,
      l.room_number,
      l.code,
      l.pc_count,
      b.name AS block_name
    FROM labs l
    JOIN blocks b ON l.block_id = b.id
    WHERE l.id = $1
    LIMIT 1
  `;
  const result = await db.query(query, [labId]);
  return result.rows[0] || null;
};

/**
 * Fetch PCs with optional filtering by labId, blockId, or status
 * Note: Never selects qr_token in bulk inventory queries for security
 */
const findAllPcs = async ({ labId = null, blockId = null, status = null } = {}) => {
  const query = `
    SELECT 
      p.id,
      p.lab_id,
      p.pc_number,
      p.asset_id,
      p.display_code,
      p.status,
      p.notice,
      p.can_report,
      p.is_active,
      p.created_at,
      p.updated_at,
      l.lab_name,
      l.room_number,
      b.id AS block_id,
      b.name AS block_name
    FROM pcs p
    JOIN labs l ON p.lab_id = l.id
    JOIN blocks b ON l.block_id = b.id
    WHERE p.is_active = true
      AND ($1::VARCHAR IS NULL OR p.lab_id = $1)
      AND ($2::VARCHAR IS NULL OR l.block_id = $2)
      AND ($3::VARCHAR IS NULL OR p.status = $3)
    ORDER BY l.room_number ASC, p.pc_number ASC
  `;
  const result = await db.query(query, [labId, blockId, status]);
  return result.rows;
};

/**
 * Fetch a single PC by its unique ID
 * @param {string} id
 */
const findPcById = async (id) => {
  const query = `
    SELECT 
      p.id,
      p.lab_id,
      p.pc_number,
      p.asset_id,
      p.display_code,
      p.status,
      p.notice,
      p.can_report,
      p.is_active,
      p.created_at,
      p.updated_at,
      l.lab_name,
      l.room_number,
      b.id AS block_id,
      b.name AS block_name
    FROM pcs p
    JOIN labs l ON p.lab_id = l.id
    JOIN blocks b ON l.block_id = b.id
    WHERE p.id = $1 AND p.is_active = true
    LIMIT 1
  `;
  const result = await db.query(query, [id]);
  return result.rows[0] || null;
};

/**
 * Find PC using secure QR token (for teacher QR scanner)
 * Returns the PC record without leaking the token back in response
 * @param {string} qrToken
 */
const findPcByQrToken = async (qrToken) => {
  const query = `
    SELECT 
      p.id,
      p.lab_id,
      p.pc_number,
      p.asset_id,
      p.display_code,
      p.status,
      p.notice,
      p.can_report,
      p.is_active,
      p.created_at,
      p.updated_at,
      l.lab_name,
      l.room_number,
      b.id AS block_id,
      b.name AS block_name
    FROM pcs p
    JOIN labs l ON p.lab_id = l.id
    JOIN blocks b ON l.block_id = b.id
    WHERE p.qr_token = $1 AND p.is_active = true
    LIMIT 1
  `;
  const result = await db.query(query, [qrToken]);
  return result.rows[0] || null;
};

/**
 * Fetch active (non-closed) tickets for a specific PC
 * @param {string} pcId
 */
const findActiveTicketsByPcId = async (pcId) => {
  const query = `
    SELECT 
      t.id,
      t.status,
      t.urgency,
      t.description,
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
    WHERE t.pc_id = $1
      AND t.status NOT IN ('CLOSED')
    ORDER BY t.created_at DESC
  `;
  const result = await db.query(query, [pcId]);
  return result.rows;
};

module.exports = {
  findAllBlocks,
  findAllLabs,
  findLabById,
  findAllPcs,
  findPcById,
  findPcByQrToken,
  findActiveTicketsByPcId,
};

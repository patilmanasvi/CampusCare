/**
 * CampusCare Upload Service
 * Manages attachment persistence in PostgreSQL and guarantees cleanup of orphaned files on failure
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../config/db');

/**
 * Saves uploaded file metadata into PostgreSQL
 * Guarantees atomic cleanup of the physical file if database insertion fails
 */
const saveAttachment = async ({
  file,
  uploaderId,
}) => {
  const attachmentId = `att-${crypto.randomUUID()}`;

  const query = `
    INSERT INTO attachments (
      id,
      ticket_id,
      comment_id,
      uploader_id,
      file_name,
      original_name,
      mime_type,
      file_size,
      file_path
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;

  try {
    const result = await db.query(query, [
      attachmentId,
      null,
      null,
      uploaderId,
      file.filename,
      path.basename(file.originalname),
      file.mimetype,
      file.size,
      file.path,
    ]);

    const row = result.rows[0];

    return {
      id: row.id,
      name: row.original_name,
      originalName: row.original_name,
      mimeType: row.mime_type,
      size: Number(row.file_size),
      url: `/api/uploads/${row.id}`,
      createdAt: row.created_at,
    };
  } catch (error) {
    // CRITICAL: Clean up orphaned file on disk when database insert fails
    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
        console.warn(`[Upload Service] Cleaned up orphaned file: ${file.path}`);
      }
    } catch (cleanupErr) {
      console.error(`[Upload Service] Failed to unlink file ${file.path}:`, cleanupErr);
    }
    throw error;
  }
};

/**
 * Retrieves attachment metadata by ID
 */
const getAttachmentById = async (attachmentId) => {
  const query = `
    SELECT 
      a.*,
      t.reporter_id AS ticket_reporter_id
    FROM attachments a
    LEFT JOIN tickets t ON a.ticket_id = t.id
    WHERE a.id = $1
    LIMIT 1
  `;

  const result = await db.query(query, [attachmentId]);
  return result.rows[0] || null;
};

module.exports = {
  saveAttachment,
  getAttachmentById,
};

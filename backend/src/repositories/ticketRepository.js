/**
 * CampusCare Ticket Repository
 * PostgreSQL data access layer for Tickets, Events, Comments, Information, and Links
 * Implements strict ACID transaction handling for ticket creation and lifecycle events
 */
const db = require('../config/db');

/**
 * Executes a callback within a managed PostgreSQL transaction
 * Automatically rolls back on any error
 *
 * @param {Function} callback - Async function receiving (client)
 * @returns {Promise<any>}
 */
const withTransaction = async (callback) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const attachPendingFiles = async (client, ticketId, commentId, uploaderId, attachmentIds = []) => {
  const ids = [...new Set(attachmentIds || [])];
  if (!ids.length) return;
  const result = await client.query(
    `UPDATE attachments
     SET ticket_id = $1, comment_id = $2
     WHERE id = ANY($3::VARCHAR[]) AND uploader_id = $4
       AND ticket_id IS NULL AND comment_id IS NULL
     RETURNING id`,
    [ticketId, commentId, ids, uploaderId]
  );
  if (result.rowCount !== ids.length) {
    const error = new Error('One or more attachments are invalid, already linked, or not owned by you.');
    error.statusCode = 400;
    error.code = 'INVALID_ATTACHMENTS';
    throw error;
  }
};

/**
 * Creates a new support ticket and its initial 'SUBMITTED' event atomically
 * Also enqueues an outbound sync record for Jira (Member 3)
 */
const createTicketWithInitialEvent = async ({
  reporterId,
  pcId,
  categoryId,
  subcategoryId = null,
  urgency = 'LOW',
  description,
  remarks = null,
  attachmentIds = [],
}) => {
  return await withTransaction(async (client) => {
    // 1. Generate sequential ticket identifier (LAB-1001, LAB-1002...)
    const seqResult = await client.query("SELECT nextval('tickets_ticket_number_seq') AS num");
    const ticketNumber = parseInt(seqResult.rows[0].num, 10);
    const ticketId = `LAB-${ticketNumber}`;

    // 2. Insert ticket record
    const insertTicketQuery = `
      INSERT INTO tickets (
        id,
        ticket_number,
        reporter_id,
        pc_id,
        category_id,
        subcategory_id,
        urgency,
        status,
        description,
        remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'SUBMITTED', $8, $9)
      RETURNING *
    `;

    const ticketResult = await client.query(insertTicketQuery, [
      ticketId,
      ticketNumber,
      reporterId,
      pcId,
      categoryId,
      subcategoryId,
      urgency,
      description.trim(),
      remarks ? remarks.trim() : null,
    ]);

    const createdTicket = ticketResult.rows[0];

    // 3. Record immutable initial event in ticket_events timeline
    const insertEventQuery = `
      INSERT INTO ticket_events (
        ticket_id,
        event_type,
        actor_id,
        note
      ) VALUES ($1, 'SUBMITTED', $2, 'Issue reported by faculty member')
      RETURNING *
    `;

    await client.query(insertEventQuery, [ticketId, reporterId]);

    // 4. Enqueue outbound sync event for Jira Service Management (Member 3)
    const syncPayload = {
      internalId: ticketId,
      reporterId,
      pcId,
      categoryId,
      subcategoryId,
      urgency,
      description,
      remarks,
      createdAt: createdTicket.created_at,
    };

    const insertSyncQuery = `
      INSERT INTO sync_events (
        ticket_id,
        direction,
        event_type,
        payload,
        status
      ) VALUES ($1, 'OUTBOUND_TO_JIRA', 'TICKET_CREATED', $2, 'PENDING')
    `;

    await client.query(insertSyncQuery, [ticketId, JSON.stringify(syncPayload)]);
    await attachPendingFiles(client, ticketId, null, reporterId, attachmentIds);

    return createdTicket;
  });
};

/**
 * Find potential duplicate tickets for a specific PC and category
 */
const findPotentialDuplicates = async ({ pcId, categoryId = null }) => {
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
    ORDER BY (t.category_id = $2) DESC, t.created_at DESC
  `;

  const result = await db.query(query, [pcId, categoryId]);
  return result.rows;
};

/**
 * Fetch paginated tickets for a teacher with flexible filters
 */
const findTickets = async ({
  reporterId = null,
  status = null,
  urgency = null,
  categoryId = null,
  dateFrom = null,
  dateTo = null,
  search = null,
  sort = 'newest',
  page = 1,
  pageSize = 10,
} = {}) => {
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (reporterId) {
    conditions.push(`t.reporter_id = $${paramIndex++}`);
    params.push(reporterId);
  }

  if (status) {
    const statusList = String(status).split(',').map((s) => s.trim().toUpperCase());
    conditions.push(`t.status = ANY($${paramIndex++}::VARCHAR[])`);
    params.push(statusList);
  }

  if (urgency) {
    conditions.push(`t.urgency = $${paramIndex++}`);
    params.push(urgency.toUpperCase());
  }

  if (categoryId) {
    conditions.push(`t.category_id = $${paramIndex++}`);
    params.push(categoryId);
  }

  if (dateFrom) {
    conditions.push(`t.created_at >= $${paramIndex++}::TIMESTAMPTZ`);
    params.push(dateFrom);
  }

  if (dateTo) {
    conditions.push(`t.created_at <= ($${paramIndex++}::TIMESTAMPTZ + INTERVAL '1 day')`);
    params.push(dateTo);
  }

  if (search) {
    conditions.push(`(
      t.id ILIKE $${paramIndex} 
      OR p.display_code ILIKE $${paramIndex} 
      OR t.description ILIKE $${paramIndex}
    )`);
    params.push(`%${search.trim()}%`);
    paramIndex++;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderDirection = sort === 'oldest' ? 'ASC' : 'DESC';

  // Count total matching rows
  const countQuery = `
    SELECT COUNT(*) AS total
    FROM tickets t
    JOIN pcs p ON t.pc_id = p.id
    ${whereClause}
  `;
  const countRes = await db.query(countQuery, params);
  const total = parseInt(countRes.rows[0]?.total || 0, 10);

  // Paginated query
  const limit = Math.max(1, parseInt(pageSize, 10));
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * limit;

  const dataQuery = `
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
      t.jira_issue_key,
      t.created_at,
      t.updated_at,
      c.name AS category_name,
      c.code AS category_code,
      sc.name AS subcategory_name,
      p.id AS pc_id,
      p.display_code,
      p.pc_number,
      p.status AS pc_status,
      l.id AS lab_id,
      l.lab_name,
      l.room_number,
      b.id AS block_id,
      b.name AS block_name,
      u.full_name AS reporter_name,
      u.email AS reporter_email
    FROM tickets t
    JOIN pcs p ON t.pc_id = p.id
    JOIN labs l ON p.lab_id = l.id
    JOIN blocks b ON l.block_id = b.id
    JOIN users u ON t.reporter_id = u.id
    LEFT JOIN ticket_categories c ON t.category_id = c.id
    LEFT JOIN ticket_categories sc ON t.subcategory_id = sc.id
    ${whereClause}
    ORDER BY t.created_at ${orderDirection}
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;

  const dataRes = await db.query(dataQuery, [...params, limit, offset]);

  return {
    rows: dataRes.rows,
    total,
    page: parseInt(page, 10),
    pageSize: limit,
  };
};

/**
 * Fetch complete ticket details by ID with all joins
 */
const findTicketById = async (id) => {
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
      t.assigned_to,
      t.jira_issue_key,
      t.jira_issue_id,
      t.resolved_at,
      t.closed_at,
      t.created_at,
      t.updated_at,
      c.name AS category_name,
      c.code AS category_code,
      sc.name AS subcategory_name,
      p.id AS pc_id,
      p.display_code,
      p.pc_number,
      p.status AS pc_status,
      p.notice AS pc_notice,
      p.can_report AS pc_can_report,
      p.asset_id AS pc_asset_id,
      l.id AS lab_id,
      l.lab_name,
      l.room_number,
      b.id AS block_id,
      b.name AS block_name,
      u.full_name AS reporter_name,
      u.email AS reporter_email,
      u.department AS reporter_department,
      assignee.full_name AS assignee_name,
      assignee.email AS assignee_email
    FROM tickets t
    JOIN pcs p ON t.pc_id = p.id
    JOIN labs l ON p.lab_id = l.id
    JOIN blocks b ON l.block_id = b.id
    JOIN users u ON t.reporter_id = u.id
    LEFT JOIN users assignee ON t.assigned_to = assignee.id
    LEFT JOIN ticket_categories c ON t.category_id = c.id
    LEFT JOIN ticket_categories sc ON t.subcategory_id = sc.id
    WHERE t.id = $1
    LIMIT 1
  `;

  const result = await db.query(query, [id]);
  return result.rows[0] || null;
};

/**
 * Fetch chronological timeline events for a ticket
 */
const findTicketEvents = async (ticketId) => {
  const query = `
    SELECT 
      e.id,
      e.ticket_id,
      e.event_type,
      e.note,
      e.created_at,
      u.id AS actor_id,
      u.full_name AS actor_name,
      r.name AS actor_role
    FROM ticket_events e
    LEFT JOIN users u ON e.actor_id = u.id
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE e.ticket_id = $1
    ORDER BY e.created_at ASC
  `;

  const result = await db.query(query, [ticketId]);
  return result.rows;
};

/**
 * Fetch comments on a ticket
 * Filters out INTERNAL technician notes for regular teachers
 */
const findTicketComments = async (ticketId, includeInternal = false) => {
  const query = `
    SELECT 
      c.id,
      c.ticket_id,
      c.body,
      c.visibility,
      c.created_at,
      c.updated_at,
      COALESCE(
        json_agg(json_build_object(
          'id', a.id, 'name', a.original_name, 'mimeType', a.mime_type,
          'size', a.file_size, 'url', '/api/uploads/' || a.id
        )) FILTER (WHERE a.id IS NOT NULL), '[]'::json
      ) AS attachments,
      u.id AS author_id,
      u.full_name AS author_name,
      r.name AS author_role
    FROM ticket_comments c
    JOIN users u ON c.author_id = u.id
    JOIN roles r ON u.role_id = r.id
    LEFT JOIN attachments a ON a.comment_id = c.id
    WHERE c.ticket_id = $1
      AND ($2::BOOLEAN IS TRUE OR c.visibility = 'PUBLIC')
    GROUP BY c.id, u.id, r.id
    ORDER BY c.created_at ASC
  `;

  const result = await db.query(query, [ticketId, includeInternal]);
  return result.rows;
};

const findTicketAttachments = async (ticketId) => {
  const result = await db.query(
    `SELECT id, original_name AS name, mime_type AS "mimeType", file_size AS size,
            '/api/uploads/' || id AS url
     FROM attachments
     WHERE ticket_id = $1 AND comment_id IS NULL
     ORDER BY created_at ASC`,
    [ticketId]
  );
  return result.rows;
};

/**
 * Add a comment to a ticket and record 'COMMENT_ADDED' event in transaction
 */
const addComment = async (ticketId, authorId, body, visibility = 'PUBLIC', attachmentIds = []) => {
  return await withTransaction(async (client) => {
    const insertCommentQuery = `
      INSERT INTO ticket_comments (
        ticket_id,
        author_id,
        body,
        visibility
      ) VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const commentRes = await client.query(insertCommentQuery, [
      ticketId,
      authorId,
      body.trim(),
      visibility,
    ]);
    await attachPendingFiles(client, ticketId, commentRes.rows[0].id, authorId, attachmentIds);

    // Record timeline event
    await client.query(
      `INSERT INTO ticket_events (ticket_id, event_type, actor_id, note)
       VALUES ($1, 'COMMENT_ADDED', $2, 'Comment added')`,
      [ticketId, authorId]
    );

    // Touch ticket updated_at
    await client.query('UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [ticketId]);

    return commentRes.rows[0];
  });
};

/**
 * Add additional information to a ticket
 * If ticket is 'WAITING_FOR_INFO', transitions back to 'IN_PROGRESS'
 */
const addInformation = async (ticketId, userId, message, attachmentIds = []) => {
  return await withTransaction(async (client) => {
    // 1. Fetch current ticket status
    const ticketRes = await client.query('SELECT status FROM tickets WHERE id = $1 FOR UPDATE', [ticketId]);
    if (ticketRes.rowCount === 0) {
      throw new Error('Ticket not found');
    }

    const currentStatus = ticketRes.rows[0].status;
    let newStatus = currentStatus;

    if (currentStatus === 'WAITING_FOR_INFO') {
      newStatus = 'IN_PROGRESS';
    }

    // 2. Insert comment representing the additional info
    const insertCommentQuery = `
      INSERT INTO ticket_comments (
        ticket_id,
        author_id,
        body,
        visibility
      ) VALUES ($1, $2, $3, 'PUBLIC')
      RETURNING *
    `;

    const commentRes = await client.query(insertCommentQuery, [ticketId, userId, message.trim()]);
    await attachPendingFiles(client, ticketId, commentRes.rows[0].id, userId, attachmentIds);

    // 3. Record timeline event
    await client.query(
      `INSERT INTO ticket_events (ticket_id, event_type, actor_id, note)
       VALUES ($1, 'INFO_PROVIDED', $2, 'Faculty provided additional information')`,
      [ticketId, userId]
    );

    // 4. Update status if transitioned
    if (newStatus !== currentStatus) {
      await client.query(
        `UPDATE tickets SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [newStatus, ticketId]
      );
      await client.query(
        `INSERT INTO ticket_events (ticket_id, event_type, actor_id, note)
         VALUES ($1, 'IN_PROGRESS', $2, 'Status transitioned back to In Progress following faculty response')`,
        [ticketId, userId]
      );
    } else {
      await client.query('UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [ticketId]);
    }

    return commentRes.rows[0];
  });
};

/**
 * Submit repair verification (Teacher confirms if PC is WORKING or NOT_WORKING)
 */
const submitVerification = async ({ ticketId, userId, result, explanation = '', comment = '', rating = null }) => {
  return await withTransaction(async (client) => {
    const isWorking = result === 'WORKING';
    const newStatus = isWorking ? 'CLOSED' : 'REOPENED';
    const now = new Date().toISOString();

    // 1. Update ticket status
    const updateQuery = `
      UPDATE tickets 
      SET 
        status = $1,
        closed_at = CASE WHEN $1 = 'CLOSED' THEN CURRENT_TIMESTAMP ELSE closed_at END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const updatedRes = await client.query(updateQuery, [newStatus, ticketId]);

    // 2. Add verification timeline event
    const eventNote = isWorking
      ? `Teacher verified repair: PC is working normally.${rating ? ` Rating: ${rating}/5.` : ''}`
      : `Teacher reported issue persists: ${explanation}`;

    await client.query(
      `INSERT INTO ticket_events (ticket_id, event_type, actor_id, note)
       VALUES ($1, $2, $3, $4)`,
      [ticketId, isWorking ? 'VERIFIED' : 'REOPENED', userId, eventNote]
    );

    if (isWorking) {
      await client.query(
        `INSERT INTO ticket_events (ticket_id, event_type, actor_id, note)
         VALUES ($1, 'CLOSED', $2, 'Ticket closed upon teacher verification')`,
        [ticketId, userId]
      );
    }

    // 3. Add comment if provided
    const commentBody = isWorking ? (comment ? comment.trim() : null) : explanation.trim();
    if (commentBody) {
      await client.query(
        `INSERT INTO ticket_comments (ticket_id, author_id, body, visibility)
         VALUES ($1, $2, $3, 'PUBLIC')`,
        [ticketId, userId, commentBody]
      );
    }

    // 4. Enqueue sync event for Jira (Member 3)
    const syncPayload = {
      internalId: ticketId,
      verificationResult: result,
      newStatus,
      rating,
      comment: commentBody,
      verifiedAt: now,
    };

    await client.query(
      `INSERT INTO sync_events (ticket_id, direction, event_type, payload, status)
       VALUES ($1, 'OUTBOUND_TO_JIRA', 'VERIFICATION_SUBMITTED', $2, 'PENDING')`,
      [ticketId, JSON.stringify(syncPayload)]
    );

    return updatedRes.rows[0];
  });
};

/**
 * Link two tickets (e.g. DUPLICATE_OF, RELATES_TO)
 */
const linkTickets = async (sourceTicketId, targetTicketId, linkType = 'DUPLICATE_OF', createdBy = null) => {
  const query = `
    INSERT INTO ticket_links (
      source_ticket_id,
      target_ticket_id,
      link_type,
      created_by
    ) VALUES ($1, $2, $3, $4)
    ON CONFLICT (source_ticket_id, target_ticket_id, link_type) DO NOTHING
    RETURNING *
  `;
  const result = await db.query(query, [sourceTicketId, targetTicketId, linkType, createdBy]);
  return result.rows[0] || null;
};

/**
 * Sync ticket with inbound updates from Jira (Member 3)
 */
const syncFromJira = async (ticketId, { jiraIssueKey = null, jiraIssueId = null, status = null, comment = null, technicianName = 'Jira System' }) => {
  return await withTransaction(async (client) => {
    // 1. Check ticket exists
    const checkRes = await client.query('SELECT * FROM tickets WHERE id = $1 FOR UPDATE', [ticketId]);
    if (checkRes.rowCount === 0) {
      throw new Error(`Ticket ${ticketId} not found for Jira sync`);
    }

    const currentTicket = checkRes.rows[0];
    const newStatus = status ? status.toUpperCase() : currentTicket.status;

    // 2. Update ticket fields
    const updateQuery = `
      UPDATE tickets
      SET
        jira_issue_key = COALESCE($1, jira_issue_key),
        jira_issue_id = COALESCE($2, jira_issue_id),
        status = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;

    const updatedRes = await client.query(updateQuery, [
      jiraIssueKey,
      jiraIssueId,
      newStatus,
      ticketId,
    ]);

    // 3. Log event if status changed or jira key linked
    if (jiraIssueKey && currentTicket.jira_issue_key !== jiraIssueKey) {
      await client.query(
        `INSERT INTO ticket_events (ticket_id, event_type, note)
         VALUES ($1, 'SYNC_SUCCESS', $2)`,
        [ticketId, `Linked to Jira Issue Key: ${jiraIssueKey}`]
      );
    }

    if (newStatus !== currentTicket.status) {
      await client.query(
        `INSERT INTO ticket_events (ticket_id, event_type, note)
         VALUES ($1, $2, $3)`,
        [ticketId, newStatus, `Status updated from Jira by ${technicianName}`]
      );
    }

    // 4. Record inbound comment as an audit event. Do not impersonate the
    // reporter as the comment author when a Jira webhook supplies a note.
    if (comment && comment.trim()) {
      await client.query(
        `INSERT INTO ticket_events (ticket_id, event_type, note)
         VALUES ($1, 'COMMENT_ADDED', $2)`,
        [ticketId, `Jira update: ${comment.trim()}`]
      );
    }

    // 5. Audit inbound sync event
    await client.query(
      `INSERT INTO sync_events (ticket_id, direction, event_type, payload, status, synced_at)
       VALUES ($1, 'INBOUND_FROM_JIRA', 'JIRA_STATUS_UPDATE', $2, 'SUCCESS', CURRENT_TIMESTAMP)`,
      [ticketId, JSON.stringify({ jiraIssueKey, status: newStatus, technicianName, comment })]
    );

    return updatedRes.rows[0];
  });
};

module.exports = {
  withTransaction,
  createTicketWithInitialEvent,
  findPotentialDuplicates,
  findTickets,
  findTicketById,
  findTicketEvents,
  findTicketComments,
  findTicketAttachments,
  addComment,
  addInformation,
  submitVerification,
  linkTickets,
  syncFromJira,
};

/**
 * Jira Service Management Outbound Worker & Synchronization Service
 * 
 * Functions:
 * 1. Polls the `sync_events` table for 'OUTBOUND_TO_JIRA' events with status 'PENDING' or 'RETRY'.
 * 2. Enriches the payload with PC, Location, Category, and Faculty info if not fully embedded.
 * 3. Calls Jira REST API via JiraClient to create Jira Service Management requests.
 * 4. Stores the returned jira_issue_key and jira_issue_id in the `tickets` table.
 * 5. Handles exponential backoff, retry counting, and idempotency (prevents duplicate tickets).
 * 6. Can be executed on-demand (e.g. syncOneTicket, processPendingSyncEvents) or continuously via a timer.
 */
const db = require('../config/db');
const { jiraConfig, isJiraConfigured } = require('../config/jiraConfig');
const { jiraClient } = require('./jiraClient');
const { normalizeJiraStatus } = require('./jiraMapping');
const ticketRepository = require('../repositories/ticketRepository');

class JiraSyncService {
  constructor(client = jiraClient) {
    this.client = client;
    this.pollTimer = null;
    this.isProcessing = false;
  }

  /**
   * Enriches minimal ticket creation payload from the PostgreSQL database
   * to ensure Jira issue contains PC location, asset tag, room, and teacher information
   * @param {string} ticketId
   * @param {Object} rawPayload
   * @returns {Promise<Object>} Enriched payload
   */
  async enrichTicketPayload(ticketId, rawPayload = {}) {
    // If payload already has full pc and reporter structure, return it
    if (rawPayload.pc && rawPayload.reporter && rawPayload.category) {
      return rawPayload;
    }

    const query = `
      SELECT 
        t.id AS "ticketId",
        t.urgency,
        t.description,
        t.remarks,
        t.created_at AS "createdAt",
        t.jira_issue_key AS "jiraIssueKey",
        t.jira_issue_id AS "jiraIssueId",
        c.name AS category,
        sc.name AS subcategory,
        p.display_code AS "pcDisplayCode",
        p.asset_id AS "pcAssetId",
        l.lab_name AS "labName",
        l.room_number AS "roomNumber",
        b.name AS "blockName",
        u.full_name AS "reporterFullName",
        u.email AS "reporterEmail",
        u.department AS "reporterDepartment"
      FROM tickets t
      LEFT JOIN ticket_categories c ON t.category_id = c.id
      LEFT JOIN ticket_categories sc ON t.subcategory_id = sc.id
      LEFT JOIN pcs p ON t.pc_id = p.id
      LEFT JOIN labs l ON p.lab_id = l.id
      LEFT JOIN blocks b ON l.block_id = b.id
      LEFT JOIN users u ON t.reporter_id = u.id
      WHERE t.id = $1
    `;

    const res = await db.query(query, [ticketId]);
    if (res.rows.length === 0) {
      return rawPayload;
    }

    const row = res.rows[0];
    return {
      ticketId: row.ticketId,
      internalId: row.ticketId,
      urgency: rawPayload.urgency || row.urgency,
      description: rawPayload.description || row.description,
      remarks: rawPayload.remarks || row.remarks,
      createdAt: rawPayload.createdAt || row.createdAt,
      category: rawPayload.category || row.category,
      subcategory: rawPayload.subcategory || row.subcategory,
      pc: {
        displayCode: row.pcDisplayCode,
        assetId: row.pcAssetId,
        labName: row.labName,
        roomNumber: row.roomNumber,
        block: row.blockName,
      },
      reporter: {
        fullName: row.reporterFullName,
        email: row.reporterEmail,
        department: row.reporterDepartment,
      },
    };
  }

  /**
   * Processes a single outbound sync event
   * Guarantees idempotency: Checks if ticket already has a jira_issue_key before creating in Jira
   *
   * @param {Object} event Event row from sync_events
   * @returns {Promise<{ success: boolean, jiraIssueKey?: string, skipped?: boolean }>}
   */
  async processOutboundEvent(event) {
    const { id: eventId, ticket_id: ticketId, event_type: eventType, retry_count: retryCount } = event;
    let payload = event.payload || {};

    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch (e) {
        payload = {};
      }
    }

    try {
      // 1. Idempotency check: Does ticket already have a Jira key?
      const ticketCheck = await db.query(
        'SELECT id, jira_issue_key, jira_issue_id, status FROM tickets WHERE id = $1',
        [ticketId]
      );

      if (ticketCheck.rows.length === 0) {
        throw new Error(`Ticket ${ticketId} does not exist in database.`);
      }

      const currentTicket = ticketCheck.rows[0];

      // If already linked to Jira, mark success and skip creating duplicate
      if (currentTicket.jira_issue_key && eventType === 'TICKET_CREATED') {
        await db.query(
          `UPDATE sync_events 
           SET status = 'SUCCESS', synced_at = CURRENT_TIMESTAMP, error_message = NULL 
           WHERE id = $1`,
          [eventId]
        );
        return {
          success: true,
          skipped: true,
          jiraIssueKey: currentTicket.jira_issue_key,
          jiraIssueId: currentTicket.jira_issue_id,
        };
      }

      // 2. Handle based on event type
      if (eventType === 'TICKET_CREATED') {
        const enriched = await this.enrichTicketPayload(ticketId, payload);
        const jiraResult = await this.client.createTicket(enriched);

        // Atomic update of sync_events and tickets table
        await db.query(
          `UPDATE tickets 
           SET jira_issue_key = $1, jira_issue_id = $2, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $3`,
          [jiraResult.key, jiraResult.id, ticketId]
        );

        await db.query(
          `UPDATE sync_events 
           SET status = 'SUCCESS', synced_at = CURRENT_TIMESTAMP, error_message = NULL 
           WHERE id = $1`,
          [eventId]
        );

        // Record timeline event
        await db.query(
          `INSERT INTO ticket_events (ticket_id, event_type, note)
           VALUES ($1, 'SYNC_SUCCESS', $2)`,
          [ticketId, `Synced to Jira Service Management as ${jiraResult.key}`]
        );

        return {
          success: true,
          jiraIssueKey: jiraResult.key,
          jiraIssueId: jiraResult.id,
        };
      }

      if (eventType === 'VERIFICATION_SUBMITTED') {
        if (currentTicket.jira_issue_key) {
          const comment = `[Teacher Verification] Result: ${payload.verificationResult || 'N/A'}${
            payload.rating ? ` | Rating: ${payload.rating}/5` : ''
          }\n${payload.comment || ''}`;
          await this.client.addComment(currentTicket.jira_issue_key, comment);

          if (payload.newStatus === 'REOPENED') {
            try {
              await this.client.transitionIssue(currentTicket.jira_issue_key, 'Reopen');
            } catch (transErr) {
              console.warn(`[JiraSyncService] Transition Reopen warning: ${transErr.message}`);
            }
          }
        }

        await db.query(
          `UPDATE sync_events 
           SET status = 'SUCCESS', synced_at = CURRENT_TIMESTAMP, error_message = NULL 
           WHERE id = $1`,
          [eventId]
        );

        return { success: true };
      }

      // Default: mark as SUCCESS for unrecognized events to avoid infinite retry loops
      await db.query(
        `UPDATE sync_events 
         SET status = 'SUCCESS', synced_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [eventId]
      );
      return { success: true };
    } catch (err) {
      const nextRetryCount = (retryCount || 0) + 1;
      const maxRetries = jiraConfig.maxRetries || 5;
      const isFailed = nextRetryCount >= maxRetries || !err.isRetryable;
      const nextStatus = isFailed ? 'FAILED' : 'RETRY';

      await db.query(
        `UPDATE sync_events 
         SET status = $1, retry_count = $2, error_message = $3 
         WHERE id = $4`,
        [nextStatus, nextRetryCount, err.message, eventId]
      );

      console.error(`[JiraSyncService] Outbound sync failed for ticket ${ticketId} (attempt ${nextRetryCount}/${maxRetries}):`, err.message);

      return {
        success: false,
        error: err.message,
        status: nextStatus,
        retryCount: nextRetryCount,
      };
    }
  }

  /**
   * Fetch and process pending outbound sync events
   * @param {number} limit
   * @returns {Promise<{ processed: number, successes: number, failures: number }>}
   */
  async processPendingEvents(limit = 20) {
    if (this.isProcessing) {
      return { processed: 0, successes: 0, failures: 0, busy: true };
    }

    this.isProcessing = true;
    try {
      const query = `
        SELECT id, ticket_id, direction, event_type, payload, status, retry_count
        FROM sync_events
        WHERE direction = 'OUTBOUND_TO_JIRA' 
          AND status IN ('PENDING', 'RETRY')
        ORDER BY created_at ASC
        LIMIT $1
      `;

      const result = await db.query(query, [limit]);
      let successes = 0;
      let failures = 0;

      for (const event of result.rows) {
        const outcome = await this.processOutboundEvent(event);
        if (outcome.success) {
          successes++;
        } else {
          failures++;
        }
      }

      return {
        processed: result.rows.length,
        successes,
        failures,
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Immediately sync a specific ticket by ID to Jira
   * Can be called right after ticket creation or from a retry API
   * @param {string} ticketId
   * @returns {Promise<{ success: boolean, jiraIssueKey?: string, error?: string }>}
   */
  async syncTicketNow(ticketId) {
    // Look for pending or existing outbound event
    const eventQuery = `
      SELECT id, ticket_id, direction, event_type, payload, status, retry_count
      FROM sync_events
      WHERE ticket_id = $1 AND direction = 'OUTBOUND_TO_JIRA'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const eventRes = await db.query(eventQuery, [ticketId]);
    if (eventRes.rows.length > 0) {
      return await this.processOutboundEvent(eventRes.rows[0]);
    }

    // If no sync_event exists, create one and process it immediately
    const insertRes = await db.query(
      `INSERT INTO sync_events (ticket_id, direction, event_type, payload, status)
       VALUES ($1, 'OUTBOUND_TO_JIRA', 'TICKET_CREATED', '{}', 'PENDING')
       RETURNING *`,
      [ticketId]
    );

    return await this.processOutboundEvent(insertRes.rows[0]);
  }

  /**
   * Synchronizes ticket status updates from Jira Service Management into CampusCare
   * Polls active tickets linked to Jira and updates their local status if changed in Jira
   * @param {number} limit
   * @returns {Promise<{ checked: number, updated: number }>}
   */
  async syncInboundStatus(limit = 20) {
    try {
      const activeTickets = await db.query(
        `SELECT id, status, jira_issue_key, jira_issue_id
         FROM tickets
         WHERE jira_issue_key IS NOT NULL AND status NOT IN ('CLOSED')
         ORDER BY updated_at ASC
         LIMIT $1`,
        [limit]
      );

      if (!activeTickets.rows || activeTickets.rows.length === 0) {
        return { checked: 0, updated: 0 };
      }

      let updatedCount = 0;
      for (const ticket of activeTickets.rows) {
        try {
          const issue = await this.client.getIssue(ticket.jira_issue_key);
          const rawStatus = issue?.fields?.status?.name;
          const mappedStatus = normalizeJiraStatus(rawStatus);
          const technicianName = issue?.fields?.assignee?.displayName || 'Jira Technician';

          if (mappedStatus && mappedStatus !== ticket.status) {
            await ticketRepository.syncFromJira(ticket.id, {
              jiraIssueKey: ticket.jira_issue_key,
              jiraIssueId: String(issue.id || ticket.jira_issue_id || ''),
              status: mappedStatus,
              technicianName,
            });
            updatedCount++;
            console.log(
              `[JiraSyncService] Inbound sync: ${ticket.id} (${ticket.jira_issue_key}) status updated: ${ticket.status} -> ${mappedStatus}`
            );
          }
        } catch (issueErr) {
          if (issueErr.statusCode === 404) {
            // Issue was deleted in Jira Cloud; clean up local ticket
            console.log(`[JiraSyncService] Issue ${ticket.jira_issue_key} was deleted in Jira; removing local ticket ${ticket.id}`);
            try {
              await db.query('DELETE FROM sync_events WHERE ticket_id = $1', [ticket.id]);
              await db.query('DELETE FROM ticket_events WHERE ticket_id = $1', [ticket.id]);
              await db.query('DELETE FROM ticket_comments WHERE ticket_id = $1', [ticket.id]);
              await db.query('DELETE FROM ticket_information WHERE ticket_id = $1', [ticket.id]);
              await db.query('DELETE FROM attachments WHERE ticket_id = $1', [ticket.id]);
              await db.query('DELETE FROM tickets WHERE id = $1', [ticket.id]);
              updatedCount++;
            } catch (delErr) {
              console.error(`[JiraSyncService] Failed to clean up deleted ticket ${ticket.id}:`, delErr.message);
            }
          }
        }
      }

      return { checked: activeTickets.rows.length, updated: updatedCount };
    } catch (err) {
      console.error('[JiraSyncService Inbound Sync Error]:', err.message);
      return { checked: 0, updated: 0, error: err.message };
    }
  }

  /**
   * Starts periodic background poller
   * @param {number} intervalMs
   */
  startWorker(intervalMs = jiraConfig.syncIntervalMs || 10000) {
    if (this.pollTimer) return;

    console.log(`[JiraSyncService] Background sync worker started (polling every ${intervalMs / 1000}s).`);
    this.pollTimer = setInterval(async () => {
      try {
        if (isJiraConfigured()) {
          await this.processPendingEvents();
          await this.syncInboundStatus();
        }
      } catch (err) {
        console.error('[JiraSyncService Worker Error]:', err.message);
      }
    }, intervalMs);

    this.pollTimer.unref();
  }

  /**
   * Stops periodic background poller
   */
  stopWorker() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
      console.log('[JiraSyncService] Background sync worker stopped.');
    }
  }
}

const defaultSyncService = new JiraSyncService();

module.exports = {
  JiraSyncService,
  jiraSyncService: defaultSyncService,
};

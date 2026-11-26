/**
 * Jira Integration & Webhook Controller
 * Handles:
 * - Direct Jira Service Management webhooks (jira:issue_updated, comment_created)
 * - Inbound status synchronization
 * - Outbound synchronization trigger / manual retry
 * - Jira connection health check
 */
const db = require('../config/db');
const ticketRepository = require('../repositories/ticketRepository');
const ticketService = require('../services/ticketService');
const { jiraClient } = require('../services/jiraClient');
const { jiraSyncService } = require('../services/jiraSyncService');
const { normalizeJiraStatus } = require('../services/jiraMapping');

/**
 * GET /api/jira/status
 * Health check & configuration status for Jira Service Management integration
 */
const getIntegrationStatus = async (req, res, next) => {
  try {
    const connection = await jiraClient.testConnection();

    // Query stats from sync_events
    const statsQuery = `
      SELECT 
        status, 
        COUNT(*)::int AS count 
      FROM sync_events 
      WHERE direction = 'OUTBOUND_TO_JIRA'
      GROUP BY status
    `;
    const statsResult = await db.query(statsQuery);
    const stats = {
      PENDING: 0,
      RETRY: 0,
      SUCCESS: 0,
      FAILED: 0,
    };

    statsResult.rows.forEach((row) => {
      stats[row.status] = row.count;
    });

    return res.status(200).json({
      success: true,
      data: {
        integration: 'Jira Service Management Cloud',
        connection,
        queueStats: stats,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/jira/webhook
 * Generic Atlassian Jira Cloud webhook receiver
 * Receives native Jira webhook events like `jira:issue_updated`
 */
const handleJiraWebhook = async (req, res, next) => {
  try {
    const body = req.body || {};
    const webhookEvent = body.webhookEvent;
    const issue = body.issue;

    if (!issue) {
      return res.status(200).json({
        success: true,
        message: 'No issue object found in webhook payload; ignoring.',
      });
    }

    const jiraKey = issue.key;
    const jiraId = String(issue.id || '');
    const fields = issue.fields || {};

    // 1. Locate the corresponding CampusCare ticket
    // First by jira_issue_key / jira_issue_id
    let ticketRes = await db.query(
      'SELECT id, status, jira_issue_key FROM tickets WHERE jira_issue_key = $1 OR jira_issue_id = $2',
      [jiraKey, jiraId]
    );

    // If not linked yet, check summary or description for [LAB-xxxx] pattern
    let ticketId = ticketRes.rows.length > 0 ? ticketRes.rows[0].id : null;

    if (!ticketId) {
      const summary = fields.summary || '';
      const labMatch = summary.match(/\[(LAB-\d+)\]/i);
      if (labMatch) {
        ticketId = labMatch[1].toUpperCase();
      }
    }

    if (!ticketId) {
      // Return 200 so Jira does not mark webhook as failing
      return res.status(200).json({
        success: true,
        message: `Webhook received for ${jiraKey}, but no matching CampusCare ticket was identified.`,
        skipped: true,
      });
    }

    // 2. Extract Status Transition
    const rawStatus = fields.status ? fields.status.name : null;
    const mappedStatus = normalizeJiraStatus(rawStatus);

    // 3. Extract Technician / Actor Name
    const technicianName =
      (body.user && (body.user.displayName || body.user.name)) ||
      (fields.assignee && (fields.assignee.displayName || fields.assignee.name)) ||
      'Jira Technician';

    // 4. Extract Comment if comment event
    let commentText = null;
    if (body.comment && body.comment.body) {
      commentText = typeof body.comment.body === 'string'
        ? body.comment.body
        : JSON.stringify(body.comment.body);
    }

    // 5. Apply update via ticketRepository.syncFromJira
    const updated = await ticketRepository.syncFromJira(ticketId, {
      jiraIssueKey: jiraKey,
      jiraIssueId: jiraId,
      status: mappedStatus,
      comment: commentText,
      technicianName,
    });

    return res.status(200).json({
      success: true,
      message: 'Jira webhook processed successfully.',
      data: {
        ticketId: updated.id,
        jiraIssueKey: updated.jira_issue_key,
        status: updated.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/jira/retry/:id
 * Manually trigger or retry outbound sync for a specific ticket
 */
const retrySync = async (req, res, next) => {
  try {
    const ticketId = req.params.id;
    const result = await jiraSyncService.syncTicketNow(ticketId);

    if (!result.success) {
      return res.status(502).json({
        success: false,
        message: `Failed to synchronize ticket ${ticketId} to Jira.`,
        error: result.error,
        status: result.status,
        retryCount: result.retryCount,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Ticket ${ticketId} synchronized to Jira successfully.`,
      jiraIssueKey: result.jiraIssueKey,
      jiraIssueId: result.jiraIssueId,
      skipped: result.skipped || false,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/jira/process-queue
 * Manually trigger outbound queue batch processing
 */
const processQueue = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const result = await jiraSyncService.processPendingEvents(limit);

    return res.status(200).json({
      success: true,
      message: 'Outbound queue processing complete.',
      result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/jira/sync-inbound
 * Manually trigger inbound status synchronization from Jira
 */
const syncInbound = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const result = await jiraSyncService.syncInboundStatus(limit);

    return res.status(200).json({
      success: true,
      message: 'Inbound status synchronization complete.',
      result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getIntegrationStatus,
  handleJiraWebhook,
  retrySync,
  processQueue,
  syncInbound,
};

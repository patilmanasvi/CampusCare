/**
 * Jira Integration Routes
 * Provides webhook receivers, queue processors, and integration health checks
 */
const express = require('express');
const router = express.Router();

const jiraController = require('../controllers/jiraController');
const { authenticateJiraWebhook } = require('../middleware/jiraWebhookAuth');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

/**
 * Public/Authorized integration health check & queue monitoring
 */
router.get('/status', jiraController.getIntegrationStatus);

/**
 * Direct Atlassian Jira Cloud Webhook endpoint
 * Secured by authenticateJiraWebhook (supports Secret header or JWT)
 */
router.post('/webhook', authenticateJiraWebhook, jiraController.handleJiraWebhook);

/**
 * Manually trigger or retry outbound sync for a specific ticket
 * Restricted to ADMIN or TECHNICIAN
 */
router.post('/retry/:id', authenticate, authorizeRoles('ADMIN', 'TECHNICIAN'), jiraController.retrySync);

/**
 * Manually trigger queue processing for pending outbound events
 * Restricted to ADMIN
 */
router.post('/process-queue', authenticate, authorizeRoles('ADMIN'), jiraController.processQueue);

/**
 * Trigger inbound status synchronization from Jira
 */
router.post('/sync-inbound', jiraController.syncInbound);

module.exports = router;

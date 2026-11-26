/**
 * Jira Webhook Authentication Middleware
 * Supports:
 * 1. Bearer JWT from Admin/Technician
 * 2. Shared secret header (X-Sync-Secret or X-Jira-Webhook-Secret) matching JIRA_WEBHOOK_SECRET
 * 3. Query parameter secret (?secret=...) for webhooks where custom headers are restricted
 */
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { jiraConfig } = require('../config/jiraConfig');

const authenticateJiraWebhook = (req, res, next) => {
  // 1. Check shared webhook secret
  const incomingSecret =
    req.headers['x-sync-secret'] ||
    req.headers['x-jira-webhook-secret'] ||
    req.query.secret;

  if (jiraConfig.webhookSecret && incomingSecret && incomingSecret === jiraConfig.webhookSecret) {
    req.user = {
      id: null,
      fullName: 'Jira Automation Webhook',
      role: 'ADMIN',
      isWebhook: true,
    };
    return next();
  }

  // 2. Check Bearer token (JWT)
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      if (['ADMIN', 'TECHNICIAN'].includes(decoded.role)) {
        req.user = decoded;
        return next();
      }
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Insufficient privileges for Jira synchronization.',
        code: 'FORBIDDEN_SYNC',
      });
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid or expired Bearer token.',
        code: 'INVALID_TOKEN',
      });
    }
  }

  // If secret is not configured in development, allow if x-sync-secret matches default test key
  if (config.env !== 'production' && incomingSecret === 'dev_jira_sync_secret') {
    req.user = {
      id: null,
      fullName: 'Jira Dev Webhook',
      role: 'ADMIN',
      isWebhook: true,
    };
    return next();
  }

  return res.status(401).json({
    success: false,
    message: 'Authentication failed. Please provide a valid Bearer token or X-Sync-Secret header.',
    code: 'SYNC_AUTH_FAILED',
  });
};

module.exports = {
  authenticateJiraWebhook,
};

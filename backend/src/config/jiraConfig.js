/**
 * CampusCare - Jira Service Management Client Configuration
 * Manages credentials, REST endpoints, and connection testing
 */
const config = require('./env');

const jiraConfig = {
  baseUrl: (process.env.JIRA_BASE_URL || '').replace(/\/+$/, ''),
  userEmail: process.env.JIRA_USER_EMAIL || '',
  apiToken: process.env.JIRA_API_TOKEN || '',
  serviceDeskId: process.env.JIRA_SERVICE_DESK_ID || '',
  requestTypeId: process.env.JIRA_REQUEST_TYPE_ID || '',
  projectKey: process.env.JIRA_PROJECT_KEY || 'JSM',
  issueTypeId: process.env.JIRA_ISSUE_TYPE_ID || '',
  webhookSecret: process.env.JIRA_WEBHOOK_SECRET || '',
  syncIntervalMs: parseInt(process.env.JIRA_SYNC_INTERVAL_MS, 10) || 10000,
  maxRetries: parseInt(process.env.JIRA_MAX_RETRIES, 10) || 5,
  autoStartWorker: process.env.JIRA_AUTO_START_WORKER !== 'false',
};

/**
 * Check if the Jira Service Management integration is configured with required credentials
 * @returns {boolean}
 */
const isJiraConfigured = () => {
  return Boolean(
    jiraConfig.baseUrl &&
    jiraConfig.userEmail &&
    jiraConfig.apiToken &&
    !jiraConfig.baseUrl.includes('your-domain') &&
    !jiraConfig.userEmail.includes('your_email') &&
    jiraConfig.apiToken !== 'your_jira_api_token'
  );
};

/**
 * Get HTTP Basic Authorization header for Jira Cloud REST API
 * Jira Cloud REST API uses Basic Auth with Email + API Token
 * @returns {string|null}
 */
const getJiraAuthHeader = () => {
  if (!jiraConfig.userEmail || !jiraConfig.apiToken) {
    return null;
  }
  const token = Buffer.from(`${jiraConfig.userEmail}:${jiraConfig.apiToken}`).toString('base64');
  return `Basic ${token}`;
};

module.exports = {
  jiraConfig,
  isJiraConfigured,
  getJiraAuthHeader,
};

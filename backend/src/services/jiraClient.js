/**
 * Jira Service Management Cloud REST API Client
 * Wraps Atlassian Jira Cloud REST API (Issue API v3 & Service Desk API)
 * Strictly kept on the backend using environment variable credentials
 */
const { jiraConfig, getJiraAuthHeader, isJiraConfigured } = require('../config/jiraConfig');
const { buildJiraIssuePayload, buildJsmCustomerRequestPayload } = require('./jiraMapping');

class JiraClient {
  constructor(customConfig = null) {
    this.config = customConfig || jiraConfig;
  }

  /**
   * Helper to execute Jira HTTP requests using native fetch
   * @param {string} endpoint e.g. '/rest/api/3/issue'
   * @param {Object} options fetch options
   * @returns {Promise<any>}
   */
  async request(endpoint, options = {}) {
    if (!this.config.baseUrl) {
      throw new Error('JIRA_BASE_URL is not configured.');
    }

    const authHeader = getJiraAuthHeader();
    if (!authHeader) {
      throw new Error('Jira API credentials (JIRA_USER_EMAIL / JIRA_API_TOKEN) are not configured.');
    }

    const url = `${this.config.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const headers = {
      'Authorization': authHeader,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    };

    let response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (networkErr) {
      const error = new Error(`Jira network error: ${networkErr.message}`);
      error.code = 'JIRA_NETWORK_ERROR';
      error.isRetryable = true;
      throw error;
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return null;
    }

    const responseText = await response.text();
    let responseData = null;
    if (responseText) {
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = { raw: responseText };
      }
    }

    if (!response.ok) {
      const error = new Error(
        `Jira API error [${response.status}]: ${
          (responseData && (responseData.errorMessages || responseData.message || JSON.stringify(responseData.errors))) ||
          response.statusText
        }`
      );
      error.statusCode = response.status;
      error.data = responseData;
      // Mark 429 Too Many Requests and 5xx Server Errors as retryable
      error.isRetryable = response.status === 429 || (response.status >= 500 && response.status <= 599);
      throw error;
    }

    return responseData;
  }

  /**
   * Tests connection to Jira Cloud instance
   * Validates credentials and returns current user info / server info
   */
  async testConnection() {
    if (!isJiraConfigured()) {
      return {
        connected: false,
        configured: false,
        message: 'Jira integration credentials are not configured in environment variables.',
      };
    }

    try {
      const myself = await this.request('/rest/api/3/myself');
      return {
        connected: true,
        configured: true,
        user: {
          accountId: myself.accountId,
          emailAddress: myself.emailAddress,
          displayName: myself.displayName,
          active: myself.active,
        },
      };
    } catch (err) {
      return {
        connected: false,
        configured: true,
        error: err.message,
        statusCode: err.statusCode,
      };
    }
  }

  /**
   * Creates a service request in Jira Service Management
   * First attempts Service Desk Customer Request API if serviceDeskId & requestTypeId are provided,
   * otherwise falls back to standard Jira Issue REST API v3
   *
   * @param {Object} ticketData CampusCare ticket details
   * @returns {Promise<{ key: string, id: string, self: string }>}
   */
  async createTicket(ticketData) {
    // If Service Desk ID and Request Type ID are set, prefer Service Desk API
    if (this.config.serviceDeskId && this.config.requestTypeId) {
      try {
        const payload = buildJsmCustomerRequestPayload({
          serviceDeskId: this.config.serviceDeskId,
          requestTypeId: this.config.requestTypeId,
          ticketId: ticketData.ticketId || ticketData.internalId,
          pcDisplayCode: ticketData.pc ? ticketData.pc.displayCode : null,
          categoryName: ticketData.category,
          subcategoryName: ticketData.subcategory,
          description: ticketData.description,
          remarks: ticketData.remarks,
          labName: ticketData.pc ? ticketData.pc.labName : null,
          roomNumber: ticketData.pc ? ticketData.pc.roomNumber : null,
        });

        const res = await this.request('/rest/servicedeskapi/request', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        return {
          key: res.issueKey,
          id: res.issueId,
          self: res._links ? res._links.self : null,
        };
      } catch (err) {
        // If servicedeskapi fails due to not found or configuration, fall back to issue REST API
        console.warn(`[JiraClient] JSM Request API failed (${err.message}). Falling back to Jira REST API v3...`);
      }
    }

    // Standard Jira REST API v3
    const payload = buildJiraIssuePayload({
      projectKey: this.config.projectKey || 'JSM',
      issueTypeId: this.config.issueTypeId,
      ticketId: ticketData.ticketId || ticketData.internalId,
      pcDisplayCode: ticketData.pc ? ticketData.pc.displayCode : null,
      categoryName: ticketData.category,
      subcategoryName: ticketData.subcategory,
      urgency: ticketData.urgency,
      description: ticketData.description,
      remarks: ticketData.remarks,
      reporterName: ticketData.reporter ? ticketData.reporter.fullName : null,
      reporterEmail: ticketData.reporter ? ticketData.reporter.email : null,
      labName: ticketData.pc ? ticketData.pc.labName : null,
      roomNumber: ticketData.pc ? ticketData.pc.roomNumber : null,
      blockName: ticketData.pc ? ticketData.pc.block : null,
      assetId: ticketData.pc ? ticketData.pc.assetId : null,
    });

    const res = await this.request('/rest/api/3/issue', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return {
      key: res.key,
      id: res.id,
      self: res.self,
    };
  }

  /**
   * Fetch issue details by issue key or ID
   * @param {string} issueKeyOrId e.g. 'JSM-1042' or '10042'
   */
  async getIssue(issueKeyOrId) {
    return await this.request(`/rest/api/3/issue/${encodeURIComponent(issueKeyOrId)}`);
  }

  /**
   * Add a public comment to a Jira issue
   * @param {string} issueKeyOrId
   * @param {string} commentText
   */
  async addComment(issueKeyOrId, commentText) {
    const payload = {
      body: {
        version: 1,
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: commentText,
              },
            ],
          },
        ],
      },
    };

    return await this.request(`/rest/api/3/issue/${encodeURIComponent(issueKeyOrId)}/comment`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Transition an issue to a new status in Jira
   * @param {string} issueKeyOrId
   * @param {string} transitionIdOrName
   */
  async transitionIssue(issueKeyOrId, transitionIdOrName) {
    // 1. Get available transitions
    const transitionsRes = await this.request(`/rest/api/3/issue/${encodeURIComponent(issueKeyOrId)}/transitions`);
    const transitions = transitionsRes.transitions || [];

    const matched = transitions.find(
      (t) =>
        t.id === transitionIdOrName ||
        t.name.toLowerCase() === transitionIdOrName.toLowerCase()
    );

    if (!matched) {
      throw new Error(
        `Transition '${transitionIdOrName}' not found for issue ${issueKeyOrId}. Available: ${transitions.map((t) => `${t.name} (${t.id})`).join(', ')}`
      );
    }

    return await this.request(`/rest/api/3/issue/${encodeURIComponent(issueKeyOrId)}/transitions`, {
      method: 'POST',
      body: JSON.stringify({
        transition: {
          id: matched.id,
        },
      }),
    });
  }

  /**
   * Create an issue link between two Jira issues (Duplicate, Relates, Blocks)
   * @param {Object} options
   */
  async linkIssues({ inwardKey, outwardKey, linkType = 'Relates' }) {
    const payload = {
      type: {
        name: linkType,
      },
      inwardIssue: {
        key: inwardKey,
      },
      outwardIssue: {
        key: outwardKey,
      },
    };

    return await this.request('/rest/api/3/issueLink', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

// Export singleton instance as well as the class
const defaultClient = new JiraClient();

module.exports = {
  JiraClient,
  jiraClient: defaultClient,
};

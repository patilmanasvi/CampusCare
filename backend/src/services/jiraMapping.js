/**
 * Jira Service Management Field & Status Mapping Utility
 * Translates between CampusCare internal domain models and Jira Cloud JSM schema
 */

/**
 * Maps CampusCare urgency levels to standard Jira priorities
 */
const urgencyToJiraPriority = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Highest',
};

/**
 * Maps Jira priorities back to CampusCare urgency levels
 */
const jiraPriorityToUrgency = {
  Lowest: 'LOW',
  Low: 'LOW',
  Medium: 'MEDIUM',
  High: 'HIGH',
  Highest: 'CRITICAL',
};

/**
 * Maps Jira Service Management statuses to internal CampusCare statuses
 * Based on Section 5 of JIRA_BACKEND_HANDOFF.md
 */
const jiraStatusToCampusCareStatus = {
  // Waiting for support / Open
  'WAITING FOR SUPPORT': 'SUBMITTED',
  'OPEN': 'SUBMITTED',
  'TO DO': 'SUBMITTED',
  'PENDING TRIAGE': 'SUBMITTED',

  // Assigned / Triage
  'ASSIGNED': 'ACKNOWLEDGED',
  'TRIAGE': 'ACKNOWLEDGED',
  'WAITING FOR TRIAGE': 'ACKNOWLEDGED',

  // Work In Progress / Investigating
  'IN PROGRESS': 'IN_PROGRESS',
  'INVESTIGATING': 'IN_PROGRESS',
  'WORK IN PROGRESS': 'IN_PROGRESS',
  'UNDER INVESTIGATION': 'IN_PROGRESS',

  // Pending Customer / Waiting on Info
  'PENDING CUSTOMER': 'WAITING_FOR_INFO',
  'WAITING FOR CUSTOMER': 'WAITING_FOR_INFO',
  'WAITING ON INFO': 'WAITING_FOR_INFO',
  'NEED MORE INFO': 'WAITING_FOR_INFO',

  // Resolved / Work Complete -> AWAITING_VERIFICATION so teacher confirms
  'RESOLVED': 'AWAITING_VERIFICATION',
  'WORK COMPLETE': 'AWAITING_VERIFICATION',
  'FIXED': 'AWAITING_VERIFICATION',
  'READY FOR VERIFICATION': 'AWAITING_VERIFICATION',

  // Closed / Done
  'CLOSED': 'CLOSED',
  'DONE': 'CLOSED',
  'COMPLETED': 'CLOSED',

  // Reopened
  'REOPENED': 'REOPENED',
  'REOPEN': 'REOPENED',
};

/**
 * Normalizes an arbitrary Jira status string to an accepted CampusCare status enum
 * @param {string} jiraStatus
 * @returns {string|null}
 */
const normalizeJiraStatus = (jiraStatus) => {
  if (!jiraStatus) return null;
  const clean = jiraStatus.trim().toUpperCase();
  if (jiraStatusToCampusCareStatus[clean]) {
    return jiraStatusToCampusCareStatus[clean];
  }
  // If it's already a valid CampusCare status
  const validCampusCareStatuses = [
    'SUBMITTED',
    'ACKNOWLEDGED',
    'IN_PROGRESS',
    'WAITING_FOR_INFO',
    'FIXED',
    'AWAITING_VERIFICATION',
    'CLOSED',
    'REOPENED',
  ];
  if (validCampusCareStatuses.includes(clean)) {
    return clean;
  }
  return null;
};

/**
 * Formats a CampusCare ticket into an Atlassian Document Format (ADF) description
 * compatible with Jira Cloud REST API v3
 * @param {Object} payload Ticket details from sync_events payload or ticket record
 * @returns {Object} ADF format object
 */
const formatDescriptionToADF = (payload) => {
  const pc = payload.pc || {};
  const reporter = payload.reporter || {};

  const lines = [
    `Ticket ID: ${payload.ticketId || payload.internalId}`,
    `Description: ${payload.description || 'No description provided'}`,
    payload.remarks ? `Remarks: ${payload.remarks}` : null,
    `Category: ${payload.category || 'N/A'}${payload.subcategory ? ` > ${payload.subcategory}` : ''}`,
    `Urgency: ${payload.urgency || 'MEDIUM'}`,
    pc.displayCode ? `PC Display Code: ${pc.displayCode}` : null,
    pc.assetId ? `Asset Tag: ${pc.assetId}` : null,
    pc.labName ? `Lab: ${pc.labName}` : null,
    pc.roomNumber ? `Room: ${pc.roomNumber}` : null,
    pc.block ? `Block: ${pc.block}` : null,
    reporter.fullName ? `Reporter: ${reporter.fullName} (${reporter.email || 'N/A'})` : null,
    reporter.department ? `Department: ${reporter.department}` : null,
  ].filter(Boolean);

  const paragraphs = lines.map((text) => ({
    type: 'paragraph',
    content: [
      {
        type: 'text',
        text,
      },
    ],
  }));

  return {
    version: 1,
    type: 'doc',
    content: paragraphs,
  };
};

/**
 * Builds the Jira issue creation payload for Jira Cloud REST API v3 / v2
 * @param {Object} options
 * @returns {Object}
 */
const buildJiraIssuePayload = ({
  projectKey = 'JSM',
  issueTypeId = null,
  ticketId,
  pcDisplayCode,
  categoryName,
  subcategoryName,
  urgency,
  description,
  remarks,
  reporterName,
  reporterEmail,
  labName,
  roomNumber,
  blockName,
  assetId,
}) => {
  const summaryPrefix = pcDisplayCode ? `[${pcDisplayCode}]` : `[${ticketId}]`;
  const summary = `${summaryPrefix} ${categoryName || 'Lab PC Issue'}${subcategoryName ? ` - ${subcategoryName}` : ''}`;
  const priorityName = urgencyToJiraPriority[urgency] || 'Medium';

  const fullDescriptionText = [
    `CampusCare Internal ID: ${ticketId}`,
    `Reported By: ${reporterName || 'Faculty Member'} (${reporterEmail || 'N/A'})`,
    `Location: ${labName || 'N/A'}, Room ${roomNumber || 'N/A'}, ${blockName || 'N/A'}`,
    `PC Position: ${pcDisplayCode || 'N/A'} (Asset: ${assetId || 'N/A'})`,
    `Category: ${categoryName || 'N/A'} / ${subcategoryName || 'N/A'}`,
    `Urgency: ${urgency || 'MEDIUM'}`,
    '',
    'Problem Description:',
    description || 'No description provided.',
    remarks ? `\nRemarks:\n${remarks}` : '',
  ].join('\n');

  return {
    fields: {
      project: {
        key: projectKey,
      },
      summary: summary.substring(0, 255),
      description: formatDescriptionToADF({
        ticketId,
        description,
        remarks,
        category: categoryName,
        subcategory: subcategoryName,
        urgency,
        pc: {
          displayCode: pcDisplayCode,
          assetId,
          labName,
          roomNumber,
          block: blockName,
        },
        reporter: {
          fullName: reporterName,
          email: reporterEmail,
        },
      }),
      // Fallback text string for older Jira APIs or service desk APIs
      environment: {
        version: 1,
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: `CampusCare PC: ${pcDisplayCode || 'Unknown'} | Room: ${roomNumber || 'Unknown'} | Lab: ${labName || 'Unknown'}`,
              },
            ],
          },
        ],
      },
      issuetype: issueTypeId ? { id: issueTypeId } : { name: 'Service Request' },
      priority: {
        name: priorityName,
      },
      labels: [
        'CampusCare',
        `Lab-${roomNumber || 'General'}`,
        `Urgency-${urgency || 'MEDIUM'}`,
      ].filter(Boolean),
    },
  };
};

/**
 * Build payload for Jira Service Management Customer Request API
 * POST /rest/servicedeskapi/request
 */
const buildJsmCustomerRequestPayload = ({
  serviceDeskId,
  requestTypeId,
  ticketId,
  pcDisplayCode,
  categoryName,
  subcategoryName,
  urgency,
  description,
  remarks,
  reporterName,
  reporterEmail,
  reporterDepartment,
  labName,
  roomNumber,
  blockName,
}) => {
  const summaryPrefix = pcDisplayCode ? `[${pcDisplayCode}]` : `[${ticketId}]`;
  const summary = `${summaryPrefix} ${categoryName || 'Lab PC Issue'}${subcategoryName ? ` - ${subcategoryName}` : ''}`;
  const descriptionText = [
    `CampusCare Internal ID: ${ticketId}`,
    `Reported By: ${reporterName || 'Faculty Member'} (${reporterEmail || 'N/A'})`,
    reporterDepartment ? `Department: ${reporterDepartment}` : null,
    `Location: ${labName || 'N/A'}, Room ${roomNumber || 'N/A'}${blockName ? `, ${blockName}` : ''}`,
    `PC Position: ${pcDisplayCode || 'N/A'}`,
    `Category: ${categoryName || 'N/A'}${subcategoryName ? ` > ${subcategoryName}` : ''}`,
    `Urgency: ${urgency || 'MEDIUM'}`,
    '',
    'Problem Description:',
    description || 'No description provided.',
    remarks ? `\nAdditional Remarks:\n${remarks}` : null,
  ].filter(Boolean).join('\n');

  return {
    serviceDeskId: String(serviceDeskId),
    requestTypeId: String(requestTypeId),
    requestFieldValues: {
      summary: summary.substring(0, 255),
      description: descriptionText,
    },
  };
};

module.exports = {
  urgencyToJiraPriority,
  jiraPriorityToUrgency,
  jiraStatusToCampusCareStatus,
  normalizeJiraStatus,
  formatDescriptionToADF,
  buildJiraIssuePayload,
  buildJsmCustomerRequestPayload,
};

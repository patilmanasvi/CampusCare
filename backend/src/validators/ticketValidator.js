/**
 * CampusCare Ticket Validators
 * Strict input validation rules for ticket creation, comments, information, and verification
 */
const { body, param, query } = require('express-validator');

const ticketIdParam = param('id')
  .trim()
  .matches(/^LAB-\d{1,12}$/)
  .withMessage('Ticket ID must use the LAB-<number> format');

const attachmentRules = [
  body('attachmentIds')
    .optional({ nullable: true })
    .isArray({ max: 5 })
    .withMessage('attachmentIds must be an array of at most 5 attachment IDs')
    .custom((ids) => !Array.isArray(ids) || new Set(ids).size === ids.length)
    .withMessage('attachmentIds cannot contain duplicates'),
  body('attachmentIds.*')
    .optional()
    .isString()
    .matches(/^att-[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    .withMessage('Each attachment ID must be a valid attachment ID'),
];

const createTicketRules = [
  body('pcId')
    .trim()
    .notEmpty()
    .withMessage('A target PC is required')
    .isUUID()
    .withMessage('pcId must be a valid UUID'),

  body('categoryId')
    .trim()
    .notEmpty()
    .withMessage('An issue category is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('categoryId must be between 2 and 50 characters'),

  body('subcategoryId')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('subcategoryId must be between 2 and 50 characters'),

  body('urgency')
    .optional()
    .trim()
    .toUpperCase()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
    .withMessage('urgency must be one of: LOW, MEDIUM, HIGH, CRITICAL'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Please describe the issue observed on the computer')
    .isLength({ min: 5, max: 3000 })
    .withMessage('Description must be between 5 and 3000 characters'),

  body('remarks')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Remarks must not exceed 1000 characters'),
  ...attachmentRules,
];

const addInformationRules = [
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Please provide additional information or response')
    .isLength({ min: 2, max: 3000 })
    .withMessage('Message must be between 2 and 3000 characters'),
  ...attachmentRules,
];

const addCommentRules = [
  body().custom((value) => {
    const hasText = typeof value?.body === 'string' && value.body.trim().length > 0;
    const hasFiles = Array.isArray(value?.attachmentIds) && value.attachmentIds.length > 0;
    return hasText || hasFiles;
  }).withMessage('Write a comment or attach a file'),
  body('body')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ min: 1, max: 3000 })
    .withMessage('Comment must not exceed 3000 characters'),

  body('visibility')
    .optional()
    .trim()
    .toUpperCase()
    .isIn(['PUBLIC', 'INTERNAL'])
    .withMessage('visibility must be either PUBLIC or INTERNAL'),
  ...attachmentRules,
];

const submitVerificationRules = [
  body('result')
    .trim()
    .toUpperCase()
    .isIn(['WORKING', 'NOT_WORKING'])
    .withMessage("Verification result must be either 'WORKING' or 'NOT_WORKING'"),

  body('explanation')
    .if(body('result').equals('NOT_WORKING'))
    .trim()
    .notEmpty()
    .withMessage("Please provide an explanation of why the PC is still 'NOT_WORKING'")
    .isLength({ min: 3, max: 2000 })
    .withMessage('Explanation must be between 3 and 2000 characters'),

  body('rating')
    .optional({ nullable: true })
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be an integer between 1 and 5'),

  body('comment')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comment must not exceed 1000 characters'),
];

const duplicateCheckRules = [
  body().custom((value, { req }) => Boolean(value?.pcId || req.query?.pcId))
    .withMessage('pcId is required to check for duplicates'),
  body('pcId')
    .optional()
    .trim()
    .isUUID()
    .withMessage('pcId must be a valid UUID'),
  body('categoryId').optional({ nullable: true }).trim().isLength({ min: 2, max: 50 }),
  body('subcategoryId').optional({ nullable: true }).trim().isLength({ min: 2, max: 50 }),

  query('pcId')
    .optional()
    .trim()
    .isUUID()
    .withMessage('pcId must be a valid UUID'),
  query('categoryId').optional().trim().isLength({ min: 2, max: 50 }),
  query('subcategoryId').optional().trim().isLength({ min: 2, max: 50 }),
];

const ticketIdRules = [ticketIdParam];

const listTicketRules = [
  query('status').optional().isString().isLength({ max: 200 }).bail().custom((value) =>
    String(value).split(',').every((status) => [
      'SUBMITTED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'WAITING_FOR_INFO', 'FIXED',
      'AWAITING_VERIFICATION', 'CLOSED', 'REOPENED',
    ].includes(status.trim().toUpperCase()))
  ).withMessage('status contains an unsupported ticket status'),
  query('urgency').optional().trim().toUpperCase().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  query('categoryId').optional().trim().isLength({ min: 2, max: 50 }),
  query('dateFrom').optional().isISO8601().withMessage('dateFrom must be an ISO date'),
  query('dateTo').optional().isISO8601().withMessage('dateTo must be an ISO date'),
  query('search').optional().trim().isLength({ max: 200 }),
  query('sort').optional().isIn(['newest', 'oldest']),
  query('page').optional().toInt().isInt({ min: 1, max: 100000 }),
  query('pageSize').optional().toInt().isInt({ min: 1, max: 100 }),
];

const jiraSyncRules = [
  ticketIdParam,
  body('jiraIssueKey').optional({ nullable: true }).trim().isLength({ min: 1, max: 50 }),
  body('jiraIssueId').optional({ nullable: true }).trim().isLength({ min: 1, max: 100 }),
  body('status').optional({ nullable: true }).trim().toUpperCase().isIn([
    'SUBMITTED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'WAITING_FOR_INFO', 'FIXED',
    'AWAITING_VERIFICATION', 'CLOSED', 'REOPENED',
  ]),
  body('comment').optional({ nullable: true }).trim().isLength({ max: 3000 }),
  body('technicianName').optional({ nullable: true }).trim().isLength({ max: 150 }),
  body().custom((value) => Object.keys(value || {}).every((key) =>
    ['jiraIssueKey', 'jiraIssueId', 'status', 'comment', 'technicianName'].includes(key)
  )).withMessage('Unsupported Jira sync field'),
];

module.exports = {
  createTicketRules,
  addInformationRules,
  addCommentRules,
  submitVerificationRules,
  duplicateCheckRules,
  ticketIdRules,
  listTicketRules,
  jiraSyncRules,
};

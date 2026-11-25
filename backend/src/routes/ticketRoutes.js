/**
 * CampusCare Ticket Routes
 * Endpoints for ticket creation, listings, timeline history, comments, and verifications
 */
const express = require('express');
const router = express.Router();

const ticketController = require('../controllers/ticketController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validate');
const {
  createTicketRules,
  addInformationRules,
  addCommentRules,
  submitVerificationRules,
  duplicateCheckRules,
  ticketIdRules,
  listTicketRules,
  jiraSyncRules,
} = require('../validators/ticketValidator');

/**
 * Duplicate check endpoints (Support both GET /check-duplicate and POST /duplicate-check)
 */
router.get('/check-duplicate', authenticate, validate(duplicateCheckRules), ticketController.checkDuplicates);
router.post('/duplicate-check', authenticate, validate(duplicateCheckRules), ticketController.checkDuplicates);

/**
 * Teacher personal tickets list
 */
router.get('/my', authenticate, validate(listTicketRules), ticketController.listMyTickets);
router.get('/', authenticate, validate(listTicketRules), ticketController.listMyTickets);

/**
 * Ticket creation
 */
router.post('/', authenticate, authorizeRoles('TEACHER'), validate(createTicketRules), ticketController.createTicket);

/**
 * Inbound Jira synchronization (Member 3 - restricted to ADMIN or TECHNICIAN)
 */
router.patch('/:id/jira-sync', authenticate, authorizeRoles('ADMIN', 'TECHNICIAN'), validate(jiraSyncRules), ticketController.syncFromJira);

/**
 * Ticket details
 */
router.get('/:id', authenticate, validate(ticketIdRules), ticketController.getTicketById);

/**
 * Ticket timeline history
 */
router.get('/:id/timeline', authenticate, validate(ticketIdRules), ticketController.getTicketTimeline);

/**
 * Add comments
 */
router.post('/:id/comments', authenticate, validate([...ticketIdRules, ...addCommentRules]), ticketController.addComment);

/**
 * Add additional information
 */
router.post('/:id/information', authenticate, validate([...ticketIdRules, ...addInformationRules]), ticketController.addInformation);

/**
 * Submit repair verification & feedback
 */
router.post('/:id/verification', authenticate, validate([...ticketIdRules, ...submitVerificationRules]), ticketController.submitVerification);
router.post('/:id/feedback', authenticate, validate([...ticketIdRules, ...submitVerificationRules]), ticketController.submitVerification);

module.exports = router;

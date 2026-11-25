/**
 * CampusCare Ticket Controller
 * Handles HTTP requests for ticket creation, listing, details, timeline, comments, and verification
 */
const ticketService = require('../services/ticketService');

/**
 * GET /api/tickets/check-duplicate & POST /api/tickets/duplicate-check
 * Checks for potential duplicate tickets on a PC
 */
const checkDuplicates = async (req, res, next) => {
  try {
    const pcId = req.query.pcId || req.body.pcId;
    const categoryId = req.query.categoryId || req.body.categoryId || null;
    const subcategoryId = req.query.subcategoryId || req.body.subcategoryId || null;

    const result = await ticketService.checkDuplicates({
      pcId,
      categoryId,
      subcategoryId,
      currentUserId: req.user.id,
      userRole: req.user.role,
    });

    return res.status(200).json({
      success: true,
      matches: result.matches,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/tickets
 * Creates a new ticket inside an atomic transaction
 */
const createTicket = async (req, res, next) => {
  try {
    const idempotencyKey = req.headers['idempotency-key'] || null;

    const ticket = await ticketService.createTicket(req.body, {
      idempotencyKey,
      user: req.user,
    });

    return res.status(201).json({
      success: true,
      message: 'Support ticket submitted successfully.',
      ticket,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/tickets/my & GET /api/teacher/tickets
 * Fetches tickets reported by the authenticated teacher with filters
 */
const listMyTickets = async (req, res, next) => {
  try {
    const {
      status,
      urgency,
      categoryId,
      dateFrom,
      dateTo,
      search,
      sort = 'newest',
      page = 1,
      pageSize = 10,
    } = req.query;

    const result = await ticketService.listMyTickets({
      reporterId: req.user.id,
      status,
      urgency,
      categoryId,
      dateFrom,
      dateTo,
      search,
      sort,
      page,
      pageSize,
    });

    return res.status(200).json({
      success: true,
      items: result.items,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/tickets/:id
 * Fetches complete details of a single ticket
 */
const getTicketById = async (req, res, next) => {
  try {
    const ticketId = req.params.id;
    const ticket = await ticketService.getTicketById(ticketId, req.user.id, req.user.role);

    return res.status(200).json({
      success: true,
      ticket,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/tickets/:id/timeline
 * Fetches chronological lifecycle event timeline
 */
const getTicketTimeline = async (req, res, next) => {
  try {
    const ticketId = req.params.id;
    const events = await ticketService.getTicketTimeline(ticketId, req.user.id, req.user.role);

    return res.status(200).json({
      success: true,
      timeline: events,
      events,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/tickets/:id/comments
 * Adds a comment to a ticket
 */
const addComment = async (req, res, next) => {
  try {
    const ticketId = req.params.id;
    const idempotencyKey = req.headers['idempotency-key'] || null;

    const ticket = await ticketService.addComment(
      ticketId,
      {
        body: req.body.body,
        visibility: req.body.visibility,
        attachmentIds: req.body.attachmentIds || [],
      },
      {
        user: req.user,
        idempotencyKey,
      }
    );

    return res.status(201).json({
      success: true,
      message: 'Comment posted successfully.',
      ticket,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/tickets/:id/information
 * Adds additional diagnostic information or responds to technician questions
 */
const addInformation = async (req, res, next) => {
  try {
    const ticketId = req.params.id;
    const idempotencyKey = req.headers['idempotency-key'] || null;

    const ticket = await ticketService.addInformation(
      ticketId,
      { message: req.body.message, attachmentIds: req.body.attachmentIds || [] },
      {
        user: req.user,
        idempotencyKey,
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Additional information submitted successfully.',
      ticket,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/tickets/:id/verification & POST /api/tickets/:id/feedback
 * Teacher confirms if computer issue is resolved (WORKING vs NOT_WORKING)
 */
const submitVerification = async (req, res, next) => {
  try {
    const ticketId = req.params.id;
    const idempotencyKey = req.headers['idempotency-key'] || null;

    const ticket = await ticketService.submitVerification(
      ticketId,
      {
        result: req.body.result,
        explanation: req.body.explanation,
        comment: req.body.comment,
        rating: req.body.rating,
      },
      {
        user: req.user,
        idempotencyKey,
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Verification recorded successfully.',
      ticket,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/tickets/:id/jira-sync
 * Inbound synchronization from Jira Service Management (Member 3)
 */
const syncFromJira = async (req, res, next) => {
  try {
    const ticketId = req.params.id;
    const { jiraIssueKey, jiraIssueId, status, comment, technicianName } = req.body;

    const updated = await ticketService.syncFromJira(ticketId, {
      jiraIssueKey,
      jiraIssueId,
      status,
      comment,
      technicianName: req.user.fullName,
    });

    return res.status(200).json({
      success: true,
      message: 'Jira synchronization applied successfully.',
      ticketId: updated.id,
      jiraIssueKey: updated.jira_issue_key,
      status: updated.status,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkDuplicates,
  createTicket,
  listMyTickets,
  getTicketById,
  getTicketTimeline,
  addComment,
  addInformation,
  submitVerification,
  syncFromJira,
};

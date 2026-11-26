/**
 * CampusCare Ticket Service
 * Orchestrates business logic for ticket creation, duplicate checks, comments,
 * timeline history, and repair verification with idempotency protection
 */
const ticketRepository = require('../repositories/ticketRepository');
const pcRepository = require('../repositories/pcRepository');
const categoryRepository = require('../repositories/categoryRepository');

// In-memory idempotency cache (TTL: 15 minutes)
const idempotencyStore = new Map();
const IDEMPOTENCY_TTL_MS = 15 * 60 * 1000;

const cleanExpiredIdempotency = () => {
  const now = Date.now();
  for (const [key, value] of idempotencyStore.entries()) {
    if (now - value.timestamp > IDEMPOTENCY_TTL_MS) {
      idempotencyStore.delete(key);
    }
  }
};
setInterval(cleanExpiredIdempotency, 5 * 60 * 1000).unref();

/**
 * Formats a ticket row into a client-ready DTO
 */
const formatTicketDto = (ticket, currentUserId, userRole, events = [], comments = [], attachments = []) => {
  if (!ticket) return null;

  const isOwn = String(ticket.reporter_id) === String(currentUserId);
  const isAdmin = isSupportRole(userRole);

  return {
    id: ticket.id,
    status: ticket.status,
    urgency: ticket.urgency,
    description: ticket.description,
    remarks: ticket.remarks || null,
    createdAt: ticket.created_at,
    updatedAt: ticket.updated_at,
    closedAt: ticket.closed_at || null,
    resolvedAt: ticket.resolved_at || null,
    jiraIssueKey: ticket.jira_issue_key || null,

    category: ticket.category_id
      ? {
          id: ticket.category_id,
          code: ticket.category_code || null,
          name: ticket.category_name || null,
        }
      : null,

    subcategory: ticket.subcategory_id
      ? {
          id: ticket.subcategory_id,
          name: ticket.subcategory_name || null,
        }
      : null,

    pc: ticket.pc_id
      ? {
          id: ticket.pc_id,
          displayCode: ticket.display_code || null,
          pcNumber: ticket.pc_number || null,
          status: ticket.pc_status || null,
          notice: ticket.pc_notice || null,
          canReport: ticket.pc_can_report !== undefined ? Boolean(ticket.pc_can_report) : true,
          assetId: ticket.pc_asset_id || null,
          block: ticket.block_name || null,
          blockId: ticket.block_id || null,
          lab: ticket.lab_name || null,
          labId: ticket.lab_id || null,
          room: ticket.room_number || null,
        }
      : null,

    reporter: {
      id: ticket.reporter_id,
      name: ticket.reporter_name || 'Faculty Member',
      email: ticket.reporter_email || null,
      department: ticket.reporter_department || null,
    },

    assignee: ticket.assigned_to
      ? {
          id: ticket.assigned_to,
          name: ticket.assignee_name || null,
          email: ticket.assignee_email || null,
        }
      : null,

    isOwn,
    canVerify: ticket.status === 'AWAITING_VERIFICATION' && (isOwn || isAdmin),
    canComment: ticket.status !== 'CLOSED',

    events: (events || []).map((e) => ({
      id: e.id,
      type: e.event_type,
      at: e.created_at,
      note: e.note,
      actor: e.actor_id
        ? {
            id: e.actor_id,
            name: e.actor_name,
            role: e.actor_role,
          }
        : null,
    })),

    comments: (comments || []).map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.created_at,
      visibility: c.visibility,
      author: {
        id: c.author_id,
        name: c.author_name,
        role: c.author_role,
      },
      attachments: Array.isArray(c.attachments) ? c.attachments : [],
    })),
    attachments,
  };
};

const isSupportRole = (role) => ['ADMIN', 'TECHNICIAN', 'LAB_ASSISTANT'].includes(String(role || '').toUpperCase());
const assertTicketParticipant = (ticket, user) => {
  if (String(ticket.reporter_id) !== String(user.id) && !isSupportRole(user.role)) {
    const error = new Error("You don't have permission to update another teacher's ticket.");
    error.statusCode = 403;
    error.code = 'FORBIDDEN_TICKET_ACCESS';
    throw error;
  }
};

/**
 * Formats a ticket row for list views (e.g. My Requests)
 */
const formatTicketListItemDto = (ticket, currentUserId) => {
  const isOwn = String(ticket.reporter_id) === String(currentUserId);
  const summary = String(ticket.description || '');

  return {
    id: ticket.id,
    status: ticket.status,
    urgency: ticket.urgency,
    createdAt: ticket.created_at,
    updatedAt: ticket.updated_at,
    summary: summary.length > 90 ? `${summary.slice(0, 89).trimEnd()}…` : summary,
    category: ticket.category_id
      ? {
          id: ticket.category_id,
          code: ticket.category_code,
          name: ticket.category_name,
        }
      : null,
    subcategory: ticket.subcategory_id
      ? {
          id: ticket.subcategory_id,
          name: ticket.subcategory_name,
        }
      : null,
    pc: {
      id: ticket.pc_id,
      displayCode: ticket.display_code,
      pcNumber: ticket.pc_number,
      block: ticket.block_name,
      lab: ticket.lab_name,
      room: ticket.room_number,
    },
    isOwn,
    canView: true,
  };
};

/**
 * Service: Check for duplicate tickets on a PC
 */
const checkDuplicates = async ({ pcId, categoryId = null, currentUserId, userRole }) => {
  if (!pcId) {
    const error = new Error('pcId is required to check for duplicate tickets.');
    error.statusCode = 400;
    error.code = 'PC_ID_REQUIRED';
    throw error;
  }

  // 1. Verify PC exists
  const pc = await pcRepository.findPcById(pcId);
  if (!pc) {
    const error = new Error('Selected computer could not be found.');
    error.statusCode = 404;
    error.code = 'PC_NOT_FOUND';
    throw error;
  }

  // 2. Query potential duplicates
  const rawDuplicates = await ticketRepository.findPotentialDuplicates({ pcId, categoryId });

  // 3. Mask privacy for other teachers' tickets
  const matches = rawDuplicates.map((t) => {
    const isOwn = String(t.reporter_id) === String(currentUserId);
    const isAdmin = isSupportRole(userRole);
    const canView = isOwn || isAdmin;
    const sameCategory = categoryId ? t.category_id === categoryId : false;

    const base = {
      id: t.id,
      status: t.status,
      urgency: t.urgency,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      sameCategory,
      isOwn,
      canView,
      category: {
        id: t.category_id,
        code: t.category_code,
        name: t.category_name,
      },
      subcategory: t.subcategory_id
        ? {
            id: t.subcategory_id,
            name: t.subcategory_name,
          }
        : null,
      pc: {
        id: t.pc_id,
        displayCode: t.display_code,
        pcNumber: t.pc_number,
        block: t.block_name,
        lab: t.lab_name,
        room: t.room_number,
      },
    };

    if (canView) {
      const summary = String(t.description || '');
      return {
        ...base,
        summary: summary.length > 90 ? `${summary.slice(0, 89).trimEnd()}…` : summary,
      };
    }

    return base;
  });

  return { matches };
};

/**
 * Service: Create a new ticket with ACID transaction, duplicate guard, and idempotency
 */
const createTicket = async (payload, { idempotencyKey = null, user }) => {
  const cacheKey = idempotencyKey ? `${user.id}:create:${idempotencyKey}` : null;
  // 1. Idempotency Check: Return previously processed response if double-submitted
  if (cacheKey) {
    const cached = idempotencyStore.get(cacheKey);
    if (cached) {
      return cached.data;
    }
  }

  const { pcId, categoryId, subcategoryId = null, urgency = 'LOW', description, remarks = null } = payload;

  // 2. Check PC exists and can accept reports
  const pc = await pcRepository.findPcById(pcId);
  if (!pc) {
    const error = new Error('Please choose a valid laboratory computer.');
    error.statusCode = 404;
    error.code = 'PC_NOT_FOUND';
    throw error;
  }

  const isReportable = pc.can_report !== undefined ? Boolean(pc.can_report) : (pc.canReport !== undefined ? Boolean(pc.canReport) : true);
  if (!isReportable) {
    const error = new Error(pc.notice || 'Issues cannot be reported for this PC at this time.');
    error.statusCode = 409;
    error.code = 'PC_NOT_REPORTABLE';
    throw error;
  }

  // 3. Check Category exists
  const category = await categoryRepository.findCategoryById(categoryId);
  if (!category) {
    const error = new Error('Please choose a valid issue category.');
    error.statusCode = 400;
    error.code = 'CATEGORY_NOT_FOUND';
    throw error;
  }

  if (subcategoryId) {
    const subcategory = await categoryRepository.findCategoryById(subcategoryId);
    if (!subcategory || String(subcategory.parent_id) !== String(category.id)) {
      const error = new Error('The selected subcategory does not belong to the selected category.');
      error.statusCode = 400;
      error.code = 'INVALID_SUBCATEGORY';
      throw error;
    }
  }

  // 4. Duplicate Guard: Check if identical open ticket already exists
  const openDuplicates = await ticketRepository.findPotentialDuplicates({ pcId, categoryId });
  const exactOpenDuplicate = openDuplicates.find(
    (t) =>
      String(t.reporter_id) === String(user.id) &&
      t.description.trim().toLowerCase() === description.trim().toLowerCase()
  );

  if (exactOpenDuplicate) {
    const pcLabel = pc.display_code || pc.displayCode || pc.id;
    const error = new Error(
      `You have already submitted an active request (${exactOpenDuplicate.id}) for this issue on PC ${pcLabel}.`
    );
    error.statusCode = 409;
    error.code = 'DUPLICATE_TICKET_EXISTS';
    error.existingTicketId = exactOpenDuplicate.id;
    throw error;
  }

  // 5. Create ticket and initial event inside transaction
  const createdTicket = await ticketRepository.createTicketWithInitialEvent({
    reporterId: user.id,
    pcId,
    categoryId,
    subcategoryId,
    urgency,
    description,
    remarks,
    attachmentIds: payload.attachmentIds || [],
  });

  // 6. Fetch complete ticket record with relations
  const fullTicket = await ticketRepository.findTicketById(createdTicket.id);
  const events = await ticketRepository.findTicketEvents(createdTicket.id);
  const attachments = await ticketRepository.findTicketAttachments(createdTicket.id);

  const formatted = formatTicketDto(fullTicket, user.id, user.role, events, [], attachments);

  // 7. Store in idempotency cache
  if (cacheKey) {
    idempotencyStore.set(cacheKey, {
      timestamp: Date.now(),
      data: formatted,
    });
  }

  return formatted;
};

/**
 * Service: List tickets for the authenticated teacher
 */
const listMyTickets = async ({ reporterId, status, urgency, categoryId, dateFrom, dateTo, search, sort, page, pageSize }) => {
  const result = await ticketRepository.findTickets({
    reporterId,
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

  const items = result.rows.map((row) => formatTicketListItemDto(row, reporterId));

  return {
    items,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
  };
};

/**
 * Service: Get single ticket details with authorization check
 */
const getTicketById = async (ticketId, currentUserId, userRole) => {
  const ticket = await ticketRepository.findTicketById(ticketId);

  if (!ticket) {
    const error = new Error("This request doesn't exist or has been removed.");
    error.statusCode = 404;
    error.code = 'TICKET_NOT_FOUND';
    throw error;
  }

  // Authorization check: Teachers can only view their own tickets
  const isOwn = String(ticket.reporter_id) === String(currentUserId);
  const isAdmin = isSupportRole(userRole);

  if (!isOwn && !isAdmin) {
    const error = new Error("You don't have permission to access another teacher's ticket.");
    error.statusCode = 403;
    error.code = 'FORBIDDEN_TICKET_ACCESS';
    throw error;
  }

  const events = await ticketRepository.findTicketEvents(ticketId);
  const comments = await ticketRepository.findTicketComments(ticketId, isAdmin);
  const attachments = await ticketRepository.findTicketAttachments(ticketId);

  return formatTicketDto(ticket, currentUserId, userRole, events, comments, attachments);
};

/**
 * Service: Fetch timeline history of a ticket
 */
const getTicketTimeline = async (ticketId, currentUserId, userRole) => {
  // Check ticket and permissions first
  await getTicketById(ticketId, currentUserId, userRole);

  const events = await ticketRepository.findTicketEvents(ticketId);
  return events.map((e) => ({
    id: e.id,
    type: e.event_type,
    at: e.created_at,
    note: e.note,
    actor: e.actor_id
      ? {
          id: e.actor_id,
          name: e.actor_name,
          role: e.actor_role,
        }
      : null,
  }));
};

/**
 * Service: Add a comment to a ticket
 */
const addComment = async (ticketId, { body, visibility = 'PUBLIC', attachmentIds = [] }, { user, idempotencyKey = null }) => {
  const cacheKey = idempotencyKey ? `${user.id}:comment:${ticketId}:${idempotencyKey}` : null;
  if (cacheKey) {
    const cached = idempotencyStore.get(cacheKey);
    if (cached) return cached.data;
  }

  const ticket = await ticketRepository.findTicketById(ticketId);
  if (!ticket) {
    const error = new Error('Ticket not found.');
    error.statusCode = 404;
    error.code = 'TICKET_NOT_FOUND';
    throw error;
  }
  assertTicketParticipant(ticket, user);

  if (ticket.status === 'CLOSED') {
    const error = new Error('This ticket is closed; comments cannot be added.');
    error.statusCode = 409;
    error.code = 'TICKET_CLOSED';
    throw error;
  }

  // Teachers can only post PUBLIC comments
  const effectiveVisibility = isSupportRole(user.role) ? visibility : 'PUBLIC';

  await ticketRepository.addComment(ticketId, user.id, body, effectiveVisibility, attachmentIds);

  const updatedTicket = await getTicketById(ticketId, user.id, user.role);

  if (cacheKey) {
    idempotencyStore.set(cacheKey, { timestamp: Date.now(), data: updatedTicket });
  }

  return updatedTicket;
};

/**
 * Service: Add additional information to a ticket
 */
const addInformation = async (ticketId, { message, attachmentIds = [] }, { user, idempotencyKey = null }) => {
  const cacheKey = idempotencyKey ? `${user.id}:information:${ticketId}:${idempotencyKey}` : null;
  if (cacheKey) {
    const cached = idempotencyStore.get(cacheKey);
    if (cached) return cached.data;
  }

  const ticket = await ticketRepository.findTicketById(ticketId);
  if (!ticket) {
    const error = new Error('Ticket not found.');
    error.statusCode = 404;
    error.code = 'TICKET_NOT_FOUND';
    throw error;
  }
  assertTicketParticipant(ticket, user);

  if (String(ticket.reporter_id) !== String(user.id)) {
    const error = new Error('Only the reporting teacher can add additional information.');
    error.statusCode = 403;
    error.code = 'FORBIDDEN_TICKET_ACCESS';
    throw error;
  }

  if (ticket.status === 'CLOSED') {
    const error = new Error('This ticket is already closed. Please report a new issue if needed.');
    error.statusCode = 409;
    error.code = 'TICKET_CLOSED';
    throw error;
  }

  await ticketRepository.addInformation(ticketId, user.id, message, attachmentIds);

  const updatedTicket = await getTicketById(ticketId, user.id, user.role);

  if (cacheKey) {
    idempotencyStore.set(cacheKey, { timestamp: Date.now(), data: updatedTicket });
  }

  return updatedTicket;
};

/**
 * Service: Submit repair verification (Confirm WORKING or NOT_WORKING)
 */
const submitVerification = async (ticketId, payload, { user, idempotencyKey = null }) => {
  const cacheKey = idempotencyKey ? `${user.id}:verification:${ticketId}:${idempotencyKey}` : null;
  if (cacheKey) {
    const cached = idempotencyStore.get(cacheKey);
    if (cached) return cached.data;
  }

  const ticket = await ticketRepository.findTicketById(ticketId);
  if (!ticket) {
    const error = new Error('Ticket not found.');
    error.statusCode = 404;
    error.code = 'TICKET_NOT_FOUND';
    throw error;
  }

  // Must be reporting teacher or admin
  const isOwn = String(ticket.reporter_id) === String(user.id);
  const isAdmin = user.role === 'ADMIN';

  if (!isOwn && !isAdmin) {
    const error = new Error('Only the reporting teacher can submit verification for this repair.');
    error.statusCode = 403;
    error.code = 'FORBIDDEN_VERIFICATION';
    throw error;
  }

  if (ticket.status !== 'AWAITING_VERIFICATION') {
    const error = new Error(
      `Cannot submit verification: Ticket status is '${ticket.status}', but must be 'AWAITING_VERIFICATION'.`
    );
    error.statusCode = 409;
    error.code = 'INVALID_STATUS_FOR_VERIFICATION';
    throw error;
  }

  const { result, explanation = '', comment = '', rating = null } = payload;

  await ticketRepository.submitVerification({
    ticketId,
    userId: user.id,
    result,
    explanation,
    comment,
    rating,
  });

  const updatedTicket = await getTicketById(ticketId, user.id, user.role);

  if (cacheKey) {
    idempotencyStore.set(cacheKey, { timestamp: Date.now(), data: updatedTicket });
  }

  return updatedTicket;
};

/**
 * Service: Inbound synchronization from Jira Service Management (Member 3)
 */
const syncFromJira = async (ticketId, payload) => {
  if (payload.status && !['SUBMITTED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'WAITING_FOR_INFO', 'FIXED', 'AWAITING_VERIFICATION', 'CLOSED', 'REOPENED'].includes(String(payload.status).toUpperCase())) {
    const error = new Error('Unsupported ticket status for synchronization.');
    error.statusCode = 400;
    error.code = 'INVALID_SYNC_STATUS';
    throw error;
  }
  return await ticketRepository.syncFromJira(ticketId, payload);
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
  formatTicketDto,
  formatTicketListItemDto,
};

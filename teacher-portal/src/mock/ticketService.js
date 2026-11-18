// src/mock/ticketService.js
// Mock ticket API — development only. It imitates what the backend + Jira
// integration (Members 2 and 3) will do: privacy checks, duplicate checks,
// status transitions and notifications. The real UI never changes a status
// itself; it always displays what the service returns.
import {
  delay,
  getDb,
  saveDb,
  mockError,
  currentTeacher,
  pcDto,
  attachmentDto,
  addNotification,
  nextId,
} from './db';
import { findCategory, findSubcategory } from './categoryService';

const URGENCIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export function canSeeTicket(ticket, teacherId) {
  return ticket.reporterId === teacherId || ticket.participantIds.includes(teacherId);
}

function categoryRef(ticket) {
  const cat = findCategory(ticket.categoryId);
  const sub = findSubcategory(cat, ticket.subcategoryId);
  return {
    category: cat ? { id: cat.id, code: cat.code, name: cat.name } : null,
    subcategory: sub ? { id: sub.id, name: sub.name } : null,
  };
}

function summaryOf(text) {
  const s = String(text || '');
  return s.length > 90 ? `${s.slice(0, 89).trimEnd()}…` : s;
}

/** Row shape used by lists (dashboard, My Requests, PC active tickets). */
export function ticketListItemDto(ticket, teacherId, { limited = false } = {}) {
  const db = getDb();
  const pc = pcDto(db.pcs.find((p) => p.id === ticket.pcId));
  const { category, subcategory } = categoryRef(ticket);
  const base = {
    id: ticket.id,
    status: ticket.status,
    urgency: ticket.urgency,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    category,
    subcategory,
    pc: pc && { id: pc.id, displayCode: pc.displayCode, block: pc.block, lab: pc.lab, room: pc.room },
    isOwn: ticket.reporterId === teacherId,
    canView: !limited,
  };
  // Another teacher's private request: no description, no reporter name.
  if (limited) return base;
  return { ...base, summary: summaryOf(ticket.description) };
}

/** Full ticket shape for the details page. */
function ticketDto(ticket, teacherId) {
  const db = getDb();
  const reporter = db.teachers.find((t) => t.id === ticket.reporterId);
  const { category, subcategory } = categoryRef(ticket);
  return {
    id: ticket.id,
    status: ticket.status,
    urgency: ticket.urgency,
    description: ticket.description,
    remarks: ticket.remarks,
    category,
    subcategory,
    pc: pcDto(db.pcs.find((p) => p.id === ticket.pcId)),
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    reporter: reporter ? { id: reporter.id, name: reporter.fullName } : null,
    isOwn: ticket.reporterId === teacherId,
    events: ticket.events,
    // NOTE: the mock deliberately includes INTERNAL comments so the frontend's
    // privacy filter (utils/visibility.js) can be tested. A real backend must
    // never send internal technician notes to the teacher portal.
    comments: ticket.comments.map((c) => ({
      ...c,
      attachments: (c.attachmentIds || []).map(attachmentDto).filter(Boolean),
    })),
    attachments: ticket.attachmentIds.map(attachmentDto).filter(Boolean),
    verification: ticket.verification,
    canVerify: ticket.status === 'AWAITING_VERIFICATION' && ticket.reporterId === teacherId,
    canComment: ticket.status !== 'CLOSED',
  };
}

function getVisibleTicket(ticketId, teacherId) {
  const ticket = getDb().tickets.find((t) => t.id === ticketId);
  if (!ticket) throw mockError(404, "This request doesn't exist or has been removed.", 'TICKET_NOT_FOUND');
  if (!canSeeTicket(ticket, teacherId)) {
    throw mockError(403, "You don't have access to this request.", 'FORBIDDEN');
  }
  return ticket;
}

function pushEvent(ticket, type, note = null, actor = null) {
  const at = new Date().toISOString();
  ticket.events.push({ id: nextId('ev'), type, at, note, actor });
  ticket.updatedAt = at;
}

function validateAttachmentIds(ids = []) {
  const db = getDb();
  const bad = ids.filter((id) => !db.attachments[id]);
  if (bad.length) throw mockError(400, 'One of the attachments could not be found. Please upload it again.');
}

function withIdempotency(key, run) {
  const db = getDb();
  if (key && db.idempotency[key]) return db.idempotency[key];
  const result = run();
  if (key) db.idempotency[key] = result;
  return result;
}

function addTeacherComment(ticket, teacher, body, attachmentIds) {
  ticket.comments.push({
    id: nextId('c'),
    author: { id: teacher.id, name: teacher.fullName, role: 'TEACHER' },
    body,
    createdAt: new Date().toISOString(),
    visibility: 'PUBLIC',
    attachmentIds,
  });
  if (ticket.status === 'WAITING_FOR_INFO') {
    ticket.status = 'IN_PROGRESS';
    pushEvent(ticket, 'INFO_PROVIDED', 'Teacher replied with more information.', {
      id: teacher.id,
      name: teacher.fullName,
      role: 'TEACHER',
    });
  } else {
    ticket.updatedAt = new Date().toISOString();
  }
}

// Mock only: pretend the lab team acknowledges new tickets after a short wait,
// so notifications and the timeline can be seen updating.
function simulateAcknowledge(ticketId) {
  setTimeout(() => {
    const db = getDb();
    const t = db.tickets.find((x) => x.id === ticketId);
    if (!t || t.status !== 'SUBMITTED') return;
    t.status = 'ACKNOWLEDGED';
    pushEvent(t, 'ACKNOWLEDGED');
    addNotification(t.reporterId, 'TICKET_ACKNOWLEDGED', t.id, 'Request acknowledged', `${t.id} has been acknowledged by the lab team.`);
    saveDb();
  }, 20000);
}

export const mockTicketService = {
  async listMyTickets(params = {}) {
    await delay();
    const me = currentTeacher();
    const {
      search = '',
      status = '',
      urgency = '',
      categoryId = '',
      dateFrom = '',
      dateTo = '',
      sort = 'newest',
      page = 1,
      pageSize = 10,
    } = params;
    const db = getDb();
    const q = String(search).trim().toLowerCase();

    let rows = db.tickets.filter((t) => canSeeTicket(t, me.id));
    if (status) rows = rows.filter((t) => String(status).split(',').includes(t.status));
    if (urgency) rows = rows.filter((t) => t.urgency === urgency);
    if (categoryId) rows = rows.filter((t) => t.categoryId === categoryId);
    if (dateFrom) rows = rows.filter((t) => t.createdAt.slice(0, 10) >= dateFrom);
    if (dateTo) rows = rows.filter((t) => t.createdAt.slice(0, 10) <= dateTo);
    if (q) {
      rows = rows.filter((t) => {
        const pc = db.pcs.find((p) => p.id === t.pcId);
        return t.id.toLowerCase().includes(q) || (pc && pc.displayCode.toLowerCase().includes(q));
      });
    }
    rows.sort((a, b) => (sort === 'oldest' ? (a.createdAt > b.createdAt ? 1 : -1) : a.createdAt < b.createdAt ? 1 : -1));

    const size = Math.max(1, Number(pageSize));
    const total = rows.length;
    const current = Math.min(Math.max(1, Number(page)), Math.max(1, Math.ceil(total / size)));
    const items = rows.slice((current - 1) * size, current * size).map((t) => ticketListItemDto(t, me.id));
    return { items, total, page: current, pageSize: size };
  },

  async getTicket(ticketId) {
    await delay();
    const me = currentTeacher();
    return ticketDto(getVisibleTicket(ticketId, me.id), me.id);
  },

  async checkDuplicates({ pcId, categoryId }) {
    await delay();
    const me = currentTeacher();
    const matches = getDb()
      .tickets.filter((t) => t.pcId === pcId && t.status !== 'CLOSED')
      .map((t) => ({
        ...ticketListItemDto(t, me.id, { limited: !canSeeTicket(t, me.id) }),
        sameCategory: t.categoryId === categoryId,
      }))
      .sort((a, b) => Number(b.sameCategory) - Number(a.sameCategory));
    return { matches };
  },

  async createTicket(payload, { idempotencyKey } = {}) {
    await delay(700);
    const me = currentTeacher();
    const db = getDb();
    const ticketId = withIdempotency(idempotencyKey, () => {
      const pc = db.pcs.find((p) => p.id === payload.pcId);
      if (!pc) throw mockError(400, 'Please choose a valid PC.');
      if (pc.canReport === false) throw mockError(409, pc.notice || 'Issues cannot be reported for this PC.');
      const cat = findCategory(payload.categoryId);
      if (!cat) throw mockError(400, 'Please choose an issue category.');
      if (cat.subcategories.length && !findSubcategory(cat, payload.subcategoryId)) {
        throw mockError(400, 'Please choose a subcategory.');
      }
      if (!String(payload.description || '').trim()) throw mockError(400, 'Please describe the issue.');
      if (!URGENCIES.includes(payload.urgency)) throw mockError(400, 'Please choose an urgency level.');
      validateAttachmentIds(payload.attachmentIds);

      const id = `LAB-${db.nextTicketNumber}`;
      db.nextTicketNumber += 1;
      const now = new Date().toISOString();
      db.tickets.unshift({
        id,
        reporterId: me.id,
        participantIds: [me.id],
        pcId: pc.id,
        categoryId: cat.id,
        subcategoryId: cat.subcategories.length ? payload.subcategoryId : null,
        urgency: payload.urgency,
        status: 'SUBMITTED',
        description: String(payload.description).trim(),
        remarks: String(payload.remarks || '').trim(),
        attachmentIds: payload.attachmentIds || [],
        comments: [],
        verification: null,
        createdAt: now,
        updatedAt: now,
        events: [{ id: nextId('ev'), type: 'SUBMITTED', at: now, note: null, actor: null }],
      });
      addNotification(me.id, 'TICKET_SUBMITTED', id, 'Request submitted', `${id} for PC ${pc.displayCode} was submitted successfully.`);
      simulateAcknowledge(id);
      return id;
    });
    saveDb();
    return ticketDto(db.tickets.find((t) => t.id === ticketId), me.id);
  },

  /** Add details to an existing active ticket (also used for another teacher's ticket). */
  async addInformation(ticketId, { message, attachmentIds = [] }, { idempotencyKey } = {}) {
    await delay(600);
    const me = currentTeacher();
    const db = getDb();
    const ticket = db.tickets.find((t) => t.id === ticketId);
    if (!ticket) throw mockError(404, "This request doesn't exist or has been removed.");
    if (ticket.status === 'CLOSED') throw mockError(409, 'This request is already closed. Please report a new issue.');
    if (!String(message || '').trim()) throw mockError(400, 'Please add some information.');
    withIdempotency(idempotencyKey, () => {
      validateAttachmentIds(attachmentIds);
      ticket.attachmentIds.push(...attachmentIds);
      if (!ticket.participantIds.includes(me.id)) ticket.participantIds.push(me.id);
      pushEvent(ticket, 'INFO_ADDED', `Additional information added by ${me.fullName}.`, {
        id: me.id,
        name: me.fullName,
        role: 'TEACHER',
      });
      addTeacherComment(ticket, me, String(message).trim(), attachmentIds);
      return ticket.id;
    });
    saveDb();
    return ticketDto(ticket, me.id);
  },

  async addComment(ticketId, { body, attachmentIds = [] }, { idempotencyKey } = {}) {
    await delay(500);
    const me = currentTeacher();
    const ticket = getVisibleTicket(ticketId, me.id);
    if (ticket.status === 'CLOSED') throw mockError(409, 'This request is closed, so comments are turned off.');
    if (!String(body || '').trim() && !attachmentIds.length) throw mockError(400, 'Please write a message.');
    withIdempotency(idempotencyKey, () => {
      validateAttachmentIds(attachmentIds);
      addTeacherComment(ticket, me, String(body || '').trim(), attachmentIds);
      return ticket.id;
    });
    saveDb();
    return ticketDto(ticket, me.id);
  },

  async submitVerification(ticketId, payload, { idempotencyKey } = {}) {
    await delay(700);
    const me = currentTeacher();
    const ticket = getVisibleTicket(ticketId, me.id);
    const { result, explanation = '', comment = '', rating = null } = payload || {};

    withIdempotency(idempotencyKey, () => {
      if (ticket.status !== 'AWAITING_VERIFICATION' || ticket.reporterId !== me.id) {
        throw mockError(409, 'This request is not waiting for your verification any more.');
      }
      if (rating != null && !(Number.isInteger(rating) && rating >= 1 && rating <= 5)) {
        throw mockError(400, 'Rating must be between 1 and 5.');
      }
      const actor = { id: me.id, name: me.fullName, role: 'TEACHER' };
      if (result === 'WORKING') {
        ticket.verification = { result, comment: comment.trim(), rating, at: new Date().toISOString() };
        pushEvent(ticket, 'VERIFIED', 'Teacher confirmed the PC is working.', actor);
        ticket.status = 'CLOSED';
        pushEvent(ticket, 'CLOSED');
        if (comment.trim()) addTeacherComment(ticket, me, comment.trim(), []);
        addNotification(me.id, 'TICKET_CLOSED', ticket.id, 'Request closed', `${ticket.id} is closed. Thank you for verifying.`);
      } else if (result === 'NOT_WORKING') {
        if (!explanation.trim()) throw mockError(400, 'Please explain what is still not working.');
        ticket.verification = {
          result,
          explanation: explanation.trim(),
          comment: comment.trim(),
          rating,
          at: new Date().toISOString(),
        };
        ticket.status = 'REOPENED';
        pushEvent(ticket, 'REOPENED', 'Teacher reported the problem is still there.', actor);
        addTeacherComment(ticket, me, explanation.trim(), []);
        addNotification(me.id, 'TICKET_REOPENED', ticket.id, 'Request reopened', `${ticket.id} was reopened after your feedback.`);
      } else {
        throw mockError(400, 'Please choose whether the PC is working.');
      }
      return ticket.id;
    });
    saveDb();
    return ticketDto(ticket, me.id);
  },
};

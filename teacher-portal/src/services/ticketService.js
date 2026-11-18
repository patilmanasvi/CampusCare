// src/services/ticketService.js
// Ticket workflow lives in Jira Service Management, reached ONLY through the
// Express backend. The frontend never changes a status by itself: it sends
// the teacher's action and shows whatever ticket the backend returns.
import api from './api';
import { ENDPOINTS } from './endpoints';
import { USE_MOCK_API } from '../config/env';
import { mockTicketService } from '../mock/ticketService';

const realTicketService = {
  /** params: { search, status, urgency, categoryId, dateFrom, dateTo, sort, page, pageSize } */
  async listMyTickets(params = {}) {
    const { data } = await api.get(ENDPOINTS.tickets.list, { params });
    return data; // { items, total, page, pageSize }
  },
  async getTicket(ticketId) {
    const { data } = await api.get(ENDPOINTS.tickets.detail(ticketId));
    return data?.ticket ?? data;
  },
  /** Returns { matches: [...] } — active tickets the backend thinks may be related. */
  async checkDuplicates({ pcId, categoryId, subcategoryId }) {
    const { data } = await api.post(ENDPOINTS.tickets.duplicateCheck, { pcId, categoryId, subcategoryId });
    return data;
  },
  /** idempotencyKey stops a double-click from creating two tickets. */
  async createTicket(payload, { idempotencyKey } = {}) {
    const { data } = await api.post(ENDPOINTS.tickets.create, payload, {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    });
    return data?.ticket ?? data;
  },
  async addInformation(ticketId, { message, attachmentIds = [] }, { idempotencyKey } = {}) {
    const { data } = await api.post(
      ENDPOINTS.tickets.addInformation(ticketId),
      { message, attachmentIds },
      { headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined }
    );
    return data?.ticket ?? data;
  },
  async addComment(ticketId, { body, attachmentIds = [] }, { idempotencyKey } = {}) {
    const { data } = await api.post(
      ENDPOINTS.tickets.comments(ticketId),
      { body, attachmentIds },
      { headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined }
    );
    return data?.ticket ?? data;
  },
  /** payload: { result: 'WORKING' | 'NOT_WORKING', explanation?, comment?, rating? } */
  async submitVerification(ticketId, payload, { idempotencyKey } = {}) {
    const { data } = await api.post(ENDPOINTS.tickets.verification(ticketId), payload, {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    });
    return data?.ticket ?? data;
  },
};

export const ticketService = USE_MOCK_API ? mockTicketService : realTicketService;

import { API_BASE_URL } from '../config/env';

export function backendUrl(path) {
  if (!path || /^https?:\/\//i.test(path)) return path;
  try {
    return new URL(path, `${API_BASE_URL.replace(/\/$/, '')}/`).toString();
  } catch {
    return path;
  }
}

export function normalizeAttachment(attachment) {
  if (!attachment) return attachment;
  return {
    ...attachment,
    size: Number(attachment.size) || 0,
    url: backendUrl(attachment.url),
  };
}

export function normalizeTicket(ticket) {
  if (!ticket || typeof ticket !== 'object') return ticket;
  return {
    ...ticket,
    attachments: (ticket.attachments || []).map(normalizeAttachment),
    comments: (ticket.comments || []).map((comment) => ({
      ...comment,
      attachments: (comment.attachments || []).map(normalizeAttachment),
    })),
  };
}

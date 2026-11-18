// src/components/tickets/TicketConversation.jsx
// Technician updates and teacher replies. PRIVACY: only comments explicitly
// marked customer-visible are rendered (see utils/visibility.js).
import React, { useMemo, useRef, useState } from 'react';
import { Loader2, Send, Wrench } from 'lucide-react';
import { ticketService } from '../../services/ticketService';
import { useAttachments } from '../../hooks/useAttachments';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { customerVisibleOnly } from '../../utils/visibility';
import { getErrorMessage } from '../../utils/errors';
import { createId } from '../../utils/id';
import { formatDateTime, timeAgo } from '../../utils/format';
import AttachmentUploader from '../AttachmentUploader';
import AttachmentList from './AttachmentList';
import Avatar from '../profile/Avatar';
import { Alert } from '../common/States';

function CommentBubble({ comment, isMe }) {
  const isTech = comment.author?.role === 'TECHNICIAN';
  return (
    <li className="flex gap-3">
      {isTech ? (
        <span
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900"
          aria-hidden="true"
        >
          <Wrench size={16} />
        </span>
      ) : (
        <Avatar name={comment.author?.name} />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {isMe ? 'You' : comment.author?.name || (isTech ? 'Lab technician' : 'Teacher')}
          </p>
          {isTech && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-700 dark:bg-dark-raised dark:text-gray-300">
              Technician
            </span>
          )}
          <time dateTime={comment.createdAt} title={formatDateTime(comment.createdAt)} className="text-xs muted">
            {timeAgo(comment.createdAt)}
          </time>
        </div>
        <div
          className={`mt-1 rounded-lg px-3.5 py-2.5 text-sm ${
            isTech
              ? 'bg-gray-100 text-gray-900 dark:bg-dark-raised dark:text-gray-100'
              : 'bg-primary-50 text-gray-900 dark:bg-primary-500/15 dark:text-gray-100'
          }`}
        >
          {comment.body && <p className="whitespace-pre-wrap break-words">{comment.body}</p>}
          {comment.attachments?.length > 0 && <AttachmentList attachments={comment.attachments} className="mt-2" />}
        </div>
      </div>
    </li>
  );
}

export default function TicketConversation({ ticket, onUpdated }) {
  const { user } = useAuth();
  const toast = useToast();
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const attachments = useAttachments();
  const idempotencyKey = useRef(createId());

  const comments = useMemo(
    () => customerVisibleOnly(ticket.comments).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)),
    [ticket.comments]
  );
  const needsReply = ticket.status === 'WAITING_FOR_INFO';
  const canComment = ticket.canComment !== false;

  const send = async (e) => {
    e.preventDefault();
    if (sending) return;
    if (!body.trim() && !attachments.items.length) {
      setError('Write a message or attach a file.');
      return;
    }
    setError('');
    setSending(true);
    try {
      const attachmentIds = await attachments.uploadAll();
      const updated = await ticketService.addComment(
        ticket.id,
        { body: body.trim(), attachmentIds },
        { idempotencyKey: idempotencyKey.current }
      );
      setBody('');
      attachments.clear();
      idempotencyKey.current = createId();
      onUpdated?.(updated);
      toast.success(needsReply ? 'Reply sent to the technician.' : 'Comment added.');
    } catch (err) {
      setError(getErrorMessage(err, 'Your message was not sent. Please try again.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      {needsReply && (
        <Alert type="warning" className="mb-4" title="The technician needs more information">
          Please reply below so they can continue working on this request.
        </Alert>
      )}

      {comments.length === 0 ? (
        <p className="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm muted dark:bg-dark-raised/50">
          No updates yet. The technician's messages will appear here.
        </p>
      ) : (
        <ul className="space-y-5">
          {comments.map((c) => (
            <CommentBubble key={c.id} comment={c} isMe={c.author?.id && c.author.id === user?.id} />
          ))}
        </ul>
      )}

      {canComment ? (
        <form onSubmit={send} className="mt-6 space-y-3 border-t border-gray-200 pt-5 dark:border-dark-border" noValidate>
          {error && <Alert type="error">{error}</Alert>}
          <div>
            <label htmlFor="comment-body" className="label">
              {needsReply ? 'Your reply' : 'Add a comment'}
            </label>
            <textarea
              id="comment-body"
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={sending}
              placeholder={needsReply ? 'Answer the technician’s question…' : 'Add more details or ask a question…'}
              className="input"
            />
          </div>
          <AttachmentUploader
            compact
            items={attachments.items}
            onAdd={attachments.addFiles}
            onRemove={attachments.removeItem}
            disabled={sending}
            label="Add screenshots or files"
          />
          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={sending}>
              {sending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
              {sending ? 'Sending…' : needsReply ? 'Send reply' : 'Post comment'}
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-6 border-t border-gray-200 pt-4 text-sm muted dark:border-dark-border">
          This request is closed, so new comments are turned off. Report a new issue if the problem comes back.
        </p>
      )}
    </div>
  );
}

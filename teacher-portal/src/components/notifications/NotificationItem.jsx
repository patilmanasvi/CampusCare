// src/components/notifications/NotificationItem.jsx
import React from 'react';
import { Send, Inbox, MessageSquare, CircleCheck, Hourglass, ShieldCheck, RotateCcw, Bell, Check } from 'lucide-react';
import { timeAgo } from '../../utils/format';

const TYPE_ICON = {
  TICKET_SUBMITTED: Send,
  TICKET_ACKNOWLEDGED: Inbox,
  INFO_REQUESTED: MessageSquare,
  TICKET_FIXED: CircleCheck,
  VERIFICATION_PENDING: Hourglass,
  TICKET_CLOSED: ShieldCheck,
  TICKET_REOPENED: RotateCcw,
};

export default function NotificationItem({ notification, onOpen, onMarkRead, compact = false }) {
  const Icon = TYPE_ICON[notification.type] || Bell;
  const unread = !notification.read;
  return (
    <div
      className={`group relative flex gap-3 px-4 ${compact ? 'py-3' : 'py-4'} ${
        unread ? 'bg-primary-50/60 dark:bg-primary-500/10' : ''
      }`}
    >
      <span
        className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          unread
            ? 'bg-primary text-white'
            : 'bg-gray-100 text-gray-500 dark:bg-dark-raised dark:text-gray-400'
        }`}
        aria-hidden="true"
      >
        <Icon size={16} />
      </span>
      <button
        type="button"
        onClick={() => onOpen(notification)}
        className="min-w-0 flex-1 rounded text-left after:absolute after:inset-0 after:content-['']"
      >
        <span className="flex items-center gap-2">
          <span className={`truncate text-sm ${unread ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-800 dark:text-gray-200'}`}>
            {notification.title}
          </span>
          {unread && (
            <span className="h-2 w-2 shrink-0 rounded-full bg-primary dark:bg-primary-300">
              <span className="sr-only">Unread</span>
            </span>
          )}
        </span>
        <span className={`mt-0.5 block text-sm muted ${compact ? 'line-clamp-2' : ''}`}>{notification.message}</span>
        <span className="mt-1 block text-xs muted">{timeAgo(notification.createdAt)}</span>
      </button>
      {unread && onMarkRead && (
        <button
          type="button"
          onClick={() => onMarkRead(notification)}
          className="icon-btn relative z-10 h-8 w-8 shrink-0 self-start"
          aria-label={`Mark "${notification.title}" as read`}
          title="Mark as read"
        >
          <Check size={16} />
        </button>
      )}
    </div>
  );
}

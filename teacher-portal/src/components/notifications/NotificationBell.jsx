// src/components/notifications/NotificationBell.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/errors';
import NotificationItem from './NotificationItem';
import LoadingSpinner from '../common/LoadingSpinner';

export default function NotificationBell() {
  const { recent, unreadCount, loading, error, refresh, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    if (!open) return undefined;
    refresh();
    const onDoc = (e) => wrapRef.current && !wrapRef.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, refresh]);

  const openNotification = async (n) => {
    setOpen(false);
    if (n.ticketId) navigate(`/my-requests/${encodeURIComponent(n.ticketId)}`);
    if (!n.read) markRead(n.id).catch(() => {});
  };

  const handleMarkAll = async () => {
    try {
      await markAllRead();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not mark notifications as read.'));
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        className="icon-btn relative"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-[18px] text-white ring-2 ring-white dark:ring-dark-surface">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-2 top-16 z-40 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-pop sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96 dark:border-dark-border dark:bg-dark-surface">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-dark-border">
            <p className="font-semibold text-gray-900 dark:text-white">Notifications</p>
            {unreadCount > 0 && (
              <button type="button" className="btn-ghost btn-sm" onClick={handleMarkAll}>
                <CheckCheck size={14} aria-hidden="true" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[60vh] divide-y divide-gray-100 overflow-y-auto dark:divide-dark-border">
            {loading && !recent.length && <LoadingSpinner label="Loading notifications…" />}
            {error && !recent.length && (
              <p className="px-4 py-6 text-center text-sm text-red-700 dark:text-red-300">
                {getErrorMessage(error, "Couldn't load notifications.")}
              </p>
            )}
            {!loading && !error && !recent.length && (
              <p className="px-4 py-8 text-center text-sm muted">You're all caught up.</p>
            )}
            {recent.map((n) => (
              <NotificationItem key={n.id} notification={n} onOpen={openNotification} compact />
            ))}
          </div>
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-gray-200 px-4 py-3 text-center text-sm font-medium text-primary hover:bg-gray-50 dark:border-dark-border dark:text-primary-300 dark:hover:bg-dark-raised"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}

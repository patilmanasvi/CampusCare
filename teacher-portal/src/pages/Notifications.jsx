// src/pages/Notifications.jsx
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCheck, BellOff, Loader2 } from 'lucide-react';
import { notificationService } from '../services/notificationService';
import { useNotifications } from '../context/NotificationContext';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../utils/errors';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { EmptyState, ErrorState } from '../components/common/States';
import NotificationItem from '../components/notifications/NotificationItem';

const PAGE_SIZE = 15;

export default function Notifications() {
  const navigate = useNavigate();
  const toast = useToast();
  const { unreadCount, refresh: refreshBell, markRead: ctxMarkRead, markAllRead: ctxMarkAll } = useNotifications();
  const [filter, setFilter] = useState('all');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(
    async (nextPage = 1) => {
      if (nextPage === 1) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const data = await notificationService.list({ unreadOnly: filter === 'unread', page: nextPage, pageSize: PAGE_SIZE });
        setItems((prev) => (nextPage === 1 ? data.items : [...prev, ...data.items]));
        setTotal(data.total ?? data.items.length);
        setPage(nextPage);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filter]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const markRead = async (n) => {
    setItems((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    try {
      await ctxMarkRead(n.id);
    } catch (err) {
      setItems((list) => list.map((x) => (x.id === n.id ? { ...x, read: false } : x)));
      toast.error(getErrorMessage(err, 'Could not mark as read.'));
    }
  };

  const open = (n) => {
    if (!n.read) markRead(n);
    if (n.ticketId) navigate(`/my-requests/${encodeURIComponent(n.ticketId)}`);
  };

  const markAll = async () => {
    setMarkingAll(true);
    try {
      await ctxMarkAll();
      if (filter === 'unread') {
        setItems([]);
        setTotal(0);
      } else {
        setItems((list) => list.map((x) => ({ ...x, read: true })));
      }
      refreshBell();
      toast.success('All notifications marked as read.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not mark notifications as read.'));
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Notifications"
        description="Updates about your requests. Important updates are also sent to your college email."
        actions={
          <button type="button" className="btn-secondary" onClick={markAll} disabled={markingAll || unreadCount === 0}>
            {markingAll ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <CheckCheck size={16} aria-hidden="true" />}
            Mark all as read
          </button>
        }
      />

      <div className="mb-4 inline-flex rounded-md border border-gray-300 bg-white p-1 dark:border-dark-border dark:bg-dark-surface" role="tablist" aria-label="Filter notifications">
        {[
          ['all', 'All'],
          ['unread', `Unread${unreadCount ? ` (${unreadCount})` : ''}`],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={filter === value}
            onClick={() => setFilter(value)}
            className={`min-h-[36px] rounded px-4 text-sm font-medium ${
              filter === value ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-dark-raised'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <Card padded={false} className="overflow-hidden">
        {loading && <LoadingSpinner label="Loading notifications…" />}
        {!loading && error && <ErrorState error={error} title="Couldn't load notifications" onRetry={() => load(1)} />}
        {!loading && !error && items.length === 0 && (
          <EmptyState
            icon={BellOff}
            title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            description="You'll be notified here when the lab team updates one of your requests."
          />
        )}
        {!loading && !error && items.length > 0 && (
          <ul className="divide-y divide-gray-100 dark:divide-dark-border">
            {items.map((n) => (
              <li key={n.id}>
                <NotificationItem notification={n} onOpen={open} onMarkRead={markRead} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      {!loading && !error && items.length < total && (
        <div className="mt-4 flex justify-center">
          <button type="button" className="btn-secondary" onClick={() => load(page + 1)} disabled={loadingMore}>
            {loadingMore && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            Load more
          </button>
        </div>
      )}
    </div>
  );
}

// src/pages/Dashboard.jsx
import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { QrCode, FilePlus2, ChevronRight, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useApi } from '../hooks/useApi';
import { dashboardService } from '../services/dashboardService';
import { firstName } from '../utils/format';
import SummaryCards from '../components/dashboard/SummaryCards';
import TicketList from '../components/tickets/TicketList';
import NotificationItem from '../components/notifications/NotificationItem';
import Card, { CardHeader } from '../components/common/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { EmptyState, ErrorState } from '../components/common/States';

function contextMessage(summary) {
  if (!summary) return 'Here is an overview of your lab support requests.';
  if (summary.awaitingVerification > 0) {
    const n = summary.awaitingVerification;
    return `${n} ${n === 1 ? 'repair is' : 'repairs are'} waiting for you to check. Please verify when you can.`;
  }
  const active = (summary.open || 0) + (summary.inProgress || 0);
  if (active > 0) return `You have ${active} active ${active === 1 ? 'request' : 'requests'} with the lab team.`;
  return 'No open requests right now. Report a problem any time by scanning a PC’s QR code.';
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { recent: notifications, refresh: refreshNotifications, markRead, loading: notifLoading } = useNotifications();
  const summary = useApi(() => dashboardService.getSummary(), []);
  const recent = useApi(() => dashboardService.getRecentRequests({ limit: 5 }), []);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  const openNotification = (n) => {
    if (n.ticketId) navigate(`/my-requests/${encodeURIComponent(n.ticketId)}`);
    if (!n.read) markRead(n.id).catch(() => {});
  };

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl dark:text-white">
          Welcome back, {firstName(user?.fullName || user?.name || 'Teacher')}!
        </h1>
        <p className="mt-1 text-sm muted sm:text-base">{contextMessage(summary.data)}</p>
      </section>

      <section aria-label="Quick actions" className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/scan-qr"
          className="group flex items-center gap-4 rounded-lg bg-primary p-4 text-white shadow-card transition-colors hover:bg-primary-dark sm:p-5"
        >
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-white/15" aria-hidden="true">
            <QrCode size={24} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Scan QR Code</span>
            <span className="block text-sm text-white/80">Point your camera at the sticker on the PC</span>
          </span>
          <ChevronRight size={20} className="shrink-0 opacity-80" aria-hidden="true" />
        </Link>
        <Link
          to="/report-issue"
          className="card group flex items-center gap-4 p-4 transition-colors hover:border-primary-300 sm:p-5 dark:hover:border-primary-400/60"
        >
          <span
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary dark:bg-primary-500/20 dark:text-primary-200"
            aria-hidden="true"
          >
            <FilePlus2 size={24} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-gray-900 dark:text-white">Report an Issue Manually</span>
            <span className="block text-sm muted">Choose the block, lab and PC yourself</span>
          </span>
          <ChevronRight size={20} className="shrink-0 text-gray-400" aria-hidden="true" />
        </Link>
      </section>

      <section aria-label="Request summary">
        {summary.error ? (
          <Card>
            <ErrorState error={summary.error} title="Couldn't load your summary" onRetry={summary.reload} />
          </Card>
        ) : (
          <SummaryCards summary={summary.data} loading={summary.loading} />
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="xl:col-span-2" aria-labelledby="recent-requests-title">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="recent-requests-title" className="section-title">
              Recent requests
            </h2>
            <Link to="/my-requests" className="link text-sm">
              View all
            </Link>
          </div>
          {recent.loading && (
            <Card>
              <LoadingSpinner label="Loading recent requests…" />
            </Card>
          )}
          {recent.error && (
            <Card>
              <ErrorState error={recent.error} title="Couldn't load recent requests" onRetry={recent.reload} />
            </Card>
          )}
          {!recent.loading && !recent.error && recent.data?.length === 0 && (
            <Card>
              <EmptyState
                title="No requests yet"
                description="When you report a problem with a lab PC, it will appear here."
                action={
                  <Link to="/scan-qr" className="btn-primary">
                    <QrCode size={16} aria-hidden="true" /> Scan a QR code
                  </Link>
                }
              />
            </Card>
          )}
          {!recent.loading && !recent.error && recent.data?.length > 0 && <TicketList tickets={recent.data} compact />}
        </section>

        <section aria-labelledby="recent-notifications-title">
          <Card padded={false}>
            <div className="px-4 pt-4 sm:px-5 sm:pt-5">
              <CardHeader
                icon={Bell}
                title={<span id="recent-notifications-title">Notifications</span>}
                action={
                  <Link to="/notifications" className="link text-sm">
                    View all
                  </Link>
                }
              />
            </div>
            <div className="divide-y divide-gray-100 border-t border-gray-100 dark:divide-dark-border dark:border-dark-border">
              {notifLoading && !notifications.length && <LoadingSpinner label="Loading…" />}
              {!notifLoading && !notifications.length && (
                <p className="px-5 py-8 text-center text-sm muted">You're all caught up.</p>
              )}
              {notifications.slice(0, 4).map((n) => (
                <NotificationItem key={n.id} notification={n} onOpen={openNotification} compact />
              ))}
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}

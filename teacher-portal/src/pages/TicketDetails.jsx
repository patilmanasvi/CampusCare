// src/pages/TicketDetails.jsx
import React from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Lock, SearchX, MessageSquare, Paperclip, Activity, Monitor, Star } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { ticketService } from '../services/ticketService';
import { formatDateTime } from '../utils/format';
import PageHeader from '../components/common/PageHeader';
import Card, { CardHeader } from '../components/common/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';
import UrgencyBadge from '../components/common/UrgencyBadge';
import { Alert, EmptyState, ErrorState } from '../components/common/States';
import PcSummaryCard from '../components/pc/PcSummaryCard';
import TicketTimeline from '../components/tickets/TicketTimeline';
import TicketConversation from '../components/tickets/TicketConversation';
import VerificationPanel from '../components/tickets/VerificationPanel';
import FeedbackSummary from '../components/tickets/FeedbackSummary';
import AttachmentList from '../components/tickets/AttachmentList';

function Detail({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide muted">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{children}</dd>
    </div>
  );
}

export default function TicketDetails() {
  const { ticketId } = useParams();
  const location = useLocation();
  const justCreated = location.state?.justCreated;
  const ticket = useApi(() => ticketService.getTicket(ticketId), [ticketId]);
  const t = ticket.data;

  if (ticket.loading && !t) return <LoadingSpinner label="Loading request…" />;

  if (ticket.error && !t) {
    const status = ticket.error.status;
    return (
      <Card>
        {status === 403 ? (
          <EmptyState
            icon={Lock}
            title="You don't have access to this request"
            description="Requests are only visible to the teacher who reported them and anyone they were shared with."
            action={<Link to="/my-requests" className="btn-primary">Back to My Requests</Link>}
          />
        ) : status === 404 ? (
          <EmptyState
            icon={SearchX}
            title="Request not found"
            description={`We couldn't find ${ticketId}. Check the ticket ID and try again.`}
            action={<Link to="/my-requests" className="btn-primary">Back to My Requests</Link>}
          />
        ) : (
          <ErrorState error={ticket.error} title="Couldn't load this request" onRetry={ticket.reload} />
        )}
      </Card>
    );
  }

  if (!t) return null;
  const onUpdated = (updated) => updated && ticket.setData(updated);

  return (
    <div>
      <PageHeader
        backTo="/my-requests"
        backLabel="My Requests"
        title={<span className="font-mono">{t.id}</span>}
        description={`${t.category?.name || 'Issue'}${t.subcategory ? ` › ${t.subcategory.name}` : ''} · ${t.pc?.displayCode || ''}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={t.status} />
            <UrgencyBadge urgency={t.urgency} />
          </div>
        }
      />

      {justCreated && (
        <Alert type="success" className="mb-5" title={`Request ${t.id} submitted`}>
          The lab team has been notified. You'll get a notification and an email when it's updated.
        </Alert>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="min-w-0 space-y-5 lg:col-span-2">
          {t.canVerify && <VerificationPanel ticket={t} onUpdated={onUpdated} />}

          <Card>
            <CardHeader icon={Activity} title="Progress" />
            <TicketTimeline ticket={t} />
          </Card>

          <Card>
            <CardHeader title="Issue details" />
            <dl className="grid gap-4 sm:grid-cols-2">
              <Detail label="Category">{t.category?.name || '—'}</Detail>
              <Detail label="Subcategory">{t.subcategory?.name || '—'}</Detail>
              <Detail label="Urgency">
                <UrgencyBadge urgency={t.urgency} size="sm" />
              </Detail>
              <Detail label="Reported">{formatDateTime(t.createdAt)}</Detail>
              <div className="sm:col-span-2">
                <Detail label="Description">
                  <span className="whitespace-pre-wrap">{t.description}</span>
                </Detail>
              </div>
              {t.remarks && (
                <div className="sm:col-span-2">
                  <Detail label="Additional remarks">
                    <span className="whitespace-pre-wrap">{t.remarks}</span>
                  </Detail>
                </div>
              )}
            </dl>
          </Card>

          <Card>
            <CardHeader icon={MessageSquare} title="Updates & comments" />
            <TicketConversation ticket={t} onUpdated={onUpdated} />
          </Card>
        </div>

        <aside className="min-w-0 space-y-5">
          <section aria-label="PC information">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <Monitor size={16} aria-hidden="true" /> PC
            </h2>
            <PcSummaryCard pc={t.pc} />
          </section>

          <Card>
            <CardHeader icon={Paperclip} title="Attachments" />
            {t.attachments?.length ? (
              <AttachmentList attachments={t.attachments} singleColumn />
            ) : (
              <p className="text-sm muted">No attachments.</p>
            )}
          </Card>

          {t.verification && (
            <Card>
              <CardHeader icon={Star} title="Your feedback" />
              <FeedbackSummary verification={t.verification} />
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

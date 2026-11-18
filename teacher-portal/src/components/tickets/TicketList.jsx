// src/components/tickets/TicketList.jsx
// Responsive list of tickets: table on wide screens, cards on phones.
// `view` can force 'table' or 'cards' (desktop toggle on My Requests).
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Monitor, Calendar } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import UrgencyBadge from '../common/UrgencyBadge';
import { formatDate, pcLocationLabel } from '../../utils/format';

const detailsPath = (t) => `/my-requests/${encodeURIComponent(t.id)}`;

export function TicketCard({ ticket }) {
  return (
    <Link
      to={detailsPath(ticket)}
      className="card block p-4 transition-colors hover:border-primary-300 dark:hover:border-primary-400/60"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold text-primary dark:text-primary-300">{ticket.id}</p>
          <p className="mt-1 line-clamp-2 text-sm text-gray-800 dark:text-gray-100">
            {ticket.summary || ticket.category?.name}
          </p>
        </div>
        <ChevronRight size={18} className="mt-1 shrink-0 text-gray-400" aria-hidden="true" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <StatusBadge status={ticket.status} size="sm" />
        <UrgencyBadge urgency={ticket.urgency} size="sm" />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs muted">
        <span className="inline-flex items-center gap-1">
          <Monitor size={13} aria-hidden="true" /> {ticket.pc?.displayCode}
          {ticket.pc && <span className="hidden min-[380px]:inline">· {pcLocationLabel(ticket.pc)}</span>}
        </span>
        <span className="inline-flex items-center gap-1">
          <Calendar size={13} aria-hidden="true" /> {formatDate(ticket.createdAt)}
        </span>
      </div>
    </Link>
  );
}

export function TicketTable({ tickets, compact = false }) {
  const navigate = useNavigate();
  return (
    <div className="card overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <caption className="sr-only">Requests</caption>
        <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:border-dark-border dark:bg-dark-raised dark:text-gray-400">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Ticket ID</th>
            <th scope="col" className="px-4 py-3 font-semibold">PC</th>
            {!compact && <th scope="col" className="px-4 py-3 font-semibold">Lab / Room</th>}
            {!compact && <th scope="col" className="px-4 py-3 font-semibold">Category</th>}
            <th scope="col" className="px-4 py-3 font-semibold">Description</th>
            <th scope="col" className="px-4 py-3 font-semibold">Reported</th>
            <th scope="col" className="px-4 py-3 font-semibold">Urgency</th>
            <th scope="col" className="px-4 py-3 font-semibold">Status</th>
            <th scope="col" className="px-4 py-3 font-semibold">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
          {tickets.map((t) => (
            <tr
              key={t.id}
              onClick={() => navigate(detailsPath(t))}
              className="cursor-pointer text-gray-700 transition-colors hover:bg-primary-50/50 dark:text-gray-200 dark:hover:bg-dark-raised"
            >
              <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold text-primary dark:text-primary-300">{t.id}</td>
              <td className="whitespace-nowrap px-4 py-3 font-medium">{t.pc?.displayCode}</td>
              {!compact && <td className="whitespace-nowrap px-4 py-3">{pcLocationLabel(t.pc)}</td>}
              {!compact && <td className="whitespace-nowrap px-4 py-3">{t.category?.name}</td>}
              <td className="max-w-[18rem] truncate px-4 py-3" title={t.summary}>
                {t.summary}
              </td>
              <td className="whitespace-nowrap px-4 py-3">{formatDate(t.createdAt)}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <UrgencyBadge urgency={t.urgency} size="sm" />
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <StatusBadge status={t.status} size="sm" />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <Link
                  to={detailsPath(t)}
                  onClick={(e) => e.stopPropagation()}
                  className="link inline-flex items-center gap-1 text-sm"
                >
                  View<span className="sr-only"> details for {t.id}</span>
                  <ChevronRight size={14} aria-hidden="true" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TicketList({ tickets, view = 'auto', compact = false }) {
  if (view === 'cards') {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {tickets.map((t) => (
          <TicketCard key={t.id} ticket={t} />
        ))}
      </div>
    );
  }
  if (view === 'table') {
    return (
      <>
        <div className="hidden md:block">
          <TicketTable tickets={tickets} compact={compact} />
        </div>
        <div className="grid gap-3 md:hidden">
          {tickets.map((t) => (
            <TicketCard key={t.id} ticket={t} />
          ))}
        </div>
      </>
    );
  }
  // auto: table from lg up, cards below
  return (
    <>
      <div className="hidden lg:block">
        <TicketTable tickets={tickets} compact={compact} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
        {tickets.map((t) => (
          <TicketCard key={t.id} ticket={t} />
        ))}
      </div>
    </>
  );
}

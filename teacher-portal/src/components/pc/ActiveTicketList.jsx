// src/components/pc/ActiveTicketList.jsx
// Active tickets on a PC. Other teachers' private requests show only the
// minimum the backend returns (no description, no name) and offer "Add information".
import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, MessageSquarePlus, ChevronRight } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import UrgencyBadge from '../common/UrgencyBadge';
import { formatDate } from '../../utils/format';

export default function ActiveTicketList({ tickets = [], onAddInformation, highlightSameCategory = false }) {
  return (
    <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-dark-border dark:border-dark-border">
      {tickets.map((t) => (
        <li key={t.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{t.id}</span>
              <StatusBadge status={t.status} size="sm" />
              <UrgencyBadge urgency={t.urgency} size="sm" />
              {highlightSameCategory && t.sameCategory && (
                <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary-800 dark:bg-primary-500/20 dark:text-primary-100">
                  Same category
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">
              {t.category?.name}
              {t.subcategory?.name ? ` · ${t.subcategory.name}` : ''}
            </p>
            {t.canView !== false && t.summary ? (
              <p className="mt-0.5 line-clamp-2 text-sm muted">{t.summary}</p>
            ) : (
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs muted">
                <Lock size={12} aria-hidden="true" /> Reported by another teacher
              </p>
            )}
            <p className="mt-1 text-xs muted">Reported {formatDate(t.createdAt)}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {onAddInformation && (
              <button type="button" className="btn-secondary btn-sm" onClick={() => onAddInformation(t)}>
                <MessageSquarePlus size={14} aria-hidden="true" /> Add information
              </button>
            )}
            {t.canView !== false && (
              <Link to={`/my-requests/${encodeURIComponent(t.id)}`} className="btn-ghost btn-sm">
                View <ChevronRight size={14} aria-hidden="true" />
              </Link>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

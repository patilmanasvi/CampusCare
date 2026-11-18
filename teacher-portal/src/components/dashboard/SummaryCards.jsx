// src/components/dashboard/SummaryCards.jsx
import React from 'react';
import { ClipboardList, CircleDot, Wrench, Hourglass, ShieldCheck } from 'lucide-react';

const CARDS = [
  { key: 'total', label: 'Total Requests', icon: ClipboardList, iconCls: 'bg-primary-50 text-primary dark:bg-primary-500/20 dark:text-primary-200' },
  { key: 'open', label: 'Open', icon: CircleDot, iconCls: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200' },
  { key: 'inProgress', label: 'In Progress', icon: Wrench, iconCls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200' },
  {
    key: 'awaitingVerification',
    label: 'Awaiting Verification',
    icon: Hourglass,
    iconCls: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200',
  },
  { key: 'resolved', label: 'Resolved', icon: ShieldCheck, iconCls: 'bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-200' },
];

export default function SummaryCards({ summary, loading }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
      {CARDS.map(({ key, label, icon: Icon, iconCls }, i) => (
        <li key={key} className={`card p-4 ${i === 0 ? 'col-span-2 md:col-span-1' : ''}`}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium muted">{label}</p>
            <span className={`inline-flex h-9 w-9 items-center justify-center rounded-md ${iconCls}`} aria-hidden="true">
              <Icon size={18} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-gray-900 sm:text-3xl dark:text-white">
            {loading ? (
              <span className="inline-block h-8 w-12 animate-pulse rounded bg-gray-200 dark:bg-dark-raised" aria-label="Loading" />
            ) : (
              summary?.[key] ?? '—'
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}

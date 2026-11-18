// src/components/pc/PcSummaryCard.jsx
// PC identification block. All values come from the backend.
import React from 'react';
import { Monitor } from 'lucide-react';
import PcStatusBadge from '../common/PcStatusBadge';
import { Alert } from '../common/States';
import { getPcStatusMeta } from '../../constants/pc';

export default function PcSummaryCard({ pc, action, compact = false }) {
  if (!pc) return null;
  const notWorking = pc.status && pc.status !== 'WORKING';
  const fields = [
    ['Block', pc.block],
    ['Room', pc.room],
    ['Lab', pc.lab],
    ['PC number', pc.pcNumber],
  ];
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-primary-50/60 px-4 py-3 sm:px-5 dark:border-dark-border dark:bg-primary-500/10">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary text-white" aria-hidden="true">
            <Monitor size={20} />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide muted">PC identification</p>
            <p className="font-mono text-lg font-semibold text-gray-900 dark:text-white">{pc.displayCode}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PcStatusBadge status={pc.status} />
          {action}
        </div>
      </div>
      {!compact && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-4 sm:grid-cols-4 sm:px-5">
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-medium uppercase tracking-wide muted">{label}</dt>
              <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-gray-100">{value ?? '—'}</dd>
            </div>
          ))}
        </dl>
      )}
      {notWorking && (
        <div className="px-4 pb-4 sm:px-5">
          <Alert type="warning" title={`This PC is marked “${getPcStatusMeta(pc.status).label}”`}>
            {pc.notice || 'The lab team already knows about this PC.'}{' '}
            {pc.canReport !== false && 'You can still report a new problem if it is something different.'}
          </Alert>
        </div>
      )}
    </div>
  );
}

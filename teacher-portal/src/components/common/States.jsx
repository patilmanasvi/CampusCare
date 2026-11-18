// src/components/common/States.jsx
// Reusable empty / error / alert blocks used across pages.
import React from 'react';
import { Inbox, CircleAlert, TriangleAlert, Info, CircleCheck, RefreshCw } from 'lucide-react';
import { getErrorMessage } from '../../utils/errors';

export function EmptyState({ icon: Icon = Inbox, title, description, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center px-4 py-10 text-center ${className}`}>
      <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-dark-raised dark:text-gray-400">
        <Icon size={22} aria-hidden="true" />
      </span>
      <p className="font-medium text-gray-900 dark:text-white">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, title = "Couldn't load this", onRetry, className = '' }) {
  return (
    <div role="alert" className={`flex flex-col items-center justify-center px-4 py-10 text-center ${className}`}>
      <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300">
        <CircleAlert size={22} aria-hidden="true" />
      </span>
      <p className="font-medium text-gray-900 dark:text-white">{title}</p>
      <p className="mt-1 max-w-sm text-sm muted">{getErrorMessage(error)}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary mt-4">
          <RefreshCw size={16} aria-hidden="true" /> Try again
        </button>
      )}
    </div>
  );
}

const ALERT_STYLES = {
  info: { icon: Info, cls: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100' },
  warning: {
    icon: TriangleAlert,
    cls: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100',
  },
  error: { icon: CircleAlert, cls: 'border-red-200 bg-red-50 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100' },
  success: {
    icon: CircleCheck,
    cls: 'border-green-200 bg-green-50 text-green-900 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-100',
  },
};

export function Alert({ type = 'info', title, children, action, className = '' }) {
  const { icon: Icon, cls } = ALERT_STYLES[type] || ALERT_STYLES.info;
  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${cls} ${className}`}
    >
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

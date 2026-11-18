// src/components/common/PageHeader.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PageHeader({ title, description, actions, backTo, backLabel = 'Back' }) {
  return (
    <div className="mb-6">
      {backTo && (
        <Link
          to={backTo}
          className="mb-3 inline-flex items-center gap-1.5 rounded text-sm font-medium text-gray-600 hover:text-primary dark:text-gray-300 dark:hover:text-primary-300"
        >
          <ArrowLeft size={16} aria-hidden="true" /> {backLabel}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl dark:text-white">{title}</h1>
          {description && <p className="mt-1 text-sm muted sm:text-base">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

// src/components/common/LoadingSpinner.jsx
import React from 'react';

export default function LoadingSpinner({ label = 'Loading…', className = '', size = 'md', inline = false }) {
  const dims = size === 'sm' ? 'h-4 w-4 border-2' : size === 'lg' ? 'h-10 w-10 border-4' : 'h-7 w-7 border-[3px]';
  const spinner = (
    <span
      className={`inline-block animate-spin rounded-full border-gray-300 border-t-primary dark:border-gray-600 dark:border-t-primary-300 ${dims}`}
      aria-hidden="true"
    />
  );
  if (inline) {
    return (
      <span className={`inline-flex items-center gap-2 ${className}`} role="status">
        {spinner}
        <span className="sr-only">{label}</span>
      </span>
    );
  }
  return (
    <div className={`flex flex-col items-center justify-center gap-3 p-8 text-sm muted ${className}`} role="status">
      {spinner}
      <span>{label}</span>
    </div>
  );
}

// src/components/common/Card.jsx
import React from 'react';

export default function Card({ as: Tag = 'div', children, className = '', padded = true, ...rest }) {
  return (
    <Tag className={`card ${padded ? 'p-4 sm:p-5' : ''} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

export function CardHeader({ title, description, action, icon: Icon }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2.5">
        {Icon && <Icon size={18} className="mt-0.5 shrink-0 text-primary dark:text-primary-300" aria-hidden="true" />}
        <div className="min-w-0">
          <h2 className="section-title">{title}</h2>
          {description && <p className="mt-0.5 text-sm muted">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

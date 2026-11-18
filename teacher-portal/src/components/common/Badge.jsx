// src/components/common/Badge.jsx
// Base pill used by StatusBadge, UrgencyBadge and PcStatusBadge.
// Always pairs an icon with a text label, so meaning never depends on colour.
import React from 'react';
import { TONE_CLASSES } from '../../constants/ticket';

export default function Badge({ tone = 'gray', icon: Icon, children, size = 'md', className = '', title }) {
  const sizing = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full font-medium ring-1 ring-inset ${sizing} ${
        TONE_CLASSES[tone] || TONE_CLASSES.gray
      } ${className}`}
    >
      {Icon && <Icon size={size === 'sm' ? 12 : 13} aria-hidden="true" />}
      {children}
    </span>
  );
}

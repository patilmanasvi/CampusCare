// src/components/common/UrgencyBadge.jsx
import React from 'react';
import Badge from './Badge';
import { getUrgencyMeta } from '../../constants/ticket';

export default function UrgencyBadge({ urgency, size }) {
  const meta = getUrgencyMeta(urgency);
  return (
    <Badge tone={meta.tone} icon={meta.icon} size={size} title={meta.description}>
      <span className="sr-only">Urgency: </span>
      {meta.label}
    </Badge>
  );
}

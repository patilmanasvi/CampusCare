// src/components/common/StatusBadge.jsx
import React from 'react';
import Badge from './Badge';
import { getStatusMeta } from '../../constants/ticket';

export default function StatusBadge({ status, size }) {
  const meta = getStatusMeta(status);
  return (
    <Badge tone={meta.tone} icon={meta.icon} size={size}>
      <span className="sr-only">Status: </span>
      {meta.label}
    </Badge>
  );
}

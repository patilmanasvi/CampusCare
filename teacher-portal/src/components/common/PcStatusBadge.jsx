// src/components/common/PcStatusBadge.jsx
import React from 'react';
import Badge from './Badge';
import { getPcStatusMeta } from '../../constants/pc';

export default function PcStatusBadge({ status, size }) {
  const meta = getPcStatusMeta(status);
  return (
    <Badge tone={meta.tone} icon={meta.icon} size={size}>
      <span className="sr-only">PC status: </span>
      {meta.label}
    </Badge>
  );
}

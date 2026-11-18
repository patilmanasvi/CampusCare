// src/constants/pc.js
import { CircleCheck, Wrench, Ban, CircleDot } from 'lucide-react';

export const PC_STATUS_META = {
  WORKING: { label: 'Working', tone: 'green', icon: CircleCheck },
  UNDER_MAINTENANCE: { label: 'Under Maintenance', tone: 'amber', icon: Wrench },
  NOT_IN_SERVICE: { label: 'Not in Service', tone: 'red', icon: Ban },
};

export function getPcStatusMeta(status) {
  return PC_STATUS_META[status] || { label: status || 'Unknown', tone: 'gray', icon: CircleDot };
}

// src/constants/ticket.js
// Status / urgency values the UI understands. The backend (Member 2/3) is the
// source of truth: if it sends a status we don't know, the UI still shows it
// using the fallback below instead of crashing.
import {
  Send,
  Inbox,
  Wrench,
  MessageSquare,
  CircleCheck,
  Hourglass,
  ShieldCheck,
  RotateCcw,
  CircleDot,
  ArrowDown,
  Minus,
  ArrowUp,
  TriangleAlert,
} from 'lucide-react';

// Tone -> Tailwind classes. Written out in full so Tailwind keeps them.
export const TONE_CLASSES = {
  gray: 'bg-gray-100 text-gray-700 ring-gray-300 dark:bg-gray-700/40 dark:text-gray-200 dark:ring-gray-600',
  blue: 'bg-blue-50 text-blue-800 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-200 dark:ring-blue-500/40',
  indigo: 'bg-indigo-50 text-indigo-800 ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-200 dark:ring-indigo-500/40',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-500/40',
  violet: 'bg-violet-50 text-violet-800 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-200 dark:ring-violet-500/40',
  teal: 'bg-teal-50 text-teal-800 ring-teal-200 dark:bg-teal-500/15 dark:text-teal-200 dark:ring-teal-500/40',
  green: 'bg-green-50 text-green-800 ring-green-200 dark:bg-green-500/15 dark:text-green-200 dark:ring-green-500/40',
  orange: 'bg-orange-50 text-orange-800 ring-orange-200 dark:bg-orange-500/15 dark:text-orange-200 dark:ring-orange-500/40',
  red: 'bg-red-50 text-red-800 ring-red-200 dark:bg-red-500/15 dark:text-red-200 dark:ring-red-500/40',
  brand: 'bg-primary-50 text-primary-800 ring-primary-200 dark:bg-primary-500/20 dark:text-primary-200 dark:ring-primary-400/40',
};

export const TICKET_STATUS = {
  SUBMITTED: 'SUBMITTED',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  IN_PROGRESS: 'IN_PROGRESS',
  WAITING_FOR_INFO: 'WAITING_FOR_INFO',
  FIXED: 'FIXED',
  AWAITING_VERIFICATION: 'AWAITING_VERIFICATION',
  CLOSED: 'CLOSED',
  REOPENED: 'REOPENED',
};

export const STATUS_META = {
  SUBMITTED: { label: 'Submitted', tone: 'gray', icon: Send },
  ACKNOWLEDGED: { label: 'Acknowledged', tone: 'blue', icon: Inbox },
  IN_PROGRESS: { label: 'In Progress', tone: 'amber', icon: Wrench },
  WAITING_FOR_INFO: { label: 'Needs Your Reply', tone: 'orange', icon: MessageSquare },
  FIXED: { label: 'Fixed', tone: 'teal', icon: CircleCheck },
  AWAITING_VERIFICATION: { label: 'Awaiting Verification', tone: 'violet', icon: Hourglass },
  CLOSED: { label: 'Closed', tone: 'green', icon: ShieldCheck },
  REOPENED: { label: 'Reopened', tone: 'red', icon: RotateCcw },
};

export function getStatusMeta(status) {
  return (
    STATUS_META[status] || {
      label: status ? String(status).replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : 'Unknown',
      tone: 'gray',
      icon: CircleDot,
    }
  );
}

/** Main path shown in the ticket progress bar. */
export const TIMELINE_STAGES = [
  TICKET_STATUS.SUBMITTED,
  TICKET_STATUS.ACKNOWLEDGED,
  TICKET_STATUS.IN_PROGRESS,
  TICKET_STATUS.FIXED,
  TICKET_STATUS.AWAITING_VERIFICATION,
  TICKET_STATUS.CLOSED,
];

/** Statuses that are not on the main path map onto the stage they belong to. */
export const STATUS_TO_STAGE = {
  WAITING_FOR_INFO: TICKET_STATUS.IN_PROGRESS,
  REOPENED: TICKET_STATUS.IN_PROGRESS,
};

export const ACTIVE_STATUSES = Object.values(TICKET_STATUS).filter((s) => s !== TICKET_STATUS.CLOSED);

export const URGENCY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

// Icons + labels so urgency is never shown by colour alone.
export const URGENCY_META = {
  LOW: {
    label: 'Low',
    tone: 'gray',
    icon: ArrowDown,
    description: 'Minor issue. The PC is still usable.',
  },
  MEDIUM: {
    label: 'Medium',
    tone: 'blue',
    icon: Minus,
    description: 'Some functionality is affected.',
  },
  HIGH: {
    label: 'High',
    tone: 'orange',
    icon: ArrowUp,
    description: 'The PC is difficult or impossible to use.',
  },
  CRITICAL: {
    label: 'Critical',
    tone: 'red',
    icon: TriangleAlert,
    description: 'Multiple PCs or the entire lab are affected.',
  },
};

export function getUrgencyMeta(urgency) {
  return URGENCY_META[urgency] || { label: urgency || 'Unknown', tone: 'gray', icon: Minus, description: '' };
}

export const URGENCY_ORDER = [URGENCY.LOW, URGENCY.MEDIUM, URGENCY.HIGH, URGENCY.CRITICAL];

export const STATUS_FILTER_OPTIONS = Object.keys(STATUS_META).map((value) => ({
  value,
  label: STATUS_META[value].label,
}));

export const URGENCY_FILTER_OPTIONS = URGENCY_ORDER.map((value) => ({
  value,
  label: URGENCY_META[value].label,
}));

export const VERIFICATION_RESULT = {
  WORKING: 'WORKING',
  NOT_WORKING: 'NOT_WORKING',
};

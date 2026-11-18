// src/components/tickets/TicketTimeline.jsx
// Progress built from the ticket's real status + event history. Stages with no
// event are shown as "skipped" rather than pretending they happened.
// Horizontal on desktop, vertical on phones.
import React from 'react';
import { Check, Minus } from 'lucide-react';
import { TIMELINE_STAGES, STATUS_TO_STAGE, getStatusMeta } from '../../constants/ticket';
import { formatDateTime } from '../../utils/format';

const EVENT_LABELS = {
  SUBMITTED: 'Request submitted',
  ACKNOWLEDGED: 'Acknowledged by the lab team',
  IN_PROGRESS: 'Work started',
  WAITING_FOR_INFO: 'Technician asked for more information',
  INFO_PROVIDED: 'More information was provided',
  INFO_ADDED: 'Information added',
  FIXED: 'Marked as fixed',
  AWAITING_VERIFICATION: 'Waiting for your verification',
  VERIFIED: 'Repair verified',
  CLOSED: 'Request closed',
  REOPENED: 'Request reopened',
};

const isPublicEvent = (e) => !(e?.internal === true || e?.visibility === 'INTERNAL');

export function buildStages(ticket) {
  const events = [...(ticket.events || [])].filter(isPublicEvent).sort((a, b) => (a.at < b.at ? -1 : 1));
  const stageOf = ticket.currentStage || STATUS_TO_STAGE[ticket.status] || ticket.status;
  let currentIdx = TIMELINE_STAGES.indexOf(stageOf);
  if (currentIdx === -1) {
    // Unknown status: put the marker on the furthest stage that has an event.
    currentIdx = TIMELINE_STAGES.reduce((acc, s, i) => (events.some((e) => e.type === s) ? i : acc), 0);
  }
  const latest = (type) => [...events].reverse().find((e) => e.type === type);

  return TIMELINE_STAGES.map((stage, i) => {
    const ev = latest(stage);
    let state = 'upcoming';
    if (i < currentIdx) state = ev ? 'done' : 'skipped';
    else if (i === currentIdx) state = ticket.status === 'CLOSED' ? 'done' : 'current';
    const sublabel =
      i === currentIdx && ticket.status !== stage && ticket.status !== 'CLOSED' ? getStatusMeta(ticket.status).label : null;
    return { stage, state, at: state === 'upcoming' || state === 'skipped' ? null : ev?.at || null, sublabel };
  });
}

function Dot({ state, n }) {
  const base = 'relative z-10 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold';
  if (state === 'done') {
    return (
      <span className={`${base} bg-primary text-white`}>
        <Check size={14} aria-hidden="true" />
      </span>
    );
  }
  if (state === 'current') {
    return (
      <span className={`${base} bg-white text-primary ring-[3px] ring-primary dark:bg-dark-surface dark:text-primary-200 dark:ring-primary-300`}>
        {n}
      </span>
    );
  }
  if (state === 'skipped') {
    return (
      <span className={`${base} border border-dashed border-gray-300 bg-white text-gray-400 dark:border-dark-border dark:bg-dark-surface`}>
        <Minus size={12} aria-hidden="true" />
      </span>
    );
  }
  return <span className={`${base} bg-gray-100 text-gray-400 dark:bg-dark-raised dark:text-gray-500`}>{n}</span>;
}

const STATE_TEXT = { done: 'completed', current: 'current stage', upcoming: 'not reached yet', skipped: 'skipped' };

export default function TicketTimeline({ ticket }) {
  const stages = buildStages(ticket);
  const history = [...(ticket.events || [])].filter(isPublicEvent).sort((a, b) => (a.at < b.at ? 1 : -1));

  return (
    <div>
      <ol className="flex flex-col md:flex-row" aria-label="Request progress">
        {stages.map((s, i) => {
          const meta = getStatusMeta(s.stage);
          const last = i === stages.length - 1;
          const lineDone = stages[i + 1] && (stages[i + 1].state === 'done' || stages[i + 1].state === 'current');
          return (
            <li key={s.stage} className="relative flex gap-3 pb-5 last:pb-0 md:flex-1 md:flex-col md:items-center md:gap-2 md:pb-0 md:text-center">
              {!last && (
                <span
                  aria-hidden="true"
                  className={`absolute left-[13px] top-7 h-[calc(100%-28px)] w-0.5 md:left-[calc(50%+14px)] md:top-[13px] md:h-0.5 md:w-[calc(100%-28px)] ${
                    lineDone ? 'bg-primary dark:bg-primary-400' : 'bg-gray-200 dark:bg-dark-border'
                  }`}
                />
              )}
              <Dot state={s.state} n={i + 1} />
              <div className="min-w-0 md:px-1">
                <p
                  className={`text-sm ${
                    s.state === 'current'
                      ? 'font-semibold text-primary dark:text-primary-200'
                      : s.state === 'done'
                        ? 'font-medium text-gray-900 dark:text-white'
                        : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {meta.label}
                  <span className="sr-only"> — {STATE_TEXT[s.state]}</span>
                </p>
                {s.sublabel && <p className="text-xs font-medium text-orange-700 dark:text-orange-300">{s.sublabel}</p>}
                {s.at && <p className="text-xs muted">{formatDateTime(s.at)}</p>}
                {s.state === 'skipped' && <p className="text-xs muted">Skipped</p>}
              </div>
            </li>
          );
        })}
      </ol>

      {history.length > 0 && (
        <details className="group mt-6 rounded-lg border border-gray-200 dark:border-dark-border">
          <summary className="cursor-pointer select-none rounded-lg px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-dark-raised">
            Full activity history ({history.length})
          </summary>
          <ul className="space-y-3 border-t border-gray-200 px-4 py-4 dark:border-dark-border">
            {history.map((e) => (
              <li key={e.id || `${e.type}-${e.at}`} className="flex gap-3 text-sm">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gray-300 dark:bg-gray-600" aria-hidden="true" />
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-100">{EVENT_LABELS[e.type] || getStatusMeta(e.type).label}</p>
                  {e.note && <p className="muted">{e.note}</p>}
                  <p className="text-xs muted">{formatDateTime(e.at)}</p>
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

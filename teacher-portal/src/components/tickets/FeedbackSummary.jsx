// src/components/tickets/FeedbackSummary.jsx
// Read-only view of the teacher's last verification.
import React from 'react';
import { Star, CircleCheck, CircleX } from 'lucide-react';
import { formatDateTime } from '../../utils/format';

export default function FeedbackSummary({ verification }) {
  if (!verification) return null;
  const ok = verification.result === 'WORKING';
  return (
    <div className="space-y-2 text-sm">
      <p className={`flex items-center gap-2 font-medium ${ok ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
        {ok ? <CircleCheck size={16} aria-hidden="true" /> : <CircleX size={16} aria-hidden="true" />}
        {ok ? 'You confirmed the PC was working' : 'You reported it was still not working'}
      </p>
      {verification.explanation && <p className="text-gray-700 dark:text-gray-300">“{verification.explanation}”</p>}
      {verification.comment && <p className="text-gray-700 dark:text-gray-300">“{verification.comment}”</p>}
      {verification.rating ? (
        <p className="flex items-center gap-0.5" aria-label={`Rating: ${verification.rating} out of 5`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              size={16}
              aria-hidden="true"
              className={n <= verification.rating ? 'fill-amber-400 text-amber-500' : 'text-gray-300 dark:text-gray-600'}
            />
          ))}
        </p>
      ) : (
        <p className="text-xs muted">No rating given</p>
      )}
      {verification.at && <p className="text-xs muted">{formatDateTime(verification.at)}</p>}
    </div>
  );
}

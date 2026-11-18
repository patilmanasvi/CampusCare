// src/components/common/StarRating.jsx
// Optional 1–5 rating as a radio group. Clicking the selected star again clears it.
import React, { useId } from 'react';
import { Star } from 'lucide-react';

const LABELS = ['Very poor', 'Poor', 'Okay', 'Good', 'Excellent'];

export default function StarRating({ value = null, onChange, label = 'Rating (optional)', disabled = false }) {
  const name = useId();
  return (
    <fieldset disabled={disabled}>
      <legend className="label">{label}</legend>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = value != null && n <= value;
          return (
            <label key={n} className="cursor-pointer rounded p-1 focus-within:ring-2 focus-within:ring-primary">
              <input
                type="radio"
                name={name}
                value={n}
                checked={value === n}
                onChange={() => onChange?.(n)}
                onClick={() => value === n && onChange?.(null)}
                className="sr-only"
              />
              <Star
                size={28}
                aria-hidden="true"
                className={filled ? 'fill-amber-400 text-amber-500' : 'text-gray-300 dark:text-gray-600'}
              />
              <span className="sr-only">
                {n} star{n > 1 ? 's' : ''} – {LABELS[n - 1]}
              </span>
            </label>
          );
        })}
        <span className="ml-2 text-sm muted" aria-live="polite">
          {value ? LABELS[value - 1] : 'No rating'}
        </span>
        {value != null && (
          <button type="button" className="btn-ghost btn-sm ml-1" onClick={() => onChange?.(null)}>
            Clear
          </button>
        )}
      </div>
    </fieldset>
  );
}

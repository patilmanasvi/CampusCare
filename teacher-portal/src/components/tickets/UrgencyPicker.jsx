// src/components/tickets/UrgencyPicker.jsx
// Urgency as labelled cards with icons — never colour alone.
import React from 'react';
import { CircleAlert } from 'lucide-react';
import { URGENCY_META, URGENCY_ORDER, TONE_CLASSES } from '../../constants/ticket';

export default function UrgencyPicker({ value, onChange, error, disabled }) {
  return (
    <fieldset disabled={disabled}>
      <legend className="label">
        Urgency<span className="ml-0.5 text-red-700 dark:text-red-400" aria-hidden="true">*</span>
      </legend>
      <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
        {URGENCY_ORDER.map((level) => {
          const meta = URGENCY_META[level];
          const Icon = meta.icon;
          const isSelected = value === level;
          return (
            <label
              key={level}
              className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-3 transition-colors focus-within:ring-2 focus-within:ring-primary ${
                isSelected
                  ? 'border-primary bg-primary-50 dark:border-primary-300 dark:bg-primary-500/15'
                  : 'border-gray-200 bg-white hover:border-primary-300 dark:border-dark-border dark:bg-dark-raised'
              }`}
            >
              <input
                type="radio"
                name="urgency"
                value={level}
                checked={isSelected}
                onChange={() => onChange(level)}
                className="mt-1 h-4 w-4 accent-primary"
              />
              <span className="min-w-0">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONE_CLASSES[meta.tone]}`}
                >
                  <Icon size={12} aria-hidden="true" /> {meta.label}
                </span>
                <span className="mt-1 block text-sm text-gray-700 dark:text-gray-300">{meta.description}</span>
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p className="field-error">
          <CircleAlert size={13} aria-hidden="true" /> {error}
        </p>
      )}
    </fieldset>
  );
}

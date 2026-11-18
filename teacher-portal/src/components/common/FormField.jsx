// src/components/common/FormField.jsx
// Label + control + help/error text with the right aria wiring.
//   <FormField id="desc" label="Description" required error={errors.desc}>
//     {(aria) => <textarea id="desc" {...aria} className="input" />}
//   </FormField>
import React from 'react';
import { CircleAlert } from 'lucide-react';

export default function FormField({ id, label, required = false, optional = false, help, error, children, className = '' }) {
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const aria = {
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': [helpId, errorId].filter(Boolean).join(' ') || undefined,
    'aria-required': required || undefined,
  };
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="label">
          {label}
          {required && (
            <span className="ml-0.5 text-red-700 dark:text-red-400" aria-hidden="true">
              *
            </span>
          )}
          {optional && <span className="ml-1 font-normal muted">(optional)</span>}
        </label>
      )}
      {typeof children === 'function' ? children(aria) : children}
      {help && !error && (
        <p id={helpId} className="help-text">
          {help}
        </p>
      )}
      {error && (
        <p id={errorId} className="field-error">
          <CircleAlert size={13} aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  );
}

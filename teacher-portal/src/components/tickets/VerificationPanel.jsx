// src/components/tickets/VerificationPanel.jsx
// Teacher confirms the repair (or says it still doesn't work) + optional
// feedback and 1–5 rating. The frontend never sets the status itself: it shows
// the ticket the backend returns after processing the verification.
import React, { useRef, useState } from 'react';
import { CircleCheck, CircleX, ShieldCheck } from 'lucide-react';
import { ticketService } from '../../services/ticketService';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/errors';
import { createId } from '../../utils/id';
import { VERIFICATION_RESULT, getStatusMeta } from '../../constants/ticket';
import ConfirmDialog from '../common/ConfirmDialog';
import StarRating from '../common/StarRating';
import FormField from '../common/FormField';
import { Alert } from '../common/States';

function Choice({ selected, onSelect, icon: Icon, title, text, tone }) {
  const ring =
    tone === 'good'
      ? 'border-green-600 bg-green-50 dark:border-green-400 dark:bg-green-500/10'
      : 'border-red-600 bg-red-50 dark:border-red-400 dark:bg-red-500/10';
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-colors focus-within:ring-2 focus-within:ring-primary ${
        selected ? ring : 'border-gray-200 bg-white hover:border-gray-300 dark:border-dark-border dark:bg-dark-raised'
      }`}
    >
      <input type="radio" name="verification" checked={selected} onChange={onSelect} className="sr-only" />
      <Icon
        size={24}
        className={`shrink-0 ${tone === 'good' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}
        aria-hidden="true"
      />
      <span>
        <span className="block font-semibold text-gray-900 dark:text-white">{title}</span>
        <span className="block text-sm muted">{text}</span>
      </span>
    </label>
  );
}

export default function VerificationPanel({ ticket, onUpdated }) {
  const toast = useToast();
  const [result, setResult] = useState('');
  const [explanation, setExplanation] = useState('');
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(null);
  const [errors, setErrors] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const idempotencyKey = useRef(createId());

  const review = (e) => {
    e.preventDefault();
    const next = {};
    if (!result) next.result = 'Choose whether the PC is working now.';
    if (result === VERIFICATION_RESULT.NOT_WORKING && !explanation.trim()) {
      next.explanation = 'Please describe what is still wrong.';
    }
    setErrors(next);
    if (!Object.keys(next).length) setConfirmOpen(true);
  };

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const updated = await ticketService.submitVerification(
        ticket.id,
        {
          result,
          explanation: result === VERIFICATION_RESULT.NOT_WORKING ? explanation.trim() : undefined,
          comment: comment.trim() || undefined,
          rating: rating ?? undefined,
        },
        { idempotencyKey: idempotencyKey.current }
      );
      setConfirmOpen(false);
      onUpdated?.(updated);
      if (updated?.status === 'CLOSED') toast.success('Thank you! The request is now closed.');
      else toast.info(`Sent back to the technician. Status: ${getStatusMeta(updated?.status).label}.`);
    } catch (err) {
      setConfirmOpen(false);
      setSubmitError(getErrorMessage(err, 'Your verification was not submitted. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const working = result === VERIFICATION_RESULT.WORKING;

  return (
    <section
      aria-labelledby="verify-title"
      className="card border-violet-300 p-4 ring-1 ring-violet-200 sm:p-5 dark:border-violet-500/40 dark:ring-violet-500/20"
    >
      <div className="mb-4 flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200" aria-hidden="true">
          <ShieldCheck size={20} />
        </span>
        <div>
          <h2 id="verify-title" className="section-title">
            Is the PC working now?
          </h2>
          <p className="mt-0.5 text-sm muted">The technician marked this as fixed. Please check the PC and confirm.</p>
        </div>
      </div>

      {submitError && (
        <Alert type="error" className="mb-4">
          {submitError}
        </Alert>
      )}

      <form onSubmit={review} noValidate className="space-y-5">
        <fieldset>
          <legend className="sr-only">Verification result</legend>
          <div className="grid gap-3 sm:grid-cols-2" data-error={errors.result ? 'true' : undefined}>
            <Choice
              selected={working}
              onSelect={() => {
                setResult(VERIFICATION_RESULT.WORKING);
                setErrors((e) => ({ ...e, result: undefined }));
              }}
              icon={CircleCheck}
              tone="good"
              title="Yes, it's working"
              text="The problem is fixed."
            />
            <Choice
              selected={result === VERIFICATION_RESULT.NOT_WORKING}
              onSelect={() => {
                setResult(VERIFICATION_RESULT.NOT_WORKING);
                setErrors((e) => ({ ...e, result: undefined }));
              }}
              icon={CircleX}
              tone="bad"
              title="No, still not working"
              text="Send it back to the technician."
            />
          </div>
          {errors.result && <p className="field-error">{errors.result}</p>}
        </fieldset>

        {result === VERIFICATION_RESULT.NOT_WORKING && (
          <FormField id="verify-explanation" label="What is still wrong?" required error={errors.explanation}>
            {(aria) => (
              <textarea
                id="verify-explanation"
                rows={3}
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                className={`input ${errors.explanation ? 'input-error' : ''}`}
                placeholder="e.g. The screen still goes blank after a few minutes."
                {...aria}
              />
            )}
          </FormField>
        )}

        {result && (
          <>
            <FormField id="verify-comment" label="Additional comments" optional>
              {(aria) => (
                <textarea
                  id="verify-comment"
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="input"
                  {...aria}
                />
              )}
            </FormField>
            <StarRating value={rating} onChange={setRating} label="How satisfied are you with the support? (optional)" />
          </>
        )}

        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={submitting}>
            Submit verification
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        title={working ? 'Confirm the PC is working?' : 'Report that it is still not working?'}
        description={
          working
            ? 'This tells the lab team the repair worked, and the request will be closed.'
            : 'The request will be sent back to the technician with your explanation.'
        }
        confirmLabel={working ? 'Yes, confirm' : 'Send back'}
        tone={working ? 'primary' : 'danger'}
        loading={submitting}
        onConfirm={submit}
        onCancel={() => setConfirmOpen(false)}
      />
    </section>
  );
}

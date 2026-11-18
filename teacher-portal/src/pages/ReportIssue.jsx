// src/pages/ReportIssue.jsx
// Flow: validate → ask backend for active/duplicate tickets → teacher chooses
// (add to existing | submit separate) → confirm → upload files → create ticket
// → success toast → ticket details. An idempotency key + in-flight guard stop
// repeated clicks from creating duplicate tickets.
import React, { useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, QrCode, Send, ArrowLeftRight } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useAttachments } from '../hooks/useAttachments';
import { pcService } from '../services/pcService';
import { categoryService } from '../services/categoryService';
import { ticketService } from '../services/ticketService';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../utils/errors';
import { createId } from '../utils/id';
import { getUrgencyMeta } from '../constants/ticket';
import PageHeader from '../components/common/PageHeader';
import Card, { CardHeader } from '../components/common/Card';
import FormField from '../components/common/FormField';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { Alert, ErrorState } from '../components/common/States';
import PcSelector from '../components/pc/PcSelector';
import PcSummaryCard from '../components/pc/PcSummaryCard';
import CategoryPicker from '../components/tickets/CategoryPicker';
import UrgencyPicker from '../components/tickets/UrgencyPicker';
import DuplicateDialog from '../components/tickets/DuplicateDialog';
import AttachmentUploader from '../components/AttachmentUploader';

const EMPTY_FORM = { categoryId: '', subcategoryId: '', description: '', urgency: '', remarks: '' };

export default function ReportIssue() {
  const [searchParams, setSearchParams] = useSearchParams();
  const pcId = searchParams.get('pcId') || '';
  const navigate = useNavigate();
  const toast = useToast();

  const pc = useApi(() => pcService.getPc(pcId), [pcId], { enabled: !!pcId });
  const categories = useApi(() => categoryService.getCategories(), []);
  const attachments = useAttachments();

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [phase, setPhase] = useState('edit'); // edit | checking | duplicates | confirm | submitting
  const [matches, setMatches] = useState([]);
  const [pageError, setPageError] = useState('');
  const [dialogError, setDialogError] = useState('');
  const idempotencyKey = useRef(createId());
  const inFlight = useRef(false);

  const categoryList = categories.data || [];
  const selectedCategory = categoryList.find((c) => c.id === form.categoryId);
  const selectedSub = selectedCategory?.subcategories?.find((s) => s.id === form.subcategoryId);
  const busy = phase === 'checking' || phase === 'submitting';
  const pcBlocked = !!pcId && !pc.loading && pc.data?.canReport === false;

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value, ...(key === 'categoryId' ? { subcategoryId: '' } : {}) }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!pcId || !pc.data || pc.loading) e.pc = 'Choose the PC that has the problem.';
    if (!form.categoryId) e.categoryId = 'Choose an issue category.';
    if (selectedCategory?.subcategories?.length && !form.subcategoryId) e.subcategoryId = 'Choose a subcategory.';
    if (!form.description.trim()) e.description = 'Describe the problem so the technician knows what to look for.';
    if (!form.urgency) e.urgency = 'Choose how urgent this is.';
    return e;
  };

  const focusFirstError = () => {
    setTimeout(() => {
      const el = document.querySelector('[aria-invalid="true"], [data-error="true"]');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (el && typeof el.focus === 'function') el.focus({ preventScroll: true });
    }, 0);
  };

  // Step 1: validate, then ask the backend about existing tickets on this PC.
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy || inFlight.current) return;
    setPageError('');
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      focusFirstError();
      return;
    }
    setPhase('checking');
    try {
      const result = await ticketService.checkDuplicates({
        pcId,
        categoryId: form.categoryId,
        subcategoryId: form.subcategoryId || null,
      });
      const found = result?.matches || [];
      setMatches(found);
      setDialogError('');
      setPhase(found.length ? 'duplicates' : 'confirm');
    } catch (err) {
      setPageError(getErrorMessage(err, "We couldn't check for existing requests. Please try again."));
      setPhase('edit');
    }
  };

  // Step 2a: create a new ticket.
  const createTicket = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPhase('submitting');
    setDialogError('');
    try {
      const attachmentIds = await attachments.uploadAll();
      const ticket = await ticketService.createTicket(
        {
          pcId,
          categoryId: form.categoryId,
          subcategoryId: form.subcategoryId || null,
          description: form.description.trim(),
          remarks: form.remarks.trim(),
          urgency: form.urgency,
          attachmentIds,
        },
        { idempotencyKey: idempotencyKey.current }
      );
      toast.success(`Request ${ticket.id} submitted.`);
      navigate(`/my-requests/${encodeURIComponent(ticket.id)}`, { replace: true, state: { justCreated: true } });
    } catch (err) {
      // Same idempotency key is kept, so "Submit" again is a safe retry.
      setPageError(getErrorMessage(err, 'Your request was not submitted. Please try again.'));
      setPhase('edit');
    } finally {
      inFlight.current = false;
    }
  };

  // Step 2b: add this report to an existing ticket instead.
  const addToExisting = async (ticket) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPhase('submitting');
    setDialogError('');
    const lines = [
      `Category: ${selectedCategory?.name || ''}${selectedSub ? ` › ${selectedSub.name}` : ''}`,
      `Urgency: ${getUrgencyMeta(form.urgency).label}`,
      '',
      form.description.trim(),
    ];
    if (form.remarks.trim()) lines.push('', `Remarks: ${form.remarks.trim()}`);
    try {
      const attachmentIds = await attachments.uploadAll();
      const updated = await ticketService.addInformation(
        ticket.id,
        { message: lines.join('\n'), attachmentIds },
        { idempotencyKey: idempotencyKey.current }
      );
      toast.success(`Your details were added to ${updated?.id || ticket.id}.`);
      navigate(`/my-requests/${encodeURIComponent(updated?.id || ticket.id)}`, { replace: true });
    } catch (err) {
      setDialogError(getErrorMessage(err, 'Could not add your information. Please try again.'));
      setPhase('duplicates');
    } finally {
      inFlight.current = false;
    }
  };

  const cancelDialogs = () => {
    if (phase === 'submitting') return;
    setPhase('edit');
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Report an Issue" description="Tell the lab team what's wrong. Fields marked * are required." />

      {pageError && (
        <Alert type="error" className="mb-5" title="Something went wrong">
          {pageError}
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* ---------------- PC ---------------- */}
        <Card data-error={errors.pc ? 'true' : undefined} tabIndex={errors.pc ? -1 : undefined}>
          <CardHeader
            title="1. Which PC?"
            action={
              !pcId && (
                <Link to="/scan-qr" className="btn-secondary btn-sm">
                  <QrCode size={14} aria-hidden="true" /> Scan QR
                </Link>
              )
            }
          />
          {!pcId && <PcSelector selectedPcId="" onSelect={(p) => setSearchParams({ pcId: p.id })} />}
          {pcId && pc.loading && <LoadingSpinner label="Loading PC details…" />}
          {pcId && pc.error && (
            <ErrorState
              error={pc.error}
              title="Couldn't load this PC"
              onRetry={pc.reload}
            />
          )}
          {pcId && pc.data && !pc.loading && (
            <PcSummaryCard
              pc={pc.data}
              action={
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() => setSearchParams({})}
                  disabled={busy}
                >
                  <ArrowLeftRight size={14} aria-hidden="true" /> Change
                </button>
              }
            />
          )}
          {pcBlocked && (
            <Alert type="error" className="mt-4" title="New issues can't be reported for this PC">
              {pc.data?.notice || 'Please contact the lab technician directly.'}
            </Alert>
          )}
          {errors.pc && <p className="field-error">{errors.pc}</p>}
        </Card>

        {/* ---------------- Problem ---------------- */}
        <Card>
          <CardHeader title="2. What's the problem?" />
          {categories.loading && <LoadingSpinner label="Loading categories…" />}
          {categories.error && (
            <ErrorState error={categories.error} title="Couldn't load issue categories" onRetry={categories.reload} />
          )}
          {categoryList.length > 0 && (
            <div className="space-y-5">
              <CategoryPicker
                categories={categoryList}
                categoryId={form.categoryId}
                subcategoryId={form.subcategoryId}
                onCategoryChange={(v) => setField('categoryId', v)}
                onSubcategoryChange={(v) => setField('subcategoryId', v)}
                categoryError={errors.categoryId}
                subcategoryError={errors.subcategoryId}
                disabled={busy}
              />

              <FormField
                id="description"
                label="Describe the issue"
                required
                error={errors.description}
                help={
                  selectedCategory?.code === 'OTHER' || selectedSub?.name === 'Other'
                    ? 'Since you chose “Other”, please describe the problem in detail.'
                    : 'What happens, when it started, and any error message you see.'
                }
              >
                {(aria) => (
                  <textarea
                    id="description"
                    rows={4}
                    value={form.description}
                    onChange={(e) => setField('description', e.target.value)}
                    disabled={busy}
                    placeholder="e.g. The monitor flickers every few seconds and goes black."
                    className={`input ${errors.description ? 'input-error' : ''}`}
                    {...aria}
                  />
                )}
              </FormField>
            </div>
          )}
        </Card>

        {/* ---------------- Urgency ---------------- */}
        <Card>
          <CardHeader title="3. How urgent is it?" />
          <UrgencyPicker value={form.urgency} onChange={(v) => setField('urgency', v)} error={errors.urgency} disabled={busy} />
        </Card>

        {/* ---------------- Extras ---------------- */}
        <Card>
          <CardHeader title="4. Anything else?" />
          <div className="space-y-5">
            <FormField id="remarks" label="Additional remarks" optional>
              {(aria) => (
                <textarea
                  id="remarks"
                  rows={2}
                  value={form.remarks}
                  onChange={(e) => setField('remarks', e.target.value)}
                  disabled={busy}
                  placeholder="e.g. Needed for a practical exam on Friday."
                  className="input"
                  {...aria}
                />
              )}
            </FormField>
            <AttachmentUploader
              items={attachments.items}
              onAdd={attachments.addFiles}
              onRemove={attachments.removeItem}
              disabled={busy}
              label="Photos, screenshots or a short video"
            />
          </div>
        </Card>

        <div className="flex flex-col-reverse gap-2 pb-4 sm:flex-row sm:justify-end">
          <Link to="/dashboard" className="btn-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn-primary" disabled={busy || pcBlocked}>
            {busy ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}
            {phase === 'checking' ? 'Checking…' : phase === 'submitting' ? 'Submitting…' : 'Submit request'}
          </button>
        </div>
      </form>

      <DuplicateDialog
        open={phase === 'duplicates' || (phase === 'submitting' && matches.length > 0)}
        matches={matches}
        busy={phase === 'submitting'}
        error={dialogError}
        onAddToExisting={addToExisting}
        onCreateSeparate={createTicket}
        onCancel={cancelDialogs}
      />

      <ConfirmDialog
        open={phase === 'confirm' || (phase === 'submitting' && matches.length === 0)}
        title="Submit this request?"
        confirmLabel="Submit request"
        loading={phase === 'submitting'}
        onConfirm={createTicket}
        onCancel={cancelDialogs}
      >
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="muted">PC</dt>
            <dd className="font-mono font-medium text-gray-900 dark:text-white">{pc.data?.displayCode}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="muted">Issue</dt>
            <dd className="text-right font-medium text-gray-900 dark:text-white">
              {selectedCategory?.name}
              {selectedSub ? ` › ${selectedSub.name}` : ''}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="muted">Urgency</dt>
            <dd className="font-medium text-gray-900 dark:text-white">{getUrgencyMeta(form.urgency).label}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="muted">Attachments</dt>
            <dd className="font-medium text-gray-900 dark:text-white">{attachments.items.length || 'None'}</dd>
          </div>
        </dl>
        {attachments.uploading && <p className="mt-3 text-sm muted">Uploading attachments…</p>}
      </ConfirmDialog>
    </div>
  );
}

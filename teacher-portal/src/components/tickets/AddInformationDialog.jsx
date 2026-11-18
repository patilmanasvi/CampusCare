// src/components/tickets/AddInformationDialog.jsx
// Add details/attachments to an existing active ticket instead of creating a
// duplicate. Works for another teacher's ticket too (backend decides access).
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Modal from '../common/Modal';
import FormField from '../common/FormField';
import { Alert } from '../common/States';
import AttachmentUploader from '../AttachmentUploader';
import { useAttachments } from '../../hooks/useAttachments';
import { ticketService } from '../../services/ticketService';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/errors';
import { createId } from '../../utils/id';

export default function AddInformationDialog({ open, ticket, onClose, initialMessage = '', initialFiles = null }) {
  const [message, setMessage] = useState(initialMessage);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const attachments = useAttachments();
  const idempotencyKey = useRef(createId());
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    setMessage(initialMessage);
    setError('');
    setFieldError('');
    attachments.clear();
    if (initialFiles?.length) attachments.addFiles(initialFiles);
    idempotencyKey.current = createId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ticket?.id]);

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!message.trim()) {
      setFieldError('Please describe what you want to add.');
      return;
    }
    setFieldError('');
    setError('');
    setSubmitting(true);
    try {
      const attachmentIds = await attachments.uploadAll();
      const updated = await ticketService.addInformation(
        ticket.id,
        { message: message.trim(), attachmentIds },
        { idempotencyKey: idempotencyKey.current }
      );
      toast.success(`Your information was added to ${updated?.id || ticket.id}.`);
      onClose?.();
      navigate(`/my-requests/${encodeURIComponent(updated?.id || ticket.id)}`);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not add your information. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeDisabled={submitting}
      title={`Add information to ${ticket?.id || 'request'}`}
      description="The technician will see this on the existing request. No new ticket is created."
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" form="add-info-form" className="btn-primary" disabled={submitting}>
            {submitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {submitting ? 'Adding…' : 'Add information'}
          </button>
        </>
      }
    >
      <form id="add-info-form" onSubmit={submit} className="space-y-4" noValidate>
        {error && <Alert type="error">{error}</Alert>}
        <FormField id="add-info-message" label="What would you like to add?" required error={fieldError}>
          {(aria) => (
            <textarea
              id="add-info-message"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={submitting}
              placeholder="For example: it also happens on start-up, or the error message says…"
              className={`input ${fieldError ? 'input-error' : ''}`}
              data-autofocus
              {...aria}
            />
          )}
        </FormField>
        <AttachmentUploader
          compact
          items={attachments.items}
          onAdd={attachments.addFiles}
          onRemove={attachments.removeItem}
          disabled={submitting}
        />
      </form>
    </Modal>
  );
}

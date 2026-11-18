// src/components/tickets/DuplicateDialog.jsx
// Shown when the backend reports active tickets on the same PC. The teacher
// chooses: add details to one of them, or submit a separate new ticket.
// A PC can have several independent problems, so nothing is blocked.
import React from 'react';
import { Loader2, FilePlus2 } from 'lucide-react';
import Modal from '../common/Modal';
import ActiveTicketList from '../pc/ActiveTicketList';
import { Alert } from '../common/States';

export default function DuplicateDialog({ open, matches = [], busy, error, onAddToExisting, onCreateSeparate, onCancel }) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      closeDisabled={busy}
      size="lg"
      title="This PC already has open requests"
      description="Is your problem one of these? Adding to an existing request helps the technician fix it faster."
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
            Go back and edit
          </button>
          <button type="button" className="btn-primary" onClick={onCreateSeparate} disabled={busy} data-autofocus>
            {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <FilePlus2 size={16} aria-hidden="true" />}
            It's a different issue — submit new
          </button>
        </>
      }
    >
      {error && (
        <Alert type="error" className="mb-4">
          {error}
        </Alert>
      )}
      <p className="mb-3 text-sm text-gray-700 dark:text-gray-300">
        Choose <strong>Add information</strong> to send your description and attachments to that request instead of
        creating a new one.
      </p>
      <ActiveTicketList tickets={matches} highlightSameCategory onAddInformation={busy ? undefined : onAddToExisting} />
    </Modal>
  );
}

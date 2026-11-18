// src/components/pc/PcDetailsPanel.jsx
// Shown after scanning a QR code or picking a PC manually:
// PC details + active tickets + "continue existing" / "report different fault".
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FilePlus2, ClipboardList } from 'lucide-react';
import PcSummaryCard from './PcSummaryCard';
import ActiveTicketList from './ActiveTicketList';
import AddInformationDialog from '../tickets/AddInformationDialog';
import Card, { CardHeader } from '../common/Card';
import LoadingSpinner from '../common/LoadingSpinner';
import { ErrorState, Alert } from '../common/States';

export default function PcDetailsPanel({ pc, activeTickets, ticketsLoading, ticketsError, onRetryTickets }) {
  const [addInfoFor, setAddInfoFor] = useState(null);
  const hasTickets = Array.isArray(activeTickets) && activeTickets.length > 0;
  const canReport = pc?.canReport !== false;
  const reportLink = `/report-issue?pcId=${encodeURIComponent(pc.id)}`;

  return (
    <div className="space-y-5">
      <PcSummaryCard pc={pc} />

      {!canReport && (
        <Alert type="error" title="New issues can't be reported for this PC">
          {pc.notice || 'Please contact the lab technician directly.'}
        </Alert>
      )}

      <Card>
        <CardHeader
          icon={ClipboardList}
          title="Active requests for this PC"
          description={
            hasTickets
              ? 'If your problem is already listed, add your information to it instead of reporting it again.'
              : undefined
          }
        />
        {ticketsLoading && <LoadingSpinner label="Checking for existing requests…" />}
        {ticketsError && (
          <ErrorState error={ticketsError} title="Couldn't load existing requests" onRetry={onRetryTickets} />
        )}
        {!ticketsLoading && !ticketsError && !hasTickets && (
          <p className="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm muted dark:bg-dark-raised/50">
            No open requests for this PC.
          </p>
        )}
        {!ticketsLoading && !ticketsError && hasTickets && (
          <ActiveTicketList tickets={activeTickets} onAddInformation={canReport ? setAddInfoFor : undefined} />
        )}
      </Card>

      {canReport && (
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Link to={reportLink} className="btn-primary">
            <FilePlus2 size={18} aria-hidden="true" />
            {hasTickets ? 'Report a different issue' : 'Report an issue on this PC'}
          </Link>
        </div>
      )}

      <AddInformationDialog open={!!addInfoFor} ticket={addInfoFor} onClose={() => setAddInfoFor(null)} />
    </div>
  );
}

// src/pages/PcInfo.jsx
// PC information screen (after a QR scan). Always fetched fresh from the
// backend so admin changes to room/lab/display code show up immediately.
import React from 'react';
import { useParams } from 'react-router-dom';
import { usePcDetails } from '../hooks/usePcDetails';
import PageHeader from '../components/common/PageHeader';
import PcDetailsPanel from '../components/pc/PcDetailsPanel';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Card from '../components/common/Card';
import { ErrorState } from '../components/common/States';

export default function PcInfo() {
  const { pcId } = useParams();
  const { pc, tickets } = usePcDetails(pcId);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="PC information" backTo="/scan-qr" backLabel="Scan another PC" />
      {pc.loading && <LoadingSpinner label="Loading PC details…" />}
      {pc.error && (
        <Card>
          <ErrorState
            error={pc.error}
            title={pc.error.status === 404 ? 'PC not found' : "Couldn't load this PC"}
            onRetry={pc.error.status === 404 ? undefined : pc.reload}
          />
        </Card>
      )}
      {pc.data && (
        <PcDetailsPanel
          pc={pc.data}
          activeTickets={tickets.data}
          ticketsLoading={tickets.loading}
          ticketsError={tickets.error}
          onRetryTickets={tickets.reload}
        />
      )}
    </div>
  );
}

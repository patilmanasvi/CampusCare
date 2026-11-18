// src/pages/SelectPC.jsx
// Manual alternative to scanning: block → lab/room → PC, then PC details.
import React, { useEffect, useRef, useState } from 'react';
import { QrCode } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { ErrorState } from '../components/common/States';
import PcSelector from '../components/pc/PcSelector';
import PcDetailsPanel from '../components/pc/PcDetailsPanel';
import { usePcDetails } from '../hooks/usePcDetails';

export default function SelectPC() {
  const [pcId, setPcId] = useState('');
  const { pc, tickets } = usePcDetails(pcId);
  const detailsRef = useRef(null);

  // Bring the details into view on phones once a PC is picked.
  useEffect(() => {
    if (pc.data && detailsRef.current) detailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [pc.data]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Select a PC"
        description="Choose the block, lab and PC that has the problem."
        actions={
          <Link to="/scan-qr" className="btn-secondary">
            <QrCode size={16} aria-hidden="true" /> Scan QR instead
          </Link>
        }
      />
      <Card>
        <PcSelector selectedPcId={pcId} onSelect={(p) => setPcId(p.id)} />
      </Card>

      <div ref={detailsRef} className="mt-6 scroll-mt-4">
        {pcId && pc.loading && <LoadingSpinner label="Loading PC details…" />}
        {pcId && pc.error && (
          <Card>
            <ErrorState error={pc.error} title="Couldn't load this PC" onRetry={pc.reload} />
          </Card>
        )}
        {pcId && pc.data && !pc.loading && (
          <PcDetailsPanel
            pc={pc.data}
            activeTickets={tickets.data}
            ticketsLoading={tickets.loading}
            ticketsError={tickets.error}
            onRetryTickets={tickets.reload}
          />
        )}
      </div>
    </div>
  );
}

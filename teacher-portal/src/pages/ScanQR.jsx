// src/pages/ScanQR.jsx
// Scan the QR sticker on a PC → backend lookup → PC information screen.
// Also handles QR links opened directly, e.g. /scan-qr?token=qr-abc123
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import { CameraOff, Keyboard, ListChecks, Loader2, RotateCcw, ScanLine } from 'lucide-react';
import { pcService } from '../services/pcService';
import { extractQrToken } from '../utils/qr';
import { getErrorMessage } from '../utils/errors';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import { Alert } from '../components/common/States';

const CAMERA_MESSAGES = {
  'permission-denied': {
    title: 'Camera access was blocked',
    body: 'Allow camera access for this site in your browser settings, then reload. Or enter the code below.',
  },
  'no-camera': { title: 'No camera found', body: 'This device has no camera we can use. Enter the code below or pick the PC from a list.' },
  'in-use': { title: 'Camera is busy', body: 'Another app is using the camera. Close it and try again.' },
  'insecure-context': {
    title: 'Camera needs a secure connection',
    body: 'Scanning only works on HTTPS (or localhost). Enter the code below instead.',
  },
  unsupported: { title: "This browser can't scan", body: 'Try a recent version of Chrome, Safari or Edge, or enter the code below.' },
};

export default function ScanQR() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [phase, setPhase] = useState('scanning'); // scanning | resolving | invalid
  const [cameraError, setCameraError] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [cameraKey, setCameraKey] = useState(0);
  const busy = useRef(false);

  const resolveToken = useCallback(
    async (raw, source) => {
      if (busy.current) return;
      const token = extractQrToken(raw);
      if (!token) {
        setLookupError("That doesn't look like a lab PC QR code. Scan the sticker on the PC's monitor or cabinet.");
        setPhase('invalid');
        return;
      }
      busy.current = true;
      setPhase('resolving');
      setLookupError('');
      try {
        const pc = await pcService.lookupByQrToken(token);
        navigate(`/pcs/${encodeURIComponent(pc.id)}`, { replace: source === 'link' });
      } catch (err) {
        setLookupError(
          err?.status === 404
            ? "This QR code isn't linked to any lab PC. Try again, or select the PC manually."
            : getErrorMessage(err, 'Could not look up this PC. Please try again.')
        );
        setPhase('invalid');
      } finally {
        busy.current = false;
      }
    },
    [navigate]
  );

  // A QR URL that points at this page carries the token in the query string.
  useEffect(() => {
    const t = searchParams.get('token');
    if (t) resolveToken(t, 'link');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScan = (codes) => {
    const value = codes?.[0]?.rawValue;
    if (value && phase === 'scanning') resolveToken(value, 'camera');
  };

  const onManualSubmit = (e) => {
    e.preventDefault();
    if (!manualToken.trim()) {
      setLookupError('Enter the code printed under the QR sticker.');
      setPhase('invalid');
      return;
    }
    resolveToken(manualToken, 'manual');
  };

  const retryCamera = () => {
    setCameraError(null);
    setCameraKey((k) => k + 1);
    setPhase('scanning');
  };

  const cameraMsg = cameraError && (CAMERA_MESSAGES[cameraError.kind] || { title: "Camera couldn't start", body: cameraError.message });

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Scan QR Code" description="Scan the QR sticker on the PC to see its details and report a problem." />

      <Card className="overflow-hidden" padded={false}>
        {!cameraError ? (
          <div className="relative bg-black">
            <Scanner
              key={cameraKey}
              onScan={onScan}
              onError={(err) => setCameraError(err || { kind: 'unknown', message: '' })}
              formats={['qr_code']}
              constraints={{ facingMode: 'environment' }}
              paused={phase !== 'scanning'}
              sound={false}
              components={{ finder: true, torch: true }}
              styles={{ container: { width: '100%', aspectRatio: '1 / 1', maxHeight: '70vh' } }}
            />
            {phase === 'resolving' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-white" role="status">
                <Loader2 size={32} className="animate-spin" aria-hidden="true" />
                <p className="text-sm font-medium">Looking up PC…</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-5">
            <Alert type="warning" title={cameraMsg.title}>
              {cameraMsg.body}
            </Alert>
            <button type="button" className="btn-secondary mt-3" onClick={retryCamera}>
              <RotateCcw size={16} aria-hidden="true" /> Try the camera again
            </button>
          </div>
        )}

        <div className="space-y-3 p-4 sm:p-5">
          {!cameraError && phase === 'scanning' && (
            <p className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
              <ScanLine size={18} className="mt-0.5 shrink-0 text-primary dark:text-primary-300" aria-hidden="true" />
              Hold your phone 15–30 cm from the sticker and keep the QR code inside the frame. It scans automatically.
            </p>
          )}
          {phase === 'invalid' && (
            <Alert
              type="error"
              action={
                !cameraError && (
                  <button type="button" className="btn-secondary btn-sm" onClick={() => setPhase('scanning')}>
                    Scan again
                  </button>
                )
              }
            >
              {lookupError}
            </Alert>
          )}
        </div>
      </Card>

      <Card className="mt-5">
        <h2 className="section-title flex items-center gap-2">
          {cameraError ? <CameraOff size={18} aria-hidden="true" /> : <Keyboard size={18} aria-hidden="true" />}
          Can't scan?
        </h2>
        <form onSubmit={onManualSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="manual-token" className="sr-only">
            QR code or link
          </label>
          <input
            id="manual-token"
            type="text"
            autoCapitalize="none"
            spellCheck={false}
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            placeholder="Enter the code under the QR sticker"
            className="input flex-1"
            disabled={phase === 'resolving'}
          />
          <button type="submit" className="btn-primary" disabled={phase === 'resolving'}>
            Look up
          </button>
        </form>
        <div className="mt-4 border-t border-gray-200 pt-4 dark:border-dark-border">
          <Link to="/select-pc" className="btn-secondary w-full sm:w-auto">
            <ListChecks size={16} aria-hidden="true" /> Select the PC from a list instead
          </Link>
        </div>
      </Card>
    </div>
  );
}

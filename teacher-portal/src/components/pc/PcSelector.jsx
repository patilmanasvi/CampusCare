// src/components/pc/PcSelector.jsx
// Step 1: block → Step 2: lab/room → Step 3: PC.
// Every option is fetched from the backend; nothing is hard-coded.
import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import SearchableSelect from '../common/SearchableSelect';
import LoadingSpinner from '../common/LoadingSpinner';
import { ErrorState } from '../common/States';
import { pcService } from '../../services/pcService';
import { getPcStatusMeta } from '../../constants/pc';

function Step({ n, title, done, children }) {
  return (
    <li className="relative flex gap-3 pb-6 last:pb-0">
      <span
        className={`relative z-10 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          done ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 dark:bg-dark-raised dark:text-gray-200'
        }`}
        aria-hidden="true"
      >
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
          <span className="sr-only">Step {n}: </span>
          {title}
        </p>
        {children}
      </div>
    </li>
  );
}

const STATUS_DOT = {
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  gray: 'bg-gray-400',
};

export default function PcSelector({ selectedPcId, onSelect }) {
  const [blocks, setBlocks] = useState({ items: [], loading: true, error: null });
  const [rooms, setRooms] = useState({ items: [], loading: false, error: null });
  const [pcs, setPcs] = useState({ items: [], loading: false, error: null });
  const [blockId, setBlockId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [pcQuery, setPcQuery] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setBlocks((s) => ({ ...s, loading: true, error: null }));
    pcService
      .getBlocks()
      .then((items) => active && setBlocks({ items: items || [], loading: false, error: null }))
      .catch((error) => active && setBlocks({ items: [], loading: false, error }));
    return () => {
      active = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    setRoomId('');
    setPcs({ items: [], loading: false, error: null });
    if (!blockId) {
      setRooms({ items: [], loading: false, error: null });
      return undefined;
    }
    let active = true;
    setRooms({ items: [], loading: true, error: null });
    pcService
      .getRooms(blockId)
      .then((items) => active && setRooms({ items: items || [], loading: false, error: null }))
      .catch((error) => active && setRooms({ items: [], loading: false, error }));
    return () => {
      active = false;
    };
  }, [blockId]);

  useEffect(() => {
    setPcQuery('');
    if (!roomId) {
      setPcs({ items: [], loading: false, error: null });
      return undefined;
    }
    let active = true;
    setPcs({ items: [], loading: true, error: null });
    pcService
      .getPcs(roomId)
      .then((items) => active && setPcs({ items: items || [], loading: false, error: null }))
      .catch((error) => active && setPcs({ items: [], loading: false, error }));
    return () => {
      active = false;
    };
  }, [roomId]);

  const blockOptions = blocks.items.map((b) => ({ value: b.id, label: b.name }));
  const roomOptions = rooms.items.map((r) => ({
    value: r.id,
    label: r.label || [r.lab, r.room && `Room ${r.room}`].filter(Boolean).join(' · '),
  }));

  const filteredPcs = useMemo(() => {
    const q = pcQuery.trim().toLowerCase();
    if (!q) return pcs.items;
    return pcs.items.filter((p) => `${p.displayCode} ${p.pcNumber}`.toLowerCase().includes(q));
  }, [pcs.items, pcQuery]);

  if (blocks.error) {
    return <ErrorState error={blocks.error} title="Couldn't load blocks" onRetry={() => setReloadKey((k) => k + 1)} />;
  }

  return (
    <ol className="relative before:absolute before:bottom-4 before:left-[13px] before:top-4 before:w-px before:bg-gray-200 dark:before:bg-dark-border">
      <Step n={1} title="Select block" done={!!blockId}>
        <SearchableSelect
          label="Block"
          hideLabel
          options={blockOptions}
          value={blockId}
          onChange={setBlockId}
          loading={blocks.loading}
          placeholder="Choose a block"
          searchPlaceholder="Search blocks…"
        />
      </Step>

      <Step n={2} title="Select lab / room" done={!!roomId}>
        {rooms.error ? (
          <p className="field-error mt-0">Couldn't load rooms. Choose the block again to retry.</p>
        ) : (
          <SearchableSelect
            label="Lab or room"
            hideLabel
            options={roomOptions}
            value={roomId}
            onChange={setRoomId}
            disabled={!blockId}
            loading={rooms.loading}
            placeholder={blockId ? 'Choose a lab or room' : 'Select a block first'}
            searchPlaceholder="Search labs or room numbers…"
            emptyText="No labs found in this block"
          />
        )}
      </Step>

      <Step n={3} title="Select PC" done={!!selectedPcId}>
        {!roomId && <p className="text-sm muted">Select a lab or room first.</p>}
        {roomId && pcs.loading && <LoadingSpinner label="Loading PCs…" className="p-4" />}
        {roomId && pcs.error && <p className="field-error mt-0">Couldn't load PCs for this room.</p>}
        {roomId && !pcs.loading && !pcs.error && (
          <>
            {pcs.items.length > 8 && (
              <div className="relative mb-3">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                <input
                  type="search"
                  value={pcQuery}
                  onChange={(e) => setPcQuery(e.target.value)}
                  placeholder="Search PC number or code"
                  aria-label="Search PCs"
                  className="input pl-9"
                />
              </div>
            )}
            {filteredPcs.length === 0 ? (
              <p className="text-sm muted">No PCs match.</p>
            ) : (
              <div role="radiogroup" aria-label="PCs" className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {filteredPcs.map((pc) => {
                  const meta = getPcStatusMeta(pc.status);
                  const isSelected = pc.id === selectedPcId;
                  return (
                    <button
                      key={pc.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => onSelect(pc)}
                      title={`${pc.displayCode} – ${meta.label}`}
                      className={`flex min-h-[56px] flex-col items-center justify-center rounded-md border px-2 py-2 text-center transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary text-white'
                          : 'border-gray-200 bg-white text-gray-800 hover:border-primary-300 hover:bg-primary-50 dark:border-dark-border dark:bg-dark-raised dark:text-gray-100 dark:hover:bg-dark-border'
                      }`}
                    >
                      <span className="text-sm font-semibold">PC {pc.pcNumber}</span>
                      <span className={`mt-0.5 flex items-center gap-1 text-[10px] ${isSelected ? 'text-white/85' : 'muted'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[meta.tone] || STATUS_DOT.gray}`} aria-hidden="true" />
                        <span className="truncate font-mono">{pc.displayCode}</span>
                      </span>
                      <span className="sr-only">, {meta.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </Step>
    </ol>
  );
}

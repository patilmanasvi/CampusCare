// src/components/common/SearchableSelect.jsx
// Dropdown with a search box (ARIA combobox). Keyboard: ↑ ↓ to move,
// Enter to pick, Escape to close. Options: [{ value, label, hint? }]
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

export default function SearchableSelect({
  id,
  label,
  hideLabel = false,
  options = [],
  value,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Type to search…',
  disabled = false,
  loading = false,
  error,
  emptyText = 'No matches',
}) {
  const autoId = useId();
  const inputId = id || autoId;
  const listId = `${inputId}-list`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const searchRef = useRef(null);
  const buttonRef = useRef(null);

  const selected = options.find((o) => o.value === value) || null;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => `${o.label} ${o.hint || ''}`.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return undefined;
    setActive(Math.max(0, filtered.findIndex((o) => o.value === value)));
    searchRef.current?.focus();
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => setActive(0), [query]);

  const choose = (opt) => {
    onChange?.(opt.value, opt);
    setOpen(false);
    setQuery('');
    buttonRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[active]) choose(filtered[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      {label && (
        <label htmlFor={inputId} className={hideLabel ? 'sr-only' : 'label'}>
          {label}
        </label>
      )}
      <button
        ref={buttonRef}
        id={inputId}
        type="button"
        disabled={disabled || loading}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={error ? 'true' : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={`input flex items-center justify-between text-left ${error ? 'input-error' : ''}`}
      >
        <span className={`truncate ${selected ? '' : 'text-gray-400 dark:text-gray-500'}`}>
          {loading ? 'Loading…' : selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={16} className="ml-2 shrink-0 text-gray-500" aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-pop dark:border-dark-border dark:bg-dark-raised">
          <div className="flex items-center gap-2 border-b border-gray-200 px-3 dark:border-dark-border">
            <Search size={16} className="text-gray-400" aria-hidden="true" />
            <input
              ref={searchRef}
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={filtered[active] ? `${listId}-${active}` : undefined}
              aria-label={`Search ${label || 'options'}`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none dark:text-gray-100"
            />
          </div>
          <ul id={listId} role="listbox" aria-label={label} className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 && <li className="px-3 py-2.5 text-sm muted">{emptyText}</li>}
            {filtered.map((opt, i) => {
              const isSelected = opt.value === value;
              return (
                <li
                  key={opt.value}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(opt)}
                  className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-sm ${
                    i === active ? 'bg-primary-50 dark:bg-primary-500/15' : ''
                  } ${isSelected ? 'font-medium text-primary dark:text-primary-300' : 'text-gray-800 dark:text-gray-100'}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate">{opt.label}</span>
                    {opt.hint && <span className="block truncate text-xs muted">{opt.hint}</span>}
                  </span>
                  {isSelected && <Check size={16} aria-hidden="true" />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

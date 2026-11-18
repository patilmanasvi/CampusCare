// src/pages/MyRequests.jsx
// Only the signed-in teacher's own requests (and ones they were added to).
// Filtering, sorting and paging happen on the backend; filters live in the
// URL so the back button and shared links keep them.
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, LayoutGrid, Table2, X, FilePlus2 } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { ticketService } from '../services/ticketService';
import { categoryService } from '../services/categoryService';
import { STATUS_FILTER_OPTIONS, URGENCY_FILTER_OPTIONS } from '../constants/ticket';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Pagination from '../components/common/Pagination';
import { EmptyState, ErrorState } from '../components/common/States';
import TicketList from '../components/tickets/TicketList';

const PAGE_SIZE = 10;
const VIEW_KEY = 'campuscare_requests_view';
const FILTER_KEYS = ['status', 'urgency', 'categoryId', 'dateFrom', 'dateTo'];

function readView() {
  try {
    return localStorage.getItem(VIEW_KEY) === 'cards' ? 'cards' : 'table';
  } catch {
    return 'table';
  }
}

export default function MyRequests() {
  const [params, setParams] = useSearchParams();
  const [searchText, setSearchText] = useState(params.get('q') || '');
  const debouncedSearch = useDebouncedValue(searchText, 350);
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState(readView);

  const query = useMemo(
    () => ({
      search: params.get('q') || '',
      status: params.get('status') || '',
      urgency: params.get('urgency') || '',
      categoryId: params.get('categoryId') || '',
      dateFrom: params.get('dateFrom') || '',
      dateTo: params.get('dateTo') || '',
      sort: params.get('sort') === 'oldest' ? 'oldest' : 'newest',
      page: Math.max(1, Number(params.get('page')) || 1),
      pageSize: PAGE_SIZE,
    }),
    [params]
  );

  const update = (changes, { resetPage = true } = {}) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, String(v)) : next.delete(k)));
    if (resetPage && !('page' in changes)) next.delete('page');
    setParams(next, { replace: true });
  };

  // Push the debounced search text into the URL.
  useEffect(() => {
    if ((params.get('q') || '') !== debouncedSearch.trim()) update({ q: debouncedSearch.trim() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const list = useApi(() => ticketService.listMyTickets(query), [JSON.stringify(query)]);
  const categories = useApi(() => categoryService.getCategories(), []);

  const activeFilterCount = FILTER_KEYS.filter((k) => params.get(k)).length;
  const hasAnyFilter = activeFilterCount > 0 || !!query.search;
  const items = list.data?.items || [];
  const total = list.data?.total ?? 0;

  const setViewMode = (mode) => {
    setView(mode);
    try {
      localStorage.setItem(VIEW_KEY, mode);
    } catch {
      /* ignore */
    }
  };

  const clearAll = () => {
    setSearchText('');
    const next = new URLSearchParams();
    if (query.sort === 'oldest') next.set('sort', 'oldest');
    setParams(next, { replace: true });
  };

  return (
    <div>
      <PageHeader
        title="My Requests"
        description="Track the issues you've reported and their progress."
        actions={
          <Link to="/report-issue" className="btn-primary">
            <FilePlus2 size={16} aria-hidden="true" /> Report an Issue
          </Link>
        }
      />

      <Card className="mb-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <label htmlFor="request-search" className="sr-only">
              Search by ticket ID or PC code
            </label>
            <input
              id="request-search"
              type="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search ticket ID or PC code (e.g. LAB-1012 or 522/A/12)"
              className="input pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="sort" className="sr-only">
              Sort
            </label>
            <select
              id="sort"
              value={query.sort}
              onChange={(e) => update({ sort: e.target.value === 'oldest' ? 'oldest' : '' })}
              className="input w-auto"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowFilters((s) => !s)}
              aria-expanded={showFilters}
              aria-controls="request-filters"
            >
              <SlidersHorizontal size={16} aria-hidden="true" /> Filters
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold text-white">{activeFilterCount}</span>
              )}
            </button>
            <div className="hidden rounded-md border border-gray-300 p-0.5 md:flex dark:border-dark-border" role="group" aria-label="View">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                aria-pressed={view === 'table'}
                className={`inline-flex h-9 w-9 items-center justify-center rounded ${view === 'table' ? 'bg-primary text-white' : 'text-gray-600 dark:text-gray-300'}`}
                title="Table view"
              >
                <Table2 size={16} aria-hidden="true" />
                <span className="sr-only">Table view</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                aria-pressed={view === 'cards'}
                className={`inline-flex h-9 w-9 items-center justify-center rounded ${view === 'cards' ? 'bg-primary text-white' : 'text-gray-600 dark:text-gray-300'}`}
                title="Card view"
              >
                <LayoutGrid size={16} aria-hidden="true" />
                <span className="sr-only">Card view</span>
              </button>
            </div>
          </div>
        </div>

        {showFilters && (
          <div id="request-filters" className="mt-4 grid gap-3 border-t border-gray-200 pt-4 sm:grid-cols-2 lg:grid-cols-5 dark:border-dark-border">
            <div>
              <label htmlFor="f-status" className="label">Status</label>
              <select id="f-status" value={query.status} onChange={(e) => update({ status: e.target.value })} className="input">
                <option value="">All statuses</option>
                {STATUS_FILTER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="f-urgency" className="label">Urgency</label>
              <select id="f-urgency" value={query.urgency} onChange={(e) => update({ urgency: e.target.value })} className="input">
                <option value="">All urgencies</option>
                {URGENCY_FILTER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="f-category" className="label">Category</label>
              <select
                id="f-category"
                value={query.categoryId}
                onChange={(e) => update({ categoryId: e.target.value })}
                className="input"
                disabled={categories.loading}
              >
                <option value="">All categories</option>
                {(categories.data || []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="f-from" className="label">Reported from</label>
              <input
                id="f-from"
                type="date"
                value={query.dateFrom}
                max={query.dateTo || undefined}
                onChange={(e) => update({ dateFrom: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="f-to" className="label">Reported to</label>
              <input
                id="f-to"
                type="date"
                value={query.dateTo}
                min={query.dateFrom || undefined}
                onChange={(e) => update({ dateTo: e.target.value })}
                className="input"
              />
            </div>
          </div>
        )}

        {hasAnyFilter && (
          <div className="mt-3 flex items-center justify-between gap-2 text-sm">
            <p className="muted" aria-live="polite">
              {list.loading ? 'Searching…' : `${total} matching ${total === 1 ? 'request' : 'requests'}`}
            </p>
            <button type="button" className="btn-ghost btn-sm" onClick={clearAll}>
              <X size={14} aria-hidden="true" /> Clear filters
            </button>
          </div>
        )}
      </Card>

      {list.loading && !list.data && (
        <Card>
          <LoadingSpinner label="Loading your requests…" />
        </Card>
      )}
      {list.error && (
        <Card>
          <ErrorState error={list.error} title="Couldn't load your requests" onRetry={list.reload} />
        </Card>
      )}
      {!list.error && list.data && items.length === 0 && (
        <Card>
          {hasAnyFilter ? (
            <EmptyState
              icon={Search}
              title="No requests match"
              description="Try a different search or clear the filters."
              action={
                <button type="button" className="btn-secondary" onClick={clearAll}>
                  Clear filters
                </button>
              }
            />
          ) : (
            <EmptyState
              title="You haven't reported any issues yet"
              description="Scan the QR code on a lab PC to report your first problem."
              action={
                <Link to="/scan-qr" className="btn-primary">
                  Scan QR Code
                </Link>
              }
            />
          )}
        </Card>
      )}
      {!list.error && items.length > 0 && (
        <div className={list.loading ? 'opacity-60 transition-opacity' : ''} aria-busy={list.loading}>
          <TicketList tickets={items} view={view} />
          <Pagination
            page={list.data.page || query.page}
            pageSize={list.data.pageSize || PAGE_SIZE}
            total={total}
            disabled={list.loading}
            onPageChange={(p) => update({ page: p > 1 ? p : '' }, { resetPage: false })}
          />
        </div>
      )}
    </div>
  );
}

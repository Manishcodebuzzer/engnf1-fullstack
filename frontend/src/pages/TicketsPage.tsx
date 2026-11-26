import React, { useEffect, useState, useCallback, useTransition } from 'react';
import {
  Ticket as TicketIcon,
  Search,
  RefreshCw,
  Download,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  History,
  ShieldAlert,
  X,
  User as UserIcon,
} from 'lucide-react';
import { apiClient } from '../services/api';
import {
  Ticket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  ImportTicketItem,
  UpdateTicketData,
} from '../types';
import { Button } from '../components/ui/button';
import {
  formatLocalDateTime,
  getCategoryBadgeClass,
  getPriorityBadgeClass,
  getStatusBadgeClass,
} from '../utils/formatters';

// Sample feed batch to re-import
const SAMPLE_FEED: ImportTicketItem[] = [
  {
    externalId: 'FEED-1001',
    subject: 'Cannot sign in to account with 2FA enabled',
    body: 'I am locked out of my account because my 2fa authenticator app code is not accepted on login.',
  },
  {
    externalId: 'FEED-1002',
    subject: 'Duplicate charge on monthly invoice',
    body: 'I was charged twice on my invoice this morning. Please issue a refund for the extra payment.',
  },
  {
    externalId: 'FEED-1003',
    subject: 'Package has not arrived on scheduled date',
    body: 'My tracking link says delivery was expected yesterday but the shipping package has not arrived.',
  },
  {
    externalId: 'FEED-1004',
    subject: 'Application crashes with 500 error on checkout',
    body: 'When clicking pay now, the web page crashes with error code 500 exception and broken interface.',
  },
  {
    externalId: 'FEED-1005',
    subject: 'Urgent production down for entire organization',
    body: 'Our production down outage has locked out all users from accessing our service urgent assist.',
  },
  {
    externalId: 'FEED-1006',
    subject: 'Request to add export to CSV feature',
    body: 'We would love to see an export option on the analytics view for spreadsheet analysis.',
  },
];

export const TicketsPage: React.FC = () => {
  const [, startTransition] = useTransition();

  // Filter States
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  // Data States
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [totalTickets, setTotalTickets] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Status Indicators
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch tickets with composite filters
  const loadTickets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.tickets.list({
        status: statusFilter === 'ALL' ? undefined : (statusFilter as TicketStatus),
        category: categoryFilter === 'ALL' ? undefined : (categoryFilter as TicketCategory),
        priority: priorityFilter === 'ALL' ? undefined : (priorityFilter as TicketPriority),
        q: searchQuery.trim() || undefined,
        page,
        limit: 10,
      });

      setTickets(res.data);
      setTotalTickets(res.total);
      setTotalPages(res.totalPages || 1);

      // Keep selected ticket fresh if open
      if (selectedTicket) {
        const updated = res.data.find((t) => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to retrieve tickets');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, categoryFilter, priorityFilter, searchQuery, page, selectedTicket?.id]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Load single ticket details with audit history
  const handleSelectTicket = async (ticket: Ticket) => {
    try {
      const detail = await apiClient.tickets.getById(ticket.id);
      setSelectedTicket(detail);
    } catch {
      setSelectedTicket(ticket);
    }
  };

  // Re-import feed button
  const handleImportFeed = async () => {
    setIsImporting(true);
    setError(null);
    try {
      const res = await apiClient.tickets.import(SAMPLE_FEED);
      setToastMessage(
        `Feed processed: ${res.importedCount} imported, ${res.updatedCount} updated, ${res.skippedOverrideCount} overrides preserved.`
      );
      await loadTickets();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to import ticket feed');
    } finally {
      setIsImporting(false);
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  // Optimistic UI Ticket Field Update
  const handleOptimisticUpdate = async (fields: UpdateTicketData) => {
    if (!selectedTicket) return;

    // Snapshot previous state for rollback
    const previousSelected = { ...selectedTicket };
    const previousTickets = [...tickets];

    // Optimistically update local states immediately
    const updatedSelected = {
      ...selectedTicket,
      ...fields,
      isHumanOverride:
        fields.category !== undefined && fields.category !== selectedTicket.autoCategory
          ? true
          : selectedTicket.isHumanOverride,
    };

    setSelectedTicket(updatedSelected);
    setTickets((prev) =>
      prev.map((t) => (t.id === selectedTicket.id ? { ...t, ...fields } : t))
    );

    try {
      // Send PATCH to backend with actor attribution
      const result = await apiClient.tickets.update(
        selectedTicket.id,
        fields,
        undefined,
        'Agent'
      );
      // Update with server confirmed object
      setSelectedTicket(result);
      setTickets((prev) => prev.map((t) => (t.id === result.id ? result : t)));
    } catch (err: unknown) {
      // Rollback on failure
      const e = err as Error;
      setSelectedTicket(previousSelected);
      setTickets(previousTickets);
      setError(`Failed to update ticket: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Triage & Ticket Review
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automated ticket classification, urgency scoring, and reviewer override queue.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadTickets}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleImportFeed}
            disabled={isImporting}
            className="gap-2"
          >
            <Download className={`h-4 w-4 ${isImporting ? 'animate-spin' : ''}`} />
            <span>{isImporting ? 'Importing...' : 'Re-import Feed'}</span>
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {toastMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Composite Filter Bar */}
      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search subject or body..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                startTransition(() => setPage(1));
              }}
              className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">All Categories</option>
              <option value="BILLING">BILLING</option>
              <option value="BUG">BUG</option>
              <option value="FEATURE_REQUEST">FEATURE REQUEST</option>
              <option value="LOGIN">LOGIN</option>
              <option value="DELIVERY">DELIVERY</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">URGENT</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
          <span>Found {totalTickets} tickets matching filters</span>
          {(statusFilter !== 'ALL' || categoryFilter !== 'ALL' || priorityFilter !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setStatusFilter('ALL');
                setCategoryFilter('ALL');
                priorityFilter !== 'ALL' && setPriorityFilter('ALL');
                setSearchQuery('');
                setPage(1);
              }}
              className="text-primary hover:underline font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Main Content Layout: Table + Detail Panel */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Ticket List Table */}
        <div className={`space-y-4 ${selectedTicket ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground uppercase border-b">
                  <tr>
                    <th className="px-4 py-3">ID & Subject</th>
                    <th className="px-3 py-3">Category</th>
                    <th className="px-3 py-3">Priority</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading && tickets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-muted-foreground">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                        <p>Loading support tickets...</p>
                      </td>
                    </tr>
                  ) : tickets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-muted-foreground">
                        <TicketIcon className="h-8 w-8 mx-auto mb-2 text-muted" />
                        <p className="font-semibold text-foreground">No tickets found</p>
                        <p className="text-xs mt-1">Try adjusting your search filters or click "Re-import Feed".</p>
                      </td>
                    </tr>
                  ) : (
                    tickets.map((t) => {
                      const isSelected = selectedTicket?.id === t.id;
                      return (
                        <tr
                          key={t.id}
                          onClick={() => handleSelectTicket(t)}
                          className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                            isSelected ? 'bg-primary/5 font-medium' : ''
                          }`}
                        >
                          <td className="px-4 py-3 max-w-[280px]">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="font-mono text-[11px] text-muted-foreground">
                                {t.externalId}
                              </span>
                              {t.isHumanOverride && (
                                <span
                                  title="Manually overridden by reviewer"
                                  className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-semibold"
                                >
                                  OVERRIDE
                                </span>
                              )}
                            </div>
                            <div className="truncate font-medium text-foreground">{t.subject}</div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${getCategoryBadgeClass(
                                t.category
                              )}`}
                            >
                              {t.category.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${getPriorityBadgeClass(
                                t.priority
                              )}`}
                            >
                              {t.priority}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${getStatusBadgeClass(
                                t.status
                              )}`}
                            >
                              {t.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                            {formatLocalDateTime(t.createdAt)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
                <span>
                  Page {page} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Prev</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 px-2"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Selected Ticket Review & Audit Panel */}
        {selectedTicket && (
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-5 sticky top-20">
              {/* Header and Close */}
              <div className="flex items-start justify-between gap-3 border-b pb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-semibold text-primary">
                      {selectedTicket.externalId}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${getStatusBadgeClass(
                        selectedTicket.status
                      )}`}
                    >
                      {selectedTicket.status}
                    </span>
                    {selectedTicket.isReviewed && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                        Reviewed
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-bold text-foreground leading-snug">
                    {selectedTicket.subject}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                  aria-label="Close panel"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Ticket Body (rendered safely as plain text) */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  Description / Body
                </span>
                <div className="rounded-lg bg-muted/40 p-3 text-xs leading-relaxed text-foreground whitespace-pre-wrap font-sans border">
                  {selectedTicket.body}
                </div>
              </div>

              {/* Optimistic Editing Controls */}
              <div className="space-y-3 rounded-lg border p-3 bg-muted/20">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Triage Review Controls</span>
                  <span className="text-[10px] font-normal text-emerald-600">
                    Auto-saved optimistically
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  {/* Category */}
                  <div>
                    <label className="font-medium text-muted-foreground block mb-1">Category</label>
                    <select
                      value={selectedTicket.category}
                      onChange={(e) =>
                        handleOptimisticUpdate({ category: e.target.value as TicketCategory })
                      }
                      className="w-full rounded border bg-background px-2 py-1.5 text-xs font-medium focus:ring-2 focus:ring-primary"
                    >
                      <option value="BILLING">BILLING</option>
                      <option value="BUG">BUG</option>
                      <option value="FEATURE_REQUEST">FEATURE REQUEST</option>
                      <option value="LOGIN">LOGIN</option>
                      <option value="DELIVERY">DELIVERY</option>
                    </select>
                    {selectedTicket.isHumanOverride && (
                      <p className="text-[10px] text-amber-700 mt-1 flex items-center gap-1">
                        <ShieldAlert className="h-3 w-3" />
                        <span>Manual override (original: {selectedTicket.autoCategory})</span>
                      </p>
                    )}
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="font-medium text-muted-foreground block mb-1">Priority</label>
                    <select
                      value={selectedTicket.priority}
                      onChange={(e) =>
                        handleOptimisticUpdate({ priority: e.target.value as TicketPriority })
                      }
                      className="w-full rounded border bg-background px-2 py-1.5 text-xs font-medium focus:ring-2 focus:ring-primary"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="URGENT">URGENT</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="font-medium text-muted-foreground block mb-1">Status</label>
                    <select
                      value={selectedTicket.status}
                      onChange={(e) =>
                        handleOptimisticUpdate({ status: e.target.value as TicketStatus })
                      }
                      className="w-full rounded border bg-background px-2 py-1.5 text-xs font-medium focus:ring-2 focus:ring-primary"
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="IN_PROGRESS">IN PROGRESS</option>
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="CLOSED">CLOSED</option>
                    </select>
                  </div>

                  {/* Reviewed Status */}
                  <div>
                    <label className="font-medium text-muted-foreground block mb-1">Reviewed State</label>
                    <button
                      onClick={() =>
                        handleOptimisticUpdate({ isReviewed: !selectedTicket.isReviewed })
                      }
                      className={`w-full rounded border px-2 py-1.5 text-xs font-medium text-center transition-colors ${
                        selectedTicket.isReviewed
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-background text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {selectedTicket.isReviewed ? '✓ Mark as Unreviewed' : 'Mark as Reviewed'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Audit History Timeline */}
              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <History className="h-3.5 w-3.5" />
                  <span>Audit History & Events</span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {!selectedTicket.events || selectedTicket.events.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No manual changes recorded yet.</p>
                  ) : (
                    selectedTicket.events.map((ev) => (
                      <div
                        key={ev.id}
                        className="rounded-lg border bg-muted/20 p-2 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span className="font-medium text-foreground flex items-center gap-1">
                            <UserIcon className="h-3 w-3 text-muted-foreground" />
                            {ev.actor}
                          </span>
                          <span>{formatLocalDateTime(ev.createdAt)}</span>
                        </div>
                        <div className="text-[11px] text-slate-700">
                          Changed <span className="font-mono font-semibold">{ev.field}</span> from{' '}
                          <span className="line-through text-muted-foreground">{ev.oldValue || 'none'}</span>{' '}
                          to <span className="font-semibold text-primary">{ev.newValue || 'none'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketsPage;

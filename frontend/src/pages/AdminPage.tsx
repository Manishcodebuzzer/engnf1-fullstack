import React, { useEffect, useState, useCallback } from 'react';
import {
  Building2,
  CalendarCheck,
  BarChart3,
  PlusCircle,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Clock,
  X,
} from 'lucide-react';
import { apiClient } from '../services/api';
import {
  Resource,
  ResourceType,
  CreateResourceData,
  UpdateResourceData,
  Booking,
  BookingStatus,
  AdminStats,
} from '../types';
import { Button } from '../components/ui/button';
import {
  formatLocalDate,
  formatLocalTime,
  getResourceTypeBadgeClass,
  getBookingStatusBadgeClass,
} from '../utils/formatters';

type AdminTab = 'RESOURCES' | 'BOOKINGS' | 'ANALYTICS';

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('RESOURCES');

  // Shared state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ── Resources Tab State ─────────────────────────────────────────────────────
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourceSearch, setResourceSearch] = useState<string>('');
  const [isResourceModalOpen, setIsResourceModalOpen] = useState<boolean>(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [resourceForm, setResourceForm] = useState<CreateResourceData>({
    name: '',
    type: 'ROOM',
    capacity: 10,
    description: '',
    isActive: true,
  });

  // ── Bookings Tab State ──────────────────────────────────────────────────────
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('ALL');
  const [bookingPage, setBookingPage] = useState<number>(1);
  const [bookingTotalPages, setBookingTotalPages] = useState<number>(1);

  // Rejection Modal State
  const [rejectingBooking, setRejectingBooking] = useState<Booking | null>(null);
  const [rejectNote, setRejectNote] = useState<string>('');
  const [isRejecting, setIsRejecting] = useState<boolean>(false);

  // ── Analytics Tab State ─────────────────────────────────────────────────────
  const [stats, setStats] = useState<AdminStats | null>(null);

  // Load Resources (including inactive)
  const loadResources = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.resources.list({
        search: resourceSearch.trim() || undefined,
        limit: 100,
      });
      setResources(res.data);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to load resources');
    } finally {
      setIsLoading(false);
    }
  }, [resourceSearch]);

  // Load Bookings (all users)
  const loadBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.bookings.list({
        status: bookingStatusFilter === 'ALL' ? undefined : (bookingStatusFilter as BookingStatus),
        page: bookingPage,
        limit: 10,
      });
      setBookings(res.data);
      setBookingTotalPages(res.totalPages || 1);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to load bookings');
    } finally {
      setIsLoading(false);
    }
  }, [bookingStatusFilter, bookingPage]);

  // Load Analytics
  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.admin.getStats();
      setStats(res);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to load admin telemetry');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'RESOURCES') loadResources();
    if (activeTab === 'BOOKINGS') loadBookings();
    if (activeTab === 'ANALYTICS') loadAnalytics();
  }, [activeTab, loadResources, loadBookings, loadAnalytics]);

  // Create / Update Resource
  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (resourceForm.name.trim().length < 3 || resourceForm.name.trim().length > 60) {
      setError('Resource name must be between 3 and 60 characters.');
      return;
    }

    if (resourceForm.capacity < 1 || resourceForm.capacity > 500) {
      setError('Capacity must be between 1 and 500.');
      return;
    }

    try {
      if (editingResource) {
        const updatePayload: UpdateResourceData = {
          name: resourceForm.name.trim(),
          type: resourceForm.type,
          capacity: Number(resourceForm.capacity),
          description: resourceForm.description?.trim() || null,
          isActive: resourceForm.isActive,
        };
        await apiClient.resources.update(editingResource.id, updatePayload);
        setSuccessMessage(`Resource "${resourceForm.name}" updated successfully.`);
      } else {
        await apiClient.resources.create({
          name: resourceForm.name.trim(),
          type: resourceForm.type,
          capacity: Number(resourceForm.capacity),
          description: resourceForm.description?.trim() || null,
          isActive: resourceForm.isActive ?? true,
        });
        setSuccessMessage(`Resource "${resourceForm.name}" created successfully.`);
      }
      setIsResourceModalOpen(false);
      setEditingResource(null);
      await loadResources();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to save resource');
    } finally {
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  // Toggle Resource Active/Inactive directly
  const handleToggleActive = async (resource: Resource) => {
    try {
      await apiClient.resources.update(resource.id, { isActive: !resource.isActive });
      setSuccessMessage(
        `Resource "${resource.name}" is now ${!resource.isActive ? 'ACTIVE' : 'INACTIVE'}.`
      );
      await loadResources();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to update resource status');
    } finally {
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  // Approve Booking
  const handleApproveBooking = async (id: string) => {
    try {
      await apiClient.bookings.approve(id);
      setSuccessMessage('Booking approved successfully.');
      await loadBookings();
    } catch (err: unknown) {
      const e = err as Error;
      setError(`Failed to approve booking: ${e.message}`);
    } finally {
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  // Reject Booking
  const handleRejectBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingBooking) return;

    if (rejectNote.trim().length < 5 || rejectNote.trim().length > 200) {
      setError('Rejection note must be between 5 and 200 characters.');
      return;
    }

    setIsRejecting(true);
    try {
      await apiClient.bookings.reject(rejectingBooking.id, rejectNote.trim());
      setSuccessMessage('Booking rejected with notice.');
      setRejectingBooking(null);
      setRejectNote('');
      await loadBookings();
    } catch (err: unknown) {
      const e = err as Error;
      setError(`Failed to reject booking: ${e.message}`);
    } finally {
      setIsRejecting(false);
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold border border-rose-200">
              Admin Privilege Zone
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            System Administration
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage physical facility slots, triage approval gates, and organizational metrics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (activeTab === 'RESOURCES') loadResources();
              if (activeTab === 'BOOKINGS') loadBookings();
              if (activeTab === 'ANALYTICS') loadAnalytics();
            }}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
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

      {/* Admin Tab Navigation */}
      <div className="flex items-center gap-2 border-b">
        <button
          onClick={() => setActiveTab('RESOURCES')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'RESOURCES'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Resource Management</span>
        </button>
        <button
          onClick={() => setActiveTab('BOOKINGS')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'BOOKINGS'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <CalendarCheck className="h-4 w-4" />
          <span>Booking Approvals</span>
        </button>
        <button
          onClick={() => setActiveTab('ANALYTICS')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'ANALYTICS'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Admin Telemetry</span>
        </button>
      </div>

      {/* ─── TAB 1: RESOURCE MANAGEMENT ────────────────────────────────────────── */}
      {activeTab === 'RESOURCES' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filter resources..."
                value={resourceSearch}
                onChange={(e) => setResourceSearch(e.target.value)}
                className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingResource(null);
                setResourceForm({
                  name: '',
                  type: 'ROOM',
                  capacity: 10,
                  description: '',
                  isActive: true,
                });
                setIsResourceModalOpen(true);
              }}
              className="gap-2 shrink-0"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Create Resource</span>
            </Button>
          </div>

          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground uppercase border-b">
                  <tr>
                    <th className="px-4 py-3">Resource Name</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Capacity</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {resources.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground text-xs">
                        No resources registered yet.
                      </td>
                    </tr>
                  ) : (
                    resources.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">{r.name}</div>
                          {r.description && (
                            <div className="text-xs text-muted-foreground truncate max-w-xs">
                              {r.description}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${getResourceTypeBadgeClass(
                              r.type
                            )}`}
                          >
                            {r.type}
                          </span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-xs text-muted-foreground">
                          {r.capacity} people
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleActive(r)}
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border cursor-pointer transition-colors ${
                              r.isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            {r.isActive ? '● Active' : '○ Inactive'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingResource(r);
                              setResourceForm({
                                name: r.name,
                                type: r.type,
                                capacity: r.capacity,
                                description: r.description || '',
                                isActive: r.isActive,
                              });
                              setIsResourceModalOpen(true);
                            }}
                            className="h-7 px-2.5 text-xs gap-1"
                          >
                            <Edit2 className="h-3 w-3" />
                            <span>Edit</span>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: BOOKING APPROVALS ──────────────────────────────────────────── */}
      {activeTab === 'BOOKINGS' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 border-b pb-2">
            {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map((st) => (
              <button
                key={st}
                onClick={() => {
                  setBookingStatusFilter(st);
                  setBookingPage(1);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  bookingStatusFilter === st
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="rounded-xl border bg-card shadow-sm overflow-hidden divide-y">
            {bookings.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs">
                No bookings found for this filter.
              </div>
            ) : (
              bookings.map((b) => {
                const isPending = b.status === 'PENDING';
                return (
                  <div
                    key={b.id}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
                  >
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-sm">
                          {b.resource?.name || 'Resource'}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full border font-mono font-semibold ${getBookingStatusBadgeClass(
                            b.status
                          )}`}
                        >
                          {b.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold text-slate-700">Applicant: </span>
                        {b.user?.name} ({b.user?.email})
                      </p>
                      <p className="text-xs text-slate-700">
                        <span className="font-semibold">Purpose: </span>
                        {b.purpose}
                      </p>
                      {b.decisionNote && (
                        <p className="text-xs text-rose-800 bg-rose-50 p-2 rounded border border-rose-200">
                          <span className="font-semibold">Decision Note: </span>
                          {b.decisionNote}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col md:items-end gap-2 shrink-0">
                      <div className="text-xs font-semibold text-foreground flex items-center md:justify-end gap-1">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        <span>
                          {formatLocalDate(b.startTime)}, {formatLocalTime(b.startTime)} -{' '}
                          {formatLocalTime(b.endTime)}
                        </span>
                      </div>
                      {isPending && (
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            size="sm"
                            onClick={() => handleApproveBooking(b.id)}
                            className="text-xs h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Approve</span>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setRejectingBooking(b);
                              setRejectNote('');
                            }}
                            className="text-xs h-7 px-3 gap-1"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Reject</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {bookingTotalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
                <span>
                  Page {bookingPage} of {bookingTotalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={bookingPage <= 1}
                    onClick={() => setBookingPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-2"
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={bookingPage >= bookingTotalPages}
                    onClick={() => setBookingPage((p) => Math.min(bookingTotalPages, p + 1))}
                    className="h-8 px-2"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 3: ADMIN TELEMETRY ────────────────────────────────────────────── */}
      {activeTab === 'ANALYTICS' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-1">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Active Resources
              </span>
              <div className="text-2xl font-bold tracking-tight">
                {stats?.activeResources ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">Facilities currently open</p>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-1">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Total Tickets
              </span>
              <div className="text-2xl font-bold tracking-tight text-blue-600">
                {stats?.ticketStats?.totalTickets ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">Triaged across all categories</p>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-1">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                AI Agreement Rate
              </span>
              <div className="text-2xl font-bold tracking-tight text-purple-600">
                {stats?.ticketStats?.modelAgreementRate ?? 100}%
              </div>
              <p className="text-xs text-muted-foreground">Original autoCategory precision</p>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-1">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Reviewed Volume
              </span>
              <div className="text-2xl font-bold tracking-tight text-emerald-600">
                {stats?.ticketStats?.reviewedCount ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">Manually certified by staff</p>
            </div>
          </div>

          {/* Top 3 Resources by Booking Volume */}
          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <span>Top 3 Resources by Booking Volume</span>
            </h3>

            {!stats?.topResources || stats.topResources.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No booking activity recorded yet.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                {stats.topResources.map((tr, idx) => (
                  <div key={tr.id || idx} className="rounded-lg border p-4 bg-muted/20 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground truncate">{tr.name}</span>
                      <span className="text-xs font-bold text-primary font-mono">
                        {tr.bookingCount} bookings
                      </span>
                    </div>
                    {tr.type && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded-full border font-medium ${getResourceTypeBadgeClass(
                          tr.type
                        )}`}
                      >
                        {tr.type}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resource Create / Edit Modal */}
      {isResourceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-foreground">
                {editingResource ? 'Edit Resource' : 'Create New Resource'}
              </h3>
              <button
                onClick={() => setIsResourceModalOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveResource} className="space-y-4 text-xs">
              <div>
                <label className="font-medium text-foreground block mb-1">Resource Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lab Delta"
                  value={resourceForm.name}
                  onChange={(e) => setResourceForm({ ...resourceForm, name: e.target.value })}
                  className="w-full rounded border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-foreground block mb-1">Type</label>
                  <select
                    value={resourceForm.type}
                    onChange={(e) =>
                      setResourceForm({ ...resourceForm, type: e.target.value as ResourceType })
                    }
                    className="w-full rounded border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="ROOM">ROOM</option>
                    <option value="LAB">LAB</option>
                    <option value="EQUIPMENT">EQUIPMENT</option>
                  </select>
                </div>

                <div>
                  <label className="font-medium text-foreground block mb-1">Capacity (1–500)</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    required
                    value={resourceForm.capacity}
                    onChange={(e) =>
                      setResourceForm({ ...resourceForm, capacity: parseInt(e.target.value, 10) || 1 })
                    }
                    className="w-full rounded border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-foreground block mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  maxLength={300}
                  placeholder="Details regarding hardware, location, or equipment constraints..."
                  value={resourceForm.description || ''}
                  onChange={(e) => setResourceForm({ ...resourceForm, description: e.target.value })}
                  className="w-full rounded border bg-background p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={resourceForm.isActive}
                  onChange={(e) =>
                    setResourceForm({ ...resourceForm, isActive: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="isActiveToggle" className="font-medium text-foreground cursor-pointer">
                  Resource is active and bookable
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsResourceModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingResource ? 'Save Changes' : 'Create Resource'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Booking Modal with Note */}
      {rejectingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <XCircle className="h-5 w-5 text-destructive" />
                <span>Reject Booking</span>
              </h3>
              <button
                onClick={() => setRejectingBooking(null)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRejectBooking} className="space-y-4 text-xs">
              <p className="text-muted-foreground">
                Provide a reason for rejecting the slot request for{' '}
                <span className="font-semibold text-foreground">
                  {rejectingBooking.resource?.name}
                </span>
                .
              </p>

              <div>
                <label className="font-medium text-foreground block mb-1">
                  Decision Note <span className="text-muted-foreground">(5–200 characters)</span>
                </label>
                <textarea
                  required
                  rows={3}
                  minLength={5}
                  maxLength={200}
                  placeholder="e.g. Room booked for critical hardware maintenance..."
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  className="w-full rounded border bg-background p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRejectingBooking(null)}
                  disabled={isRejecting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  size="sm"
                  disabled={isRejecting}
                >
                  {isRejecting ? 'Rejecting...' : 'Reject Slot'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;

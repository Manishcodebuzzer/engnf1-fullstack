import React, { useEffect, useState, useCallback } from 'react';
import {
  Building2,
  Search,
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  X,
} from 'lucide-react';
import { apiClient } from '../services/api';
import {
  Resource,
  ResourceType,
  BookingSlot,
  CreateBookingData,
} from '../types';
import { Button } from '../components/ui/button';
import {
  formatLocalTime,
  getResourceTypeBadgeClass,
  getBookingStatusBadgeClass,
} from '../utils/formatters';

// Available time slot intervals for 30-min grid
const TIME_OPTIONS = [
  '08:00',
  '08:30',
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
  '18:30',
  '19:00',
  '19:30',
  '20:00',
];

export const ResourcesPage: React.FC = () => {
  // Filters
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [minCapacity, setMinCapacity] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  // Data
  const [resources, setResources] = useState<Resource[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  // Availability & Booking Modal States
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Tomorrow as sensible default future date
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [bookedSlots, setBookedSlots] = useState<BookingSlot[]>([]);
  const [isAvailabilityLoading, setIsAvailabilityLoading] = useState<boolean>(false);

  // Booking Form States
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);
  const [startTimeStr, setStartTimeStr] = useState<string>('10:00');
  const [endTimeStr, setEndTimeStr] = useState<string>('11:00');
  const [purpose, setPurpose] = useState<string>('');
  const [ticketId, setTicketId] = useState<string>('');
  const [isBookingSubmitting, setIsBookingSubmitting] = useState<boolean>(false);

  // Status
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch Resources list
  const loadResources = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.resources.list({
        search: search.trim() || undefined,
        type: typeFilter === 'ALL' ? undefined : (typeFilter as ResourceType),
        minCapacity: minCapacity ? parseInt(minCapacity, 10) : undefined,
        page,
        limit: 10,
      });
      setResources(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages || 1);

      if (res.data.length > 0 && !selectedResource) {
        setSelectedResource(res.data[0]);
      }
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to retrieve resources');
    } finally {
      setIsLoading(false);
    }
  }, [search, typeFilter, minCapacity, page, selectedResource]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  // Fetch Availability for Selected Resource & Date
  const loadAvailability = useCallback(async () => {
    if (!selectedResource) return;
    setIsAvailabilityLoading(true);
    try {
      // Query window for the selected day in UTC
      const from = `${selectedDate}T00:00:00.000Z`;
      const to = `${selectedDate}T23:59:59.999Z`;

      const data = await apiClient.resources.getAvailability(selectedResource.id, from, to);
      setBookedSlots(data.bookings || []);
    } catch (err: unknown) {
      const e = err as Error;
      console.warn('Availability load failed:', e.message);
    } finally {
      setIsAvailabilityLoading(false);
    }
  }, [selectedResource, selectedDate]);

  useEffect(() => {
    if (selectedResource) {
      loadAvailability();
    }
  }, [selectedResource, selectedDate, loadAvailability]);

  // Handle Booking Creation
  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResource) return;

    setBookingError(null);

    // Build ISO UTC strings
    const startIso = `${selectedDate}T${startTimeStr}:00.000Z`;
    const endIso = `${selectedDate}T${endTimeStr}:00.000Z`;

    const start = new Date(startIso);
    const end = new Date(endIso);
    const now = new Date();

    if (start <= now) {
      setBookingError('Start time must be in the future.');
      return;
    }

    if (end <= start) {
      setBookingError('End time must be strictly after start time.');
      return;
    }

    const durationMin = (end.getTime() - start.getTime()) / (60 * 1000);
    if (durationMin < 30 || durationMin > 240) {
      setBookingError('Duration must be between 30 and 240 minutes (4 hours).');
      return;
    }

    if (purpose.trim().length < 5 || purpose.trim().length > 200) {
      setBookingError('Purpose must be between 5 and 200 characters.');
      return;
    }

    const payload: CreateBookingData = {
      resourceId: selectedResource.id,
      startTime: startIso,
      endTime: endIso,
      purpose: purpose.trim(),
      ticketId: ticketId.trim() || null,
    };

    setIsBookingSubmitting(true);
    try {
      await apiClient.bookings.create(payload);
      setSuccessMessage(
        `Booking requested successfully for ${selectedResource.name} on ${selectedDate} (${startTimeStr} - ${endTimeStr} UTC). Status: PENDING.`
      );
      setIsBookingModalOpen(false);
      setPurpose('');
      setTicketId('');
      // Refresh availability immediately
      await loadAvailability();
    } catch (err: unknown) {
      const e = err as Error;
      setBookingError(e.message || 'Failed to create booking.');
    } finally {
      setIsBookingSubmitting(false);
      setTimeout(() => setSuccessMessage(null), 6000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Resource Catalog & Scheduling
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Explore active laboratory, boardroom, and technician equipment slots.
          </p>
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
          <Button size="sm" variant="outline" onClick={loadResources}>
            Retry
          </Button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search resource name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">All Types (Rooms, Labs, Equipment)</option>
              <option value="ROOM">ROOM</option>
              <option value="LAB">LAB</option>
              <option value="EQUIPMENT">EQUIPMENT</option>
            </select>
          </div>

          {/* Min Capacity Filter */}
          <div>
            <input
              type="number"
              min="1"
              max="500"
              placeholder="Min capacity (e.g. 10)"
              value={minCapacity}
              onChange={(e) => {
                setMinCapacity(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
          <span>Found {total} active resources</span>
          {(search || typeFilter !== 'ALL' || minCapacity) && (
            <button
              onClick={() => {
                setSearch('');
                setTypeFilter('ALL');
                setMinCapacity('');
                setPage(1);
              }}
              className="text-primary hover:underline font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Resources List + Availability / Booking Details */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Resources Table */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground uppercase border-b">
                  <tr>
                    <th className="px-4 py-3">Resource Name</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Capacity</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading && resources.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-muted-foreground">
                        <Building2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                        <p>Loading resources...</p>
                      </td>
                    </tr>
                  ) : resources.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-muted-foreground">
                        <Building2 className="h-8 w-8 mx-auto mb-2 text-muted" />
                        <p className="font-semibold text-foreground">No resources found</p>
                        <p className="text-xs mt-1">Try broadening your search query or capacity filter.</p>
                      </td>
                    </tr>
                  ) : (
                    resources.map((r) => {
                      const isSelected = selectedResource?.id === r.id;
                      return (
                        <tr
                          key={r.id}
                          onClick={() => setSelectedResource(r)}
                          className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                            isSelected ? 'bg-primary/5 font-medium' : ''
                          }`}
                        >
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
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{r.capacity} people</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant={isSelected ? 'default' : 'outline'}
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedResource(r);
                                setIsBookingModalOpen(true);
                              }}
                              className="text-xs h-7 px-2.5"
                            >
                              Book Slot
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
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

        {/* Selected Resource Availability & Booking Panel */}
        <div className="lg:col-span-5 space-y-4">
          {selectedResource ? (
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-5 sticky top-20">
              <div className="flex items-start justify-between border-b pb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getResourceTypeBadgeClass(
                        selectedResource.type
                      )}`}
                    >
                      {selectedResource.type}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>Capacity: {selectedResource.capacity}</span>
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-foreground">{selectedResource.name}</h2>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsBookingModalOpen(true)}
                  className="gap-1.5 text-xs shadow-sm"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Book Slot</span>
                </Button>
              </div>

              {selectedResource.description && (
                <p className="text-xs text-muted-foreground leading-relaxed bg-muted/20 p-2.5 rounded-lg border">
                  {selectedResource.description}
                </p>
              )}

              {/* Date Selector for Availability */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Check Availability Date</span>
                  </span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="rounded border bg-background px-2 py-1 text-xs font-medium focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Availability Slots List */}
                <div className="rounded-lg border p-3 bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">
                      Booked Slots on {selectedDate}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {bookedSlots.length} reserved
                    </span>
                  </div>

                  {isAvailabilityLoading ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      <Clock className="h-4 w-4 animate-spin mx-auto mb-1 text-primary" />
                      <span>Querying resource schedule...</span>
                    </div>
                  ) : bookedSlots.length === 0 ? (
                    <div className="py-4 text-center text-xs text-emerald-700 bg-emerald-50 rounded border border-emerald-200">
                      ✓ All time slots are currently available on this day!
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {bookedSlots.map((slot) => (
                        <div
                          key={slot.id}
                          className="flex items-center justify-between rounded bg-background p-2 border text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-mono font-medium">
                              {formatLocalTime(slot.startTime)} - {formatLocalTime(slot.endTime)}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded border font-mono font-medium ${getBookingStatusBadgeClass(
                              slot.status
                            )}`}
                          >
                            {slot.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-[11px] text-muted-foreground">
                    * Back-to-back bookings are fully permitted. Overlapping requests will be rejected atomically.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground shadow-sm">
              <Building2 className="h-8 w-8 mx-auto mb-2 text-muted" />
              <p>Select a resource to inspect its calendar availability.</p>
            </div>
          )}
        </div>
      </div>

      {/* Booking Modal */}
      {isBookingModalOpen && selectedResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-base text-foreground">Schedule Resource Slot</h3>
                <p className="text-xs text-muted-foreground">{selectedResource.name}</p>
              </div>
              <button
                onClick={() => setIsBookingModalOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {bookingError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{bookingError}</span>
              </div>
            )}

            <form onSubmit={handleCreateBooking} className="space-y-4 text-xs">
              {/* Date */}
              <div>
                <label className="font-medium text-foreground block mb-1">Date (UTC)</label>
                <input
                  type="date"
                  required
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full rounded border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Start & End Times (30-min grid) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-foreground block mb-1">Start Time (UTC)</label>
                  <select
                    value={startTimeStr}
                    onChange={(e) => setStartTimeStr(e.target.value)}
                    className="w-full rounded border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {TIME_OPTIONS.slice(0, -1).map((t) => (
                      <option key={t} value={t}>
                        {t} UTC
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-medium text-foreground block mb-1">End Time (UTC)</label>
                  <select
                    value={endTimeStr}
                    onChange={(e) => setEndTimeStr(e.target.value)}
                    className="w-full rounded border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {TIME_OPTIONS.slice(1).map((t) => (
                      <option key={t} value={t}>
                        {t} UTC
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Purpose */}
              <div>
                <label className="font-medium text-foreground block mb-1">
                  Purpose <span className="text-muted-foreground font-normal">(5–200 characters)</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="State the objective of this session (e.g. Diagnostic testing for hardware crash)..."
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full rounded border bg-background p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Optional Ticket ID */}
              <div>
                <label className="font-medium text-foreground block mb-1">
                  Optional Linked Ticket ID
                </label>
                <input
                  type="text"
                  placeholder="Paste UUID of associated ticket if applicable"
                  value={ticketId}
                  onChange={(e) => setTicketId(e.target.value)}
                  className="w-full rounded border bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsBookingModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isBookingSubmitting}>
                  {isBookingSubmitting ? 'Confirming...' : 'Request Booking'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourcesPage;

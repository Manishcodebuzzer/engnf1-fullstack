import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarClock,
  Clock,
  AlertCircle,
  CheckCircle2,
  Ban,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  PlusCircle,
  Tag,
  X,
} from 'lucide-react';
import { apiClient } from '../services/api';
import { Booking, BookingStatus } from '../types';
import { Button } from '../components/ui/button';
import {
  formatLocalDateTime,
  formatLocalTime,
  formatLocalDate,
  getBookingStatusBadgeClass,
  getResourceTypeBadgeClass,
} from '../utils/formatters';

export const MyBookingsPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Cancellation Modal State
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  const loadMyBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.bookings.mine({
        status: statusFilter === 'ALL' ? undefined : (statusFilter as BookingStatus),
        page,
        limit: 10,
      });
      setBookings(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages || 1);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to load bookings');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    loadMyBookings();
  }, [loadMyBookings]);

  // Handle Cancellation
  const handleConfirmCancel = async () => {
    if (!bookingToCancel) return;
    setIsCancelling(true);
    setError(null);
    try {
      await apiClient.bookings.cancel(bookingToCancel.id);
      setSuccessMessage('Booking cancelled successfully.');
      setBookingToCancel(null);
      await loadMyBookings();
    } catch (err: unknown) {
      const e = err as Error;
      setError(`Failed to cancel booking: ${e.message}`);
    } finally {
      setIsCancelling(false);
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">My Bookings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your reserved technician consultations, lab slots, and conference sessions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMyBookings}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Link to="/resources">
            <Button size="sm" className="gap-2">
              <PlusCircle className="h-4 w-4" />
              <span>Book New Slot</span>
            </Button>
          </Link>
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

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b pb-2">
        {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map((st) => (
          <button
            key={st}
            onClick={() => {
              setStatusFilter(st);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              statusFilter === st
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {isLoading && bookings.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-sm">Retrieving your bookings...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground space-y-3">
            <CalendarClock className="h-10 w-10 mx-auto text-muted" />
            <div>
              <p className="font-semibold text-foreground text-base">No bookings found</p>
              <p className="text-xs text-muted-foreground mt-1">
                You haven't requested any resource bookings matching this filter.
              </p>
            </div>
            <Link to="/resources">
              <Button size="sm" variant="outline">
                Explore Resources
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y">
            {bookings.map((b) => {
              const isFuture = new Date(b.startTime) > new Date();
              const canCancel = (b.status === 'PENDING' || b.status === 'APPROVED') && isFuture;

              return (
                <div
                  key={b.id}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors hover:bg-muted/30"
                >
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-base">
                        {b.resource?.name || 'Assigned Resource'}
                      </span>
                      {b.resource?.type && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getResourceTypeBadgeClass(
                            b.resource.type
                          )}`}
                        >
                          {b.resource.type}
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border font-mono font-semibold ${getBookingStatusBadgeClass(
                          b.status
                        )}`}
                      >
                        {b.status}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <span className="font-semibold text-slate-700">Purpose: </span>
                      {b.purpose}
                    </p>

                    {b.decisionNote && (
                      <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                        <span className="font-semibold">Reviewer Note: </span>
                        {b.decisionNote}
                      </p>
                    )}

                    {b.ticket && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                        <Tag className="h-3 w-3 text-primary" />
                        <span>Linked Ticket: </span>
                        <Link
                          to="/tickets"
                          className="font-mono text-primary hover:underline font-semibold"
                        >
                          {b.ticket.externalId} — {b.ticket.subject}
                        </Link>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-3 shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                    <div className="text-right">
                      <div className="text-xs font-semibold text-foreground flex items-center md:justify-end gap-1">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        <span>
                          {formatLocalDate(b.startTime)}, {formatLocalTime(b.startTime)} -{' '}
                          {formatLocalTime(b.endTime)}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Booked on {formatLocalDateTime(b.createdAt)}
                      </div>
                    </div>

                    {canCancel && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setBookingToCancel(b)}
                        className="text-xs h-7 px-3 gap-1"
                      >
                        <Ban className="h-3.5 w-3.5" />
                        <span>Cancel Booking</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
            <span>
              Page {page} of {totalPages} ({total} total bookings)
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

      {/* Cancellation Confirmation Dialog */}
      {bookingToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Ban className="h-5 w-5 text-destructive" />
                <span>Cancel Booking</span>
              </h3>
              <button
                onClick={() => setBookingToCancel(null)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to cancel your slot for{' '}
              <span className="font-semibold text-foreground">
                {bookingToCancel.resource?.name || 'this resource'}
              </span>{' '}
              on{' '}
              <span className="font-semibold text-foreground">
                {formatLocalDateTime(bookingToCancel.startTime)}
              </span>
              ? This action frees the slot for other team members immediately.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBookingToCancel(null)}
                disabled={isCancelling}
              >
                Keep Booking
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
              >
                {isCancelling ? 'Cancelling...' : 'Yes, Cancel Slot'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBookingsPage;

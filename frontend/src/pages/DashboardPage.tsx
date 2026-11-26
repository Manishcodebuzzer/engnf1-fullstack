import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Ticket,
  CheckCircle2,
  Brain,
  Building2,
  CalendarClock,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  Layers,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';
import { TicketStats, AdminStats, BookingStatus } from '../types';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { getBookingStatusBadgeClass } from '../utils/formatters';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [ticketStats, setTicketStats] = useState<TicketStats | null>(null);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [activeResourceCount, setActiveResourceCount] = useState<number>(0);
  const [userBookingCounts, setUserBookingCounts] = useState<Record<BookingStatus, number>>({
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
    CANCELLED: 0,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (isAdmin) {
        // ADMIN can access full overview analytics
        const adminData = await apiClient.admin.getStats();
        setAdminStats(adminData);
        setTicketStats(adminData.ticketStats as TicketStats);
        setActiveResourceCount(adminData.activeResources);
      } else {
        // Standard USER uses /api/stats and available endpoints
        const [statsData, resList, myBookings] = await Promise.all([
          apiClient.stats.get(),
          apiClient.resources.list({ page: 1, limit: 1 }),
          apiClient.bookings.mine({ page: 1, limit: 100 }),
        ]);
        setTicketStats(statsData);
        setActiveResourceCount(resList.total);

        // Aggregate user's bookings by status
        const counts: Record<BookingStatus, number> = {
          PENDING: 0,
          APPROVED: 0,
          REJECTED: 0,
          CANCELLED: 0,
        };
        for (const b of myBookings.data) {
          if (counts[b.status] !== undefined) {
            counts[b.status]++;
          }
        }
        setUserBookingCounts(counts);
      }
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to load dashboard metrics');
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const bookingCountsToDisplay = isAdmin
    ? adminStats?.bookingsByStatus || { PENDING: 0, APPROVED: 0, REJECTED: 0, CANCELLED: 0 }
    : userBookingCounts;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {isAdmin ? 'Operations Overview' : 'Service Dashboard'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time ticket triage telemetry, AI classification performance, and resource bookings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Link to="/tickets">
            <Button size="sm" className="gap-2">
              <Ticket className="h-4 w-4" />
              <span>Triage Queue</span>
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Failed to fetch live statistics</p>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
          <Button size="sm" variant="outline" onClick={fetchDashboardData}>
            Retry
          </Button>
        </div>
      )}

      {/* Top Level Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Tickets */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Total Tickets</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Ticket className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold tracking-tight">
              {isLoading ? '...' : ticketStats?.totalTickets ?? 0}
            </div>
            <Link
              to="/tickets"
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <span>View queue</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">Synchronized from external customer feeds</p>
        </div>

        {/* Reviewed Tickets */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Reviewed Tickets</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold tracking-tight text-emerald-600">
              {isLoading ? '...' : ticketStats?.reviewedCount ?? 0}
            </div>
            <span className="text-xs text-muted-foreground">
              {ticketStats?.totalTickets
                ? `${Math.round(((ticketStats?.reviewedCount || 0) / ticketStats.totalTickets) * 100)}% reviewed`
                : '0%'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Manually validated or triaged by agents</p>
        </div>

        {/* Model Agreement Rate */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Model Agreement</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <Brain className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold tracking-tight text-purple-600">
              {isLoading ? '...' : `${ticketStats?.modelAgreementRate ?? 100}%`}
            </div>
            <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
              AI Classifier
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">Predictions matching final category</p>
        </div>

        {/* Active Resources */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Active Resources</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold tracking-tight">
              {isLoading ? '...' : activeResourceCount}
            </div>
            <Link
              to="/resources"
              className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
            >
              <span>Book slot</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">Rooms, labs, and equipment available</p>
        </div>
      </div>

      {/* Booking Status Distribution */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-semibold">
              {isAdmin ? 'System Booking Volume by Status' : 'My Booking Overview'}
            </h2>
          </div>
          <Link
            to={isAdmin ? '/admin' : '/my-bookings'}
            className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
          >
            <span>{isAdmin ? 'Manage all bookings' : 'Manage my bookings'}</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as BookingStatus[]).map((st) => (
            <div
              key={st}
              className="rounded-lg border p-4 bg-muted/20 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground capitalize">{st.toLowerCase()}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${getBookingStatusBadgeClass(st)}`}>
                  {st}
                </span>
              </div>
              <div className="mt-3 text-2xl font-bold">
                {isLoading ? '...' : bookingCountsToDisplay[st] ?? 0}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ticket Telemetry Breakdown Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Category Breakdown */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-600" />
              <span>Category Distribution</span>
            </h3>
            <span className="text-[11px] text-muted-foreground">
              {ticketStats?.totalTickets ?? 0} Total
            </span>
          </div>

          <div className="space-y-3">
            {ticketStats?.byCategory &&
              Object.entries(ticketStats.byCategory).map(([cat, count]) => {
                const total = ticketStats.totalTickets || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-foreground">{cat.replace('_', ' ')}</span>
                      <span className="text-muted-foreground font-mono">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <span>Urgency Matrix</span>
            </h3>
            <span className="text-[11px] text-muted-foreground">By Priority</span>
          </div>

          <div className="space-y-3">
            {ticketStats?.byPriority &&
              Object.entries(ticketStats.byPriority).map(([pri, count]) => {
                const total = ticketStats.totalTickets || 1;
                const pct = Math.round((count / total) * 100);
                const colorMap: Record<string, string> = {
                  URGENT: 'bg-red-500',
                  HIGH: 'bg-orange-500',
                  MEDIUM: 'bg-blue-500',
                  LOW: 'bg-slate-400',
                };
                return (
                  <div key={pri} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-foreground">{pri}</span>
                      <span className="text-muted-foreground font-mono">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full ${colorMap[pri] || 'bg-slate-500'} rounded-full transition-all duration-300`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Lifecycle Status</span>
            </h3>
            <span className="text-[11px] text-muted-foreground">Resolution</span>
          </div>

          <div className="space-y-3">
            {ticketStats?.byStatus &&
              Object.entries(ticketStats.byStatus).map(([st, count]) => {
                const total = ticketStats.totalTickets || 1;
                const pct = Math.round((count / total) * 100);
                const colorMap: Record<string, string> = {
                  OPEN: 'bg-amber-500',
                  IN_PROGRESS: 'bg-blue-500',
                  RESOLVED: 'bg-emerald-500',
                  CLOSED: 'bg-slate-500',
                };
                return (
                  <div key={st} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-foreground">{st.replace('_', ' ')}</span>
                      <span className="text-muted-foreground font-mono">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full ${colorMap[st] || 'bg-slate-500'} rounded-full transition-all duration-300`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

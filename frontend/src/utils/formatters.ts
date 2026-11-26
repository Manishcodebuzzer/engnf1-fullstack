import { TicketCategory, TicketPriority, TicketStatus, BookingStatus, ResourceType } from '../types';

export function formatLocalDateTime(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatLocalDate(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatLocalTime(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return isoString;
  }
}

export function getCategoryBadgeClass(category: TicketCategory): string {
  switch (category) {
    case 'BILLING':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'BUG':
      return 'bg-rose-100 text-rose-700 border-rose-200';
    case 'FEATURE_REQUEST':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'LOGIN':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'DELIVERY':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export function getPriorityBadgeClass(priority: TicketPriority): string {
  switch (priority) {
    case 'URGENT':
      return 'bg-red-600 text-white border-transparent';
    case 'HIGH':
      return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'MEDIUM':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'LOW':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export function getStatusBadgeClass(status: TicketStatus): string {
  switch (status) {
    case 'OPEN':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'RESOLVED':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'CLOSED':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export function getBookingStatusBadgeClass(status: BookingStatus): string {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'APPROVED':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'REJECTED':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    case 'CANCELLED':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export function getResourceTypeBadgeClass(type: ResourceType): string {
  switch (type) {
    case 'ROOM':
      return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    case 'LAB':
      return 'bg-cyan-100 text-cyan-700 border-cyan-200';
    case 'EQUIPMENT':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

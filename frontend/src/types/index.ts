// Shared frontend TypeScript types and interfaces

export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'unknown';
  service?: string;
  timestamp?: string;
  uptime?: number;
  environment?: string;
}

export interface ApiResponse<T = unknown> {
  success?: boolean;
  message?: string;
  data?: T;
  user?: User;
  token?: string;
  error?: {
    code?: string;
    message: string;
  };
}

// ─── Ticket Types ─────────────────────────────────────────────────────────────

export type TicketCategory = 'BILLING' | 'BUG' | 'FEATURE_REQUEST' | 'LOGIN' | 'DELIVERY';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface TicketEvent {
  id: string;
  ticketId: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  actor: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  externalId: string;
  subject: string;
  body: string;
  autoCategory: TicketCategory;
  category: TicketCategory;
  isHumanOverride: boolean;
  priority: TicketPriority;
  status: TicketStatus;
  assigneeId: string | null;
  isReviewed: boolean;
  createdAt: string;
  updatedAt: string;
  assignee?: User | null;
  events?: TicketEvent[];
}

export interface TicketListResponse {
  data: Ticket[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface TicketListParams {
  status?: TicketStatus;
  category?: TicketCategory;
  priority?: TicketPriority;
  q?: string;
  page?: number;
  limit?: number;
}

export interface UpdateTicketData {
  category?: TicketCategory;
  priority?: TicketPriority;
  status?: TicketStatus;
  assigneeId?: string | null;
  isReviewed?: boolean;
}

export interface TicketStats {
  byCategory: Record<TicketCategory, number>;
  byPriority: Record<TicketPriority, number>;
  byStatus: Record<TicketStatus, number>;
  reviewedCount: number;
  totalTickets: number;
  modelAgreementRate: number;
}

export interface ImportTicketItem {
  externalId: string;
  subject: string;
  body: string;
}

export interface ImportTicketsResponse {
  importedCount: number;
  updatedCount: number;
  skippedOverrideCount: number;
  total: number;
}

// ─── Resource Types ───────────────────────────────────────────────────────────

export type ResourceType = 'ROOM' | 'LAB' | 'EQUIPMENT';

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  capacity: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface ResourceListResponse {
  data: Resource[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface BookingSlot {
  id: string;
  startTime: string;
  endTime: string;
  status: 'PENDING' | 'APPROVED';
}

export interface ResourceAvailability {
  resourceId: string;
  from: string;
  to: string;
  bookings: BookingSlot[];
}

export interface ResourceListParams {
  search?: string;
  type?: ResourceType;
  minCapacity?: number;
  page?: number;
  limit?: number;
}

export interface CreateResourceData {
  name: string;
  type: ResourceType;
  capacity: number;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateResourceData {
  name?: string;
  type?: ResourceType;
  capacity?: number;
  description?: string | null;
  isActive?: boolean;
}

// ─── Booking Types ────────────────────────────────────────────────────────────

export type BookingStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface Booking {
  id: string;
  resourceId: string;
  userId: string;
  ticketId: string | null;
  startTime: string;
  endTime: string;
  purpose: string;
  status: BookingStatus;
  decisionNote: string | null;
  createdAt: string;
  resource?: {
    id: string;
    name: string;
    type: ResourceType;
    capacity: number;
  };
  user?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
  ticket?: {
    id: string;
    externalId: string;
    subject: string;
    status: string;
  } | null;
}

export interface BookingListResponse {
  data: Booking[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CreateBookingData {
  resourceId: string;
  startTime: string;
  endTime: string;
  purpose: string;
  ticketId?: string | null;
}

export interface ListBookingsParams {
  status?: BookingStatus;
  resourceId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface MyBookingsParams {
  status?: BookingStatus;
  page?: number;
  limit?: number;
}

export interface AdminStats {
  activeResources: number;
  bookingsByStatus: Record<BookingStatus, number>;
  topResources: Array<{
    id: string;
    resourceId: string;
    name: string;
    type?: ResourceType;
    capacity?: number;
    bookingCount: number;
  }>;
  ticketStats: TicketStats;
}

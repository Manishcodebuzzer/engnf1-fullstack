import {
  HealthStatus,
  User,
  AuthResponse,
  ApiErrorResponse,
  Resource,
  ResourceListResponse,
  ResourceAvailability,
  ResourceListParams,
  CreateResourceData,
  UpdateResourceData,
  Booking,
  BookingListResponse,
  CreateBookingData,
  ListBookingsParams,
  MyBookingsParams,
  AdminStats,
  Ticket,
  TicketListResponse,
  TicketListParams,
  UpdateTicketData,
  TicketStats,
  ImportTicketItem,
  ImportTicketsResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

const getToken = (explicitToken?: string): string => {
  return explicitToken || localStorage.getItem('triagesync_token') || '';
};

/**
 * Parses and extracts API error messages formatted as { error: { code, message } }
 */
async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorBody = data as ApiErrorResponse;
    const message = errorBody?.error?.message || `Request failed with status ${res.status}`;
    const code = errorBody?.error?.code || 'REQUEST_FAILED';
    const err = new Error(message) as Error & { code?: string; status?: number };
    err.code = code;
    err.status = res.status;
    throw err;
  }
  return data as T;
}

export const apiClient = {
  // Health
  getHealth: async (): Promise<HealthStatus> => {
    const response = await fetch(`${API_BASE_URL}/health`);
    return handleResponse<HealthStatus>(response);
  },

  // Authentication
  auth: {
    register: async (name: string, email: string, password: string): Promise<AuthResponse> => {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      return handleResponse<AuthResponse>(response);
    },

    login: async (email: string, password: string): Promise<AuthResponse> => {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      return handleResponse<AuthResponse>(response);
    },

    getMe: async (token?: string): Promise<{ user: User }> => {
      const authToken = getToken(token);
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });
      return handleResponse<{ user: User }>(response);
    },
  },

  // Tickets
  tickets: {
    list: async (params: TicketListParams = {}, token?: string): Promise<TicketListResponse> => {
      const authToken = getToken(token);
      const query = new URLSearchParams();
      if (params.status) query.set('status', params.status);
      if (params.category) query.set('category', params.category);
      if (params.priority) query.set('priority', params.priority);
      if (params.q) query.set('q', params.q);
      if (params.page !== undefined) query.set('page', String(params.page));
      if (params.limit !== undefined) query.set('limit', String(params.limit));
      const qs = query.toString();
      const response = await fetch(`${API_BASE_URL}/tickets${qs ? `?${qs}` : ''}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      return handleResponse<TicketListResponse>(response);
    },

    getById: async (id: string, token?: string): Promise<Ticket> => {
      const authToken = getToken(token);
      const response = await fetch(`${API_BASE_URL}/tickets/${id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      return handleResponse<Ticket>(response);
    },

    update: async (
      id: string,
      data: UpdateTicketData,
      token?: string,
      agentHeader?: string
    ): Promise<Ticket> => {
      const authToken = getToken(token);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      };
      if (agentHeader) {
        headers['X-Agent'] = agentHeader;
      }
      const response = await fetch(`${API_BASE_URL}/tickets/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(data),
      });
      return handleResponse<Ticket>(response);
    },

    import: async (
      tickets: ImportTicketItem[],
      token?: string
    ): Promise<ImportTicketsResponse> => {
      const authToken = getToken(token);
      const response = await fetch(`${API_BASE_URL}/tickets/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ tickets }),
      });
      return handleResponse<ImportTicketsResponse>(response);
    },
  },

  // Stats
  stats: {
    get: async (token?: string): Promise<TicketStats> => {
      const authToken = getToken(token);
      const response = await fetch(`${API_BASE_URL}/stats`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      return handleResponse<TicketStats>(response);
    },
  },

  // Resources
  resources: {
    list: async (params: ResourceListParams = {}, token?: string): Promise<ResourceListResponse> => {
      const authToken = getToken(token);
      const query = new URLSearchParams();
      if (params.search) query.set('search', params.search);
      if (params.type) query.set('type', params.type);
      if (params.minCapacity !== undefined) query.set('minCapacity', String(params.minCapacity));
      if (params.page !== undefined) query.set('page', String(params.page));
      if (params.limit !== undefined) query.set('limit', String(params.limit));
      const qs = query.toString();
      const response = await fetch(`${API_BASE_URL}/resources${qs ? `?${qs}` : ''}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      return handleResponse<ResourceListResponse>(response);
    },

    getById: async (id: string, token?: string): Promise<Resource> => {
      const authToken = getToken(token);
      const response = await fetch(`${API_BASE_URL}/resources/${id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      return handleResponse<Resource>(response);
    },

    create: async (data: CreateResourceData, token?: string): Promise<Resource> => {
      const authToken = getToken(token);
      const response = await fetch(`${API_BASE_URL}/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(data),
      });
      return handleResponse<Resource>(response);
    },

    update: async (id: string, data: UpdateResourceData, token?: string): Promise<Resource> => {
      const authToken = getToken(token);
      const response = await fetch(`${API_BASE_URL}/resources/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(data),
      });
      return handleResponse<Resource>(response);
    },

    getAvailability: async (
      id: string,
      from: string,
      to: string,
      token?: string
    ): Promise<ResourceAvailability> => {
      const authToken = getToken(token);
      const query = new URLSearchParams({ from, to });
      const response = await fetch(`${API_BASE_URL}/resources/${id}/availability?${query}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      return handleResponse<ResourceAvailability>(response);
    },
  },

  // Bookings
  bookings: {
    create: async (data: CreateBookingData, token?: string): Promise<Booking> => {
      const authToken = getToken(token);
      const response = await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(data),
      });
      return handleResponse<Booking>(response);
    },

    mine: async (params: MyBookingsParams = {}, token?: string): Promise<BookingListResponse> => {
      const authToken = getToken(token);
      const query = new URLSearchParams();
      if (params.status) query.set('status', params.status);
      if (params.page !== undefined) query.set('page', String(params.page));
      if (params.limit !== undefined) query.set('limit', String(params.limit));
      const qs = query.toString();
      const response = await fetch(`${API_BASE_URL}/bookings/mine${qs ? `?${qs}` : ''}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      return handleResponse<BookingListResponse>(response);
    },

    list: async (params: ListBookingsParams = {}, token?: string): Promise<BookingListResponse> => {
      const authToken = getToken(token);
      const query = new URLSearchParams();
      if (params.status) query.set('status', params.status);
      if (params.resourceId) query.set('resourceId', params.resourceId);
      if (params.from) query.set('from', params.from);
      if (params.to) query.set('to', params.to);
      if (params.page !== undefined) query.set('page', String(params.page));
      if (params.limit !== undefined) query.set('limit', String(params.limit));
      const qs = query.toString();
      const response = await fetch(`${API_BASE_URL}/bookings${qs ? `?${qs}` : ''}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      return handleResponse<BookingListResponse>(response);
    },

    getById: async (id: string, token?: string): Promise<Booking> => {
      const authToken = getToken(token);
      const response = await fetch(`${API_BASE_URL}/bookings/${id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      return handleResponse<Booking>(response);
    },

    cancel: async (id: string, token?: string): Promise<Booking> => {
      const authToken = getToken(token);
      const response = await fetch(`${API_BASE_URL}/bookings/${id}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      return handleResponse<Booking>(response);
    },

    approve: async (id: string, token?: string): Promise<Booking> => {
      const authToken = getToken(token);
      const response = await fetch(`${API_BASE_URL}/bookings/${id}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      return handleResponse<Booking>(response);
    },

    reject: async (id: string, note: string, token?: string): Promise<Booking> => {
      const authToken = getToken(token);
      const response = await fetch(`${API_BASE_URL}/bookings/${id}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ note }),
      });
      return handleResponse<Booking>(response);
    },
  },

  // Admin
  admin: {
    getStats: async (token?: string): Promise<AdminStats> => {
      const authToken = getToken(token);
      const response = await fetch(`${API_BASE_URL}/admin/stats`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      return handleResponse<AdminStats>(response);
    },
  },
};

export default apiClient;

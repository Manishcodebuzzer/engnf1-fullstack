import { z } from 'zod';
import { BookingStatus } from '@prisma/client';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true when the string explicitly specifies UTC timezone (ends in Z or +00:00).
 */
function isUtcTimestampString(s: string): boolean {
  return /Z$|[+-]00(?::?00)?$/i.test(s);
}

/**
 * Returns true when the Date is exactly on a 30-minute UTC grid:
 * minute ∈ {0, 30}, seconds = 0, milliseconds = 0.
 */
function isOnHalfHourGrid(d: Date): boolean {
  return (
    (d.getUTCMinutes() === 0 || d.getUTCMinutes() === 30) &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0
  );
}

// 30 days in ms
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
// Duration bounds in ms (30 min to 240 min)
const MIN_DURATION_MS = 30 * 60 * 1000;
const MAX_DURATION_MS = 240 * 60 * 1000;

// ─── Create Booking Schema ────────────────────────────────────────────────────
export const createBookingSchema = z
  .object({
    resourceId: z
      .string({ required_error: 'resourceId is required' })
      .min(1, 'resourceId cannot be empty'),
    startTime: z
      .string({ required_error: 'startTime is required' })
      .datetime({ offset: true, message: 'startTime must be a valid ISO 8601 UTC timestamp' }),
    endTime: z
      .string({ required_error: 'endTime is required' })
      .datetime({ offset: true, message: 'endTime must be a valid ISO 8601 UTC timestamp' }),
    purpose: z
      .string({ required_error: 'purpose is required' })
      .trim()
      .min(5, 'purpose must be between 5 and 200 characters')
      .max(200, 'purpose must be between 5 and 200 characters'),
    ticketId: z.string().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    // 1. Must be UTC representation
    if (!isUtcTimestampString(data.startTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['startTime'],
        message: 'startTime must be a valid ISO 8601 UTC timestamp ending with Z or +00:00',
      });
    }

    if (!isUtcTimestampString(data.endTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: 'endTime must be a valid ISO 8601 UTC timestamp ending with Z or +00:00',
      });
    }

    const start = new Date(data.startTime);
    const end = new Date(data.endTime);
    const now = new Date();

    // 2. Grid alignment (minute 00 or 30, seconds = 0, ms = 0)
    if (!isOnHalfHourGrid(start)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['startTime'],
        message: 'startTime must fall exactly on a 30-minute UTC grid (minute 00 or 30, seconds and ms 0)',
      });
    }

    if (!isOnHalfHourGrid(end)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: 'endTime must fall exactly on a 30-minute UTC grid (minute 00 or 30, seconds and ms 0)',
      });
    }

    // 3. start must be in the future
    if (start.getTime() <= now.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['startTime'],
        message: 'startTime must be in the future',
      });
    }

    // 4. start must be no more than 30 days ahead
    if (start.getTime() - now.getTime() > THIRTY_DAYS_MS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['startTime'],
        message: 'startTime cannot be more than 30 days in advance',
      });
    }

    // 5. end must be after start
    if (end.getTime() <= start.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: 'endTime must be strictly after startTime',
      });
      return;
    }

    // 6. Duration bounds: between 30 and 240 minutes inclusive
    const durationMs = end.getTime() - start.getTime();
    if (durationMs < MIN_DURATION_MS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: 'Booking duration must be at least 30 minutes',
      });
    }
    if (durationMs > MAX_DURATION_MS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: 'Booking duration cannot exceed 240 minutes (4 hours)',
      });
    }
  });

// ─── Reject Schema (note required: 5–200 characters) ─────────────────────────
export const rejectBookingSchema = z.object({
  note: z
    .string({ required_error: 'note is required' })
    .trim()
    .min(5, 'note must be between 5 and 200 characters')
    .max(200, 'note must be between 5 and 200 characters'),
});

// ─── List Bookings Query (ADMIN) ──────────────────────────────────────────────
export const listBookingsQuerySchema = z.object({
  status: z.nativeEnum(BookingStatus, {
    errorMap: () => ({ message: 'status must be PENDING, APPROVED, REJECTED, or CANCELLED' }),
  }).optional(),
  resourceId: z.string().optional(),
  from: z.string().datetime({ offset: true, message: 'from must be a valid ISO timestamp' }).optional(),
  to: z.string().datetime({ offset: true, message: 'to must be a valid ISO timestamp' }).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// ─── My Bookings Query (USER/ADMIN) ───────────────────────────────────────────
export const myBookingsQuerySchema = z.object({
  status: z.nativeEnum(BookingStatus, {
    errorMap: () => ({ message: 'status must be PENDING, APPROVED, REJECTED, or CANCELLED' }),
  }).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type RejectBookingInput = z.infer<typeof rejectBookingSchema>;
export type ListBookingsQueryInput = z.infer<typeof listBookingsQuerySchema>;
export type MyBookingsQueryInput = z.infer<typeof myBookingsQuerySchema>;

import { z } from 'zod';
import { TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';

export const importTicketItemSchema = z.object({
  externalId: z.string({ required_error: 'externalId is required' }).trim().min(1, 'externalId cannot be empty'),
  subject: z.string({ required_error: 'subject is required' }).trim().min(1, 'subject cannot be empty'),
  body: z.string({ required_error: 'body is required' }).trim().min(1, 'body cannot be empty'),
});

export const importTicketsSchema = z.object({
  tickets: z
    .array(importTicketItemSchema, { required_error: 'tickets array is required' })
    .min(1, 'At least one ticket must be provided in the import array'),
});

export const getTicketsQuerySchema = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
  category: z.nativeEnum(TicketCategory).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const updateTicketSchema = z
  .object({
    category: z.nativeEnum(TicketCategory).optional(),
    priority: z.nativeEnum(TicketPriority).optional(),
    status: z.nativeEnum(TicketStatus).optional(),
    assigneeId: z.string().nullable().optional(),
  })
  .refine(
    (data) =>
      data.category !== undefined ||
      data.priority !== undefined ||
      data.status !== undefined ||
      data.assigneeId !== undefined,
    {
      message: 'At least one field (category, priority, status, or assigneeId) must be provided for update',
    }
  );

export type ImportTicketsInput = z.infer<typeof importTicketsSchema>;
export type GetTicketsQueryInput = z.infer<typeof getTicketsQuerySchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;

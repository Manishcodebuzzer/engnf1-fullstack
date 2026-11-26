import { z } from 'zod';
import { ResourceType } from '@prisma/client';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const listResourcesQuerySchema = z.object({
  search: z.string().optional(),
  type: z.nativeEnum(ResourceType, { errorMap: () => ({ message: 'type must be ROOM, LAB, or EQUIPMENT' }) }).optional(),
  minCapacity: z.coerce.number().int().min(1, 'minCapacity must be at least 1').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const createResourceSchema = z.object({
  name: z
    .string({ required_error: 'Resource name is required' })
    .trim()
    .min(3, 'Name must be between 3 and 60 characters')
    .max(60, 'Name must be between 3 and 60 characters'),
  type: z.nativeEnum(ResourceType, {
    errorMap: (issue, ctx) => {
      if (issue.code === 'invalid_type' && ctx.data === undefined) {
        return { message: 'Resource type is required (ROOM, LAB, or EQUIPMENT)' };
      }
      return { message: 'type must be ROOM, LAB, or EQUIPMENT' };
    },
  }),
  capacity: z
    .number()
    .int('Capacity must be an integer')
    .min(1, 'Capacity must be between 1 and 500')
    .max(500, 'Capacity must be between 1 and 500'),
  description: z
    .string()
    .trim()
    .max(300, 'Description cannot exceed 300 characters')
    .nullable()
    .optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateResourceSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, 'Name must be between 3 and 60 characters')
      .max(60, 'Name must be between 3 and 60 characters')
      .optional(),
    type: z
      .nativeEnum(ResourceType, { errorMap: () => ({ message: 'type must be ROOM, LAB, or EQUIPMENT' }) })
      .optional(),
    capacity: z
      .number()
      .int('Capacity must be an integer')
      .min(1, 'Capacity must be between 1 and 500')
      .max(500, 'Capacity must be between 1 and 500')
      .optional(),
    description: z
      .string()
      .trim()
      .max(300, 'Description cannot exceed 300 characters')
      .nullable()
      .optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.type !== undefined ||
      data.capacity !== undefined ||
      data.description !== undefined ||
      data.isActive !== undefined,
    {
      message: 'At least one field must be provided for update',
    }
  );

export const getAvailabilityQuerySchema = z
  .object({
    from: z
      .string({ required_error: 'from timestamp is required' })
      .datetime({ offset: true, message: 'from must be a valid ISO UTC timestamp' }),
    to: z
      .string({ required_error: 'to timestamp is required' })
      .datetime({ offset: true, message: 'to must be a valid ISO UTC timestamp' }),
  })
  .refine(
    (data) => {
      const fromDate = new Date(data.from);
      const toDate = new Date(data.to);
      return fromDate.getTime() < toDate.getTime();
    },
    {
      message: 'from timestamp must be strictly before to timestamp',
      path: ['from'],
    }
  )
  .refine(
    (data) => {
      const fromDate = new Date(data.from);
      const toDate = new Date(data.to);
      return toDate.getTime() - fromDate.getTime() <= SEVEN_DAYS_MS;
    },
    {
      message: 'Maximum requested availability range is 7 days',
      path: ['to'],
    }
  );

export type ListResourcesQueryInput = z.infer<typeof listResourcesQuerySchema>;
export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
export type GetAvailabilityQueryInput = z.infer<typeof getAvailabilityQuerySchema>;

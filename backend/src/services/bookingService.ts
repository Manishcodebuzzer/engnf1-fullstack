import { Prisma, BookingStatus, Role } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import {
  CreateBookingInput,
  ListBookingsQueryInput,
  MyBookingsQueryInput,
} from '../validators/bookingValidators.js';
import { NotFoundError, ConflictError, ForbiddenError } from '../utils/AppError.js';

export class BookingService {
  /**
   * Creates a booking with atomic PostgreSQL row-level locks, overlap prevention,
   * and user active future booking limit (max 3).
   */
  async createBooking(input: CreateBookingInput, userId: string) {
    const start = new Date(input.startTime);
    const end = new Date(input.endTime);

    return await prisma.$transaction(
      async (tx) => {
        // 1. If ticketId supplied, check referenced ticket exists
        if (input.ticketId) {
          const ticket = await tx.ticket.findUnique({
            where: { id: input.ticketId },
            select: { id: true },
          });
          if (!ticket) {
            throw new NotFoundError(`Referenced ticket '${input.ticketId}' not found`);
          }
        }

        // 2. Lock User row for user-level concurrency serialization
        const userLock = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE
        `;
        if (userLock.length === 0) {
          throw new NotFoundError(`User '${userId}' not found`);
        }

        // 3. Lock Resource row for resource-level concurrency serialization
        const resourceLock = await tx.$queryRaw<Array<{ id: string; isActive: boolean }>>`
          SELECT id, "isActive" FROM "Resource" WHERE id = ${input.resourceId} FOR UPDATE
        `;
        if (resourceLock.length === 0) {
          throw new NotFoundError(`Resource '${input.resourceId}' not found`);
        }
        if (!resourceLock[0].isActive) {
          throw new NotFoundError(`Resource '${input.resourceId}' is inactive`);
        }

        // 4. Enforce user limit: maximum 3 future PENDING or APPROVED bookings
        const now = new Date();
        const futureActiveCount = await tx.booking.count({
          where: {
            userId,
            status: { in: [BookingStatus.PENDING, BookingStatus.APPROVED] },
            startTime: { gte: now },
          },
        });
        if (futureActiveCount >= 3) {
          throw new ConflictError(
            'User has reached the maximum limit of 3 future active bookings'
          );
        }

        // 5. Enforce overlap prevention: newStart < existingEnd AND newEnd > existingStart
        // Only PENDING and APPROVED bookings block a slot.
        const overlapping = await tx.booking.findFirst({
          where: {
            resourceId: input.resourceId,
            status: { in: [BookingStatus.PENDING, BookingStatus.APPROVED] },
            startTime: { lt: end },
            endTime: { gt: start },
          },
        });
        if (overlapping) {
          throw new ConflictError(
            'The requested time slot overlaps with an existing booking for this resource'
          );
        }

        // 6. Create booking with PENDING status
        return await tx.booking.create({
          data: {
            resourceId: input.resourceId,
            userId,
            ticketId: input.ticketId || null,
            startTime: start,
            endTime: end,
            purpose: input.purpose.trim(),
            status: BookingStatus.PENDING,
          },
          include: {
            resource: {
              select: {
                id: true,
                name: true,
                type: true,
                capacity: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
            ticket: {
              select: {
                id: true,
                externalId: true,
                subject: true,
                status: true,
              },
            },
          },
        });
      },
      {
        maxWait: 10000,
        timeout: 10000,
      }
    );
  }

  /**
   * Retrieves authenticated user's bookings (newest first, paginated 10 per page)
   */
  async getMyBookings(userId: string, query: MyBookingsQueryInput) {
    const page = Math.max(1, query.page || 1);
    const pageSize = 10;
    const skip = (page - 1) * pageSize;

    const where: Prisma.BookingWhereInput = {
      userId,
    };

    if (query.status) {
      where.status = query.status;
    }

    const [total, data] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          resource: {
            select: {
              id: true,
              name: true,
              type: true,
              capacity: true,
            },
          },
          ticket: {
            select: {
              id: true,
              externalId: true,
              subject: true,
              status: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      data,
      page,
      pageSize,
      total,
      totalPages,
    };
  }

  /**
   * Retrieves single booking by ID with ownership/admin access control
   */
  async getBookingById(id: string, user: { id: string; role: Role }) {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        resource: {
          select: {
            id: true,
            name: true,
            type: true,
            capacity: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        ticket: {
          select: {
            id: true,
            externalId: true,
            subject: true,
            status: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundError(`Booking '${id}' not found`);
    }

    // USER can view only their own booking. ADMIN can view any booking.
    if (user.role !== Role.ADMIN && booking.userId !== user.id) {
      throw new ForbiddenError('Access denied: you do not have permission to view this booking');
    }

    return booking;
  }

  /**
   * Lists bookings for ADMIN with composite AND filters and overlap logic for date ranges
   */
  async listBookings(query: ListBookingsQueryInput) {
    const page = Math.max(1, query.page || 1);
    const pageSize = 10;
    const skip = (page - 1) * pageSize;

    const where: Prisma.BookingWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.resourceId) {
      where.resourceId = query.resourceId;
    }

    // Overlap logic: booking.startTime < to AND booking.endTime > from
    if (query.from && query.to) {
      where.startTime = { lt: new Date(query.to) };
      where.endTime = { gt: new Date(query.from) };
    } else if (query.from) {
      where.endTime = { gt: new Date(query.from) };
    } else if (query.to) {
      where.startTime = { lt: new Date(query.to) };
    }

    const [total, data] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          resource: {
            select: {
              id: true,
              name: true,
              type: true,
              capacity: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          ticket: {
            select: {
              id: true,
              externalId: true,
              subject: true,
              status: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      data,
      page,
      pageSize,
      total,
      totalPages,
    };
  }

  /**
   * Cancels a booking (owner-only, PENDING or APPROVED, future start time)
   */
  async cancelBooking(id: string, userId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundError(`Booking '${id}' not found`);
    }

    // Only the booking owner can cancel.
    // ADMIN must not cancel another user's booking through this endpoint unless they are the owner.
    if (booking.userId !== userId) {
      throw new ForbiddenError('You can only cancel your own bookings');
    }

    // Allowed from PENDING or APPROVED
    if (
      booking.status !== BookingStatus.PENDING &&
      booking.status !== BookingStatus.APPROVED
    ) {
      throw new ConflictError(
        `Cannot cancel a booking with status '${booking.status}'`
      );
    }

    // Booking start time must still be in the future
    if (booking.startTime <= new Date()) {
      throw new ConflictError(
        'Cannot cancel a booking that has already started or is in the past'
      );
    }

    return await prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
      include: {
        resource: {
          select: { id: true, name: true, type: true, capacity: true },
        },
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
        ticket: {
          select: { id: true, externalId: true, subject: true, status: true },
        },
      },
    });
  }

  /**
   * Approves a PENDING booking (ADMIN only, future start time)
   */
  async approveBooking(id: string) {
    const booking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundError(`Booking '${id}' not found`);
    }

    // Only PENDING bookings can be approved
    if (booking.status !== BookingStatus.PENDING) {
      throw new ConflictError(
        `Cannot approve a booking with status '${booking.status}'`
      );
    }

    // Start time must still be in the future
    if (booking.startTime <= new Date()) {
      throw new ConflictError(
        'Cannot approve a booking that has already started or is in the past'
      );
    }

    return await prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.APPROVED },
      include: {
        resource: {
          select: { id: true, name: true, type: true, capacity: true },
        },
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
        ticket: {
          select: { id: true, externalId: true, subject: true, status: true },
        },
      },
    });
  }

  /**
   * Rejects a PENDING booking with decision note (ADMIN only, future start time)
   */
  async rejectBooking(id: string, note: string) {
    const booking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundError(`Booking '${id}' not found`);
    }

    // Only PENDING bookings can be rejected
    if (booking.status !== BookingStatus.PENDING) {
      throw new ConflictError(
        `Cannot reject a booking with status '${booking.status}'`
      );
    }

    // Start time must still be in the future
    if (booking.startTime <= new Date()) {
      throw new ConflictError(
        'Cannot reject a booking that has already started or is in the past'
      );
    }

    return await prisma.booking.update({
      where: { id },
      data: {
        status: BookingStatus.REJECTED,
        decisionNote: note.trim(),
      },
      include: {
        resource: {
          select: { id: true, name: true, type: true, capacity: true },
        },
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
        ticket: {
          select: { id: true, externalId: true, subject: true, status: true },
        },
      },
    });
  }
}

export const bookingService = new BookingService();

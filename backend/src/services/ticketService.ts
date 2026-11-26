import { Prisma, TicketCategory, TicketPriority, TicketStatus, TicketEventField } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import { classifyTicket } from './classificationService.js';
import { ImportTicketsInput, GetTicketsQueryInput, UpdateTicketInput } from '../validators/ticketValidators.js';
import { NotFoundError, BadRequestError } from '../utils/AppError.js';

export class TicketService {
  /**
   * Imports or updates tickets with automatic classification and human-override preservation
   */
  async importTickets(input: ImportTicketsInput) {
    let importedCount = 0;
    let updatedCount = 0;
    let skippedOverrideCount = 0;

    for (const item of input.tickets) {
      const existing = await prisma.ticket.findUnique({
        where: { externalId: item.externalId },
      });

      if (!existing) {
        // Classify new ticket
        const classification = classifyTicket(item.subject, item.body);

        await prisma.ticket.create({
          data: {
            externalId: item.externalId,
            subject: item.subject,
            body: item.body,
            autoCategory: classification.category,
            category: classification.category,
            isHumanOverride: false,
            priority: classification.priority,
            status: TicketStatus.OPEN,
            isReviewed: false,
          },
        });
        importedCount++;
      } else {
        // Existing ticket: check human override
        if (existing.isHumanOverride) {
          // Preserve manual category override; update subject and body
          await prisma.ticket.update({
            where: { id: existing.id },
            data: {
              subject: item.subject,
              body: item.body,
            },
          });
          skippedOverrideCount++;
          updatedCount++;
        } else {
          // Re-run auto-classification since no human override has occurred
          const classification = classifyTicket(item.subject, item.body);

          await prisma.ticket.update({
            where: { id: existing.id },
            data: {
              subject: item.subject,
              body: item.body,
              autoCategory: classification.category,
              category: classification.category,
              priority: classification.priority,
            },
          });
          updatedCount++;
        }
      }
    }

    return {
      importedCount,
      updatedCount,
      skippedOverrideCount,
      total: input.tickets.length,
    };
  }

  /**
   * Retrieves paginated tickets with composite AND filters and injection-safe search
   */
  async getTickets(query: GetTicketsQueryInput) {
    const page = Math.max(1, parseInt(String(query.page || 1), 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(String(query.limit || 10), 10)));
    const skip = (page - 1) * pageSize;

    const where: Prisma.TicketWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.category) {
      where.category = query.category;
    }
    if (query.priority) {
      where.priority = query.priority;
    }
    if (query.q && query.q.trim().length > 0) {
      const searchTerm = query.q.trim();
      where.OR = [
        { subject: { contains: searchTerm, mode: 'insensitive' } },
        { body: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
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
   * Retrieves ticket details including audit events and assigned user
   */
  async getTicketById(id: string) {
    const ticket = await prisma.ticket.findFirst({
      where: {
        OR: [{ id }, { externalId: id }],
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        events: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundError(`Ticket '${id}' not found`);
    }

    return ticket;
  }

  /**
   * Updates ticket fields and records audit events within a single database transaction
   */
  async updateTicket(id: string, input: UpdateTicketInput, actor: string) {
    const ticket = await prisma.ticket.findFirst({
      where: {
        OR: [{ id }, { externalId: id }],
      },
    });

    if (!ticket) {
      throw new NotFoundError(`Ticket '${id}' not found`);
    }

    // Verify assignee exists if assigneeId is being set
    if (input.assigneeId) {
      const assigneeUser = await prisma.user.findUnique({
        where: { id: input.assigneeId },
      });
      if (!assigneeUser) {
        throw new BadRequestError(`Assignee user with ID '${input.assigneeId}' does not exist.`);
      }
    }

    // Collect changed fields and audit events
    const eventsToCreate: {
      field: TicketEventField;
      oldValue: string | null;
      newValue: string | null;
      actor: string;
    }[] = [];

    let isCategoryChanged = false;
    let isStatusTransitionedFromOpen = false;

    if (input.category !== undefined && input.category !== ticket.category) {
      isCategoryChanged = true;
      eventsToCreate.push({
        field: TicketEventField.category,
        oldValue: ticket.category,
        newValue: input.category,
        actor,
      });
    }

    if (input.priority !== undefined && input.priority !== ticket.priority) {
      eventsToCreate.push({
        field: TicketEventField.priority,
        oldValue: ticket.priority,
        newValue: input.priority,
        actor,
      });
    }

    if (input.status !== undefined && input.status !== ticket.status) {
      if (ticket.status === TicketStatus.OPEN && input.status !== TicketStatus.OPEN) {
        isStatusTransitionedFromOpen = true;
      }
      eventsToCreate.push({
        field: TicketEventField.status,
        oldValue: ticket.status,
        newValue: input.status,
        actor,
      });
    }

    if (input.assigneeId !== undefined && input.assigneeId !== ticket.assigneeId) {
      eventsToCreate.push({
        field: TicketEventField.assigneeId,
        oldValue: ticket.assigneeId,
        newValue: input.assigneeId,
        actor,
      });
    }

    // Rule: Set isHumanOverride = true when category changes
    const isHumanOverride = isCategoryChanged ? true : ticket.isHumanOverride;

    // Rule: Set isReviewed = true when category changes or status transitions from OPEN
    const isReviewed = isCategoryChanged || isStatusTransitionedFromOpen ? true : ticket.isReviewed;

    // Execute update and audit events atomically in a transaction
    return await prisma.$transaction(async (tx) => {
      if (eventsToCreate.length > 0) {
        await tx.ticketEvent.createMany({
          data: eventsToCreate.map((event) => ({
            ticketId: ticket.id,
            field: event.field,
            oldValue: event.oldValue,
            newValue: event.newValue,
            actor: event.actor,
          })),
        });
      }

      const updated = await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          ...(input.category !== undefined && { category: input.category }),
          ...(input.priority !== undefined && { priority: input.priority }),
          ...(input.status !== undefined && { status: input.status }),
          ...(input.assigneeId !== undefined && { assigneeId: input.assigneeId }),
          isHumanOverride,
          isReviewed,
        },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          events: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      return updated;
    });
  }

  /**
   * Computes aggregate ticket metrics including category, priority, status breakdowns, and model agreement rate
   */
  async getTicketStats() {
    const [allTickets, reviewedCount, totalTickets] = await Promise.all([
      prisma.ticket.findMany({
        select: {
          category: true,
          priority: true,
          status: true,
          autoCategory: true,
        },
      }),
      prisma.ticket.count({ where: { isReviewed: true } }),
      prisma.ticket.count(),
    ]);

    const byCategory: Record<TicketCategory, number> = {
      [TicketCategory.BILLING]: 0,
      [TicketCategory.BUG]: 0,
      [TicketCategory.FEATURE_REQUEST]: 0,
      [TicketCategory.LOGIN]: 0,
      [TicketCategory.DELIVERY]: 0,
    };

    const byPriority: Record<TicketPriority, number> = {
      [TicketPriority.LOW]: 0,
      [TicketPriority.MEDIUM]: 0,
      [TicketPriority.HIGH]: 0,
      [TicketPriority.URGENT]: 0,
    };

    const byStatus: Record<TicketStatus, number> = {
      [TicketStatus.OPEN]: 0,
      [TicketStatus.IN_PROGRESS]: 0,
      [TicketStatus.RESOLVED]: 0,
      [TicketStatus.CLOSED]: 0,
    };

    let agreementCount = 0;

    for (const ticket of allTickets) {
      if (byCategory[ticket.category] !== undefined) {
        byCategory[ticket.category]++;
      }
      if (byPriority[ticket.priority] !== undefined) {
        byPriority[ticket.priority]++;
      }
      if (byStatus[ticket.status] !== undefined) {
        byStatus[ticket.status]++;
      }
      if (ticket.category === ticket.autoCategory) {
        agreementCount++;
      }
    }

    const modelAgreementRate =
      totalTickets === 0 ? 100 : Math.round((agreementCount / totalTickets) * 10000) / 100;

    return {
      byCategory,
      byPriority,
      byStatus,
      reviewedCount,
      totalTickets,
      modelAgreementRate,
    };
  }
}

export const ticketService = new TicketService();

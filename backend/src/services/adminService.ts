import { BookingStatus } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import { ticketService } from './ticketService.js';

export class AdminService {
  /**
   * Retrieves aggregated administration metrics:
   * - activeResources count
   * - bookingsByStatus (all 4 statuses guaranteed)
   * - topResources (top 3 resources by booking count)
   * - ticketStats (reused from ticketService)
   */
  async getAdminStats() {
    // 1. Count of active resources
    const activeResources = await prisma.resource.count({
      where: { isActive: true },
    });

    // 2. Bookings count by status ensuring all 4 keys are present
    const statusCounts = await prisma.booking.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const bookingsByStatus: Record<BookingStatus, number> = {
      [BookingStatus.PENDING]: 0,
      [BookingStatus.APPROVED]: 0,
      [BookingStatus.REJECTED]: 0,
      [BookingStatus.CANCELLED]: 0,
    };

    for (const item of statusCounts) {
      bookingsByStatus[item.status] = item._count.id;
    }

    // 3. Top 3 resources by booking count
    const topResourceGroups = await prisma.booking.groupBy({
      by: ['resourceId'],
      _count: { id: true },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 3,
    });

    const resourceIds = topResourceGroups.map((g) => g.resourceId);
    const resources = await prisma.resource.findMany({
      where: { id: { in: resourceIds } },
    });

    const resourceMap = new Map(resources.map((r) => [r.id, r]));

    const topResources = topResourceGroups.map((g) => {
      const res = resourceMap.get(g.resourceId);
      return {
        id: g.resourceId,
        resourceId: g.resourceId,
        name: res?.name ?? 'Unknown',
        type: res?.type,
        capacity: res?.capacity,
        bookingCount: g._count.id,
      };
    });

    // 4. Reuse ticket triage statistics
    const ticketStats = await ticketService.getTicketStats();

    return {
      activeResources,
      bookingsByStatus,
      topResources,
      ticketStats,
    };
  }
}

export const adminService = new AdminService();

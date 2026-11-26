import { Prisma, Role, BookingStatus } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import {
  ListResourcesQueryInput,
  CreateResourceInput,
  UpdateResourceInput,
} from '../validators/resourceValidators.js';
import { NotFoundError, ConflictError } from '../utils/AppError.js';

export class ResourceService {
  /**
   * Retrieves paginated resources with composite AND filters and role-based visibility
   */
  async listResources(query: ListResourcesQueryInput, userRole?: Role) {
    const page = Math.max(1, parseInt(String(query.page || 1), 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(String(query.limit || 10), 10)));
    const skip = (page - 1) * pageSize;

    const where: Prisma.ResourceWhereInput = {};

    // 1. Role-based visibility: Non-admins ONLY see active resources
    if (userRole !== Role.ADMIN) {
      where.isActive = true;
    }

    // 2. Search query by resource name
    if (query.search && query.search.trim().length > 0) {
      where.name = {
        contains: query.search.trim(),
        mode: 'insensitive',
      };
    }

    // 3. Filter by ResourceType (ROOM | LAB | EQUIPMENT)
    if (query.type) {
      where.type = query.type;
    }

    // 4. Minimum capacity filter
    if (query.minCapacity !== undefined) {
      where.capacity = {
        gte: Number(query.minCapacity),
      };
    }

    const [total, data] = await Promise.all([
      prisma.resource.count({ where }),
      prisma.resource.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { name: 'asc' }, // Requirement: sort by name ascending
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
   * Retrieves single resource details with active/inactive role gate
   */
  async getResourceById(id: string, userRole?: Role) {
    const resource = await prisma.resource.findUnique({
      where: { id },
    });

    if (!resource) {
      throw new NotFoundError(`Resource '${id}' not found`);
    }

    // USER requesting an inactive resource must receive 404
    if (!resource.isActive && userRole !== Role.ADMIN) {
      throw new NotFoundError(`Resource '${id}' not found`);
    }

    return resource;
  }

  /**
   * Creates a new resource with case-insensitive unique name enforcement (Admin only)
   */
  async createResource(input: CreateResourceInput) {
    const normalizedName = input.name.trim().toLowerCase();

    // Check case-insensitive uniqueness
    const existing = await prisma.resource.findFirst({
      where: {
        name: {
          equals: normalizedName,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      throw new ConflictError(`Resource with name '${input.name.trim()}' already exists.`);
    }

    return await prisma.resource.create({
      data: {
        name: input.name.trim(),
        type: input.type,
        capacity: input.capacity,
        description: input.description?.trim() || null,
        isActive: input.isActive ?? true,
      },
    });
  }

  /**
   * Updates resource fields with case-insensitive duplicate check (Admin only)
   */
  async updateResource(id: string, input: UpdateResourceInput) {
    const resource = await prisma.resource.findUnique({
      where: { id },
    });

    if (!resource) {
      throw new NotFoundError(`Resource '${id}' not found`);
    }

    // If name is being changed, verify case-insensitive uniqueness
    if (input.name && input.name.trim().toLowerCase() !== resource.name.toLowerCase()) {
      const normalizedName = input.name.trim().toLowerCase();
      const existing = await prisma.resource.findFirst({
        where: {
          id: { not: id },
          name: {
            equals: normalizedName,
            mode: 'insensitive',
          },
        },
      });

      if (existing) {
        throw new ConflictError(`Resource with name '${input.name.trim()}' already exists.`);
      }
    }

    return await prisma.resource.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.capacity !== undefined && { capacity: input.capacity }),
        ...(input.description !== undefined && { description: input.description?.trim() || null }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });
  }

  /**
   * Retrieves resource availability slots exposing ONLY privacy-safe fields (startTime, endTime, status)
   */
  async getResourceAvailability(id: string, fromStr: string, toStr: string, userRole?: Role) {
    const resource = await prisma.resource.findUnique({
      where: { id },
    });

    if (!resource) {
      throw new NotFoundError(`Resource '${id}' not found`);
    }

    // Inactive resource returns 404 for non-admins
    if (!resource.isActive && userRole !== Role.ADMIN) {
      throw new NotFoundError(`Resource '${id}' not found`);
    }

    const fromDate = new Date(fromStr);
    const toDate = new Date(toStr);

    // Query overlapping bookings: startTime < to AND endTime > from
    // Filter strictly to PENDING and APPROVED states
    const bookings = await prisma.booking.findMany({
      where: {
        resourceId: id,
        status: {
          in: [BookingStatus.PENDING, BookingStatus.APPROVED],
        },
        startTime: {
          lt: toDate,
        },
        endTime: {
          gt: fromDate,
        },
      },
      orderBy: {
        startTime: 'asc',
      },
      // Privacy requirement: Expose only startTime, endTime, and status
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
      },
    });

    return {
      resourceId: id,
      from: fromStr,
      to: toStr,
      bookings,
    };
  }
}

export const resourceService = new ResourceService();

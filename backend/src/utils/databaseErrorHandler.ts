import { Prisma } from '@prisma/client';
import { AppError, BadRequestError, ConflictError, NotFoundError } from './AppError.js';

/**
 * Maps known Prisma ORM error codes to standard application errors (AppError)
 */
export const handlePrismaError = (error: unknown): AppError => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': {
        // Unique constraint violation
        const target = (error.meta?.target as string[])?.join(', ') || 'field';
        return new ConflictError(`A record with this ${target} already exists.`);
      }
      case 'P2025': {
        // Record not found
        const cause = (error.meta?.cause as string) || 'Record not found';
        return new NotFoundError(cause);
      }
      case 'P2003': {
        // Foreign key constraint failure
        const field = (error.meta?.field_name as string) || 'relation';
        return new BadRequestError(`Invalid reference: foreign key constraint failed on ${field}.`);
      }
      case 'P2014': {
        // Required relation violation
        return new BadRequestError('The requested change would violate a required relational constraint.');
      }
      case 'P2021': {
        // Table does not exist
        const table = (error.meta?.table as string) || 'database table';
        return new AppError(`Database table ${table} does not exist. Please run migrations.`, 500);
      }
      default:
        return new AppError(`Database error [${error.code}]: ${error.message}`, 500);
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new BadRequestError(`Validation error: ${error.message}`);
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return new AppError(`Database initialization error: ${error.message}`, 503);
  }

  if (error instanceof AppError) {
    return error;
  }

  return new AppError(error instanceof Error ? error.message : 'Unknown database error', 500);
};

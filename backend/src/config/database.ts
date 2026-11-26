import { prisma } from '../prisma/client.js';

/**
 * Verifies that the application can successfully connect to the PostgreSQL database.
 * Returns true if successful, throws an error if connection fails.
 */
export const verifyDatabaseConnection = async (): Promise<boolean> => {
  try {
    // Execute a lightweight raw query to test PostgreSQL connectivity
    await prisma.$queryRaw`SELECT 1 as connected`;
    console.log('[TriageSync Database] PostgreSQL connection successfully established.');
    return true;
  } catch (error) {
    console.error('[TriageSync Database] PostgreSQL connection failed:', error);
    throw error;
  }
};

/**
 * Disconnects the Prisma client gracefully
 */
export const disconnectDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
  console.log('[TriageSync Database] Prisma client disconnected.');
};

export { prisma };
export default prisma;

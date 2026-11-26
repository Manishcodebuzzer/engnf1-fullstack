import { PrismaClient } from '@prisma/client';
import { config } from '../config/env.js';

// Prevent multiple instances of Prisma Client in development mode
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__prisma ??
  new PrismaClient({
    log: config.isProduction ? ['error'] : ['query', 'error', 'warn'],
  });

if (!config.isProduction) {
  globalThis.__prisma = prisma;
}

export default prisma;

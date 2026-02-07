/**
 * Prisma Database Client
 * 
 * Singleton pattern for Next.js serverless environment.
 * Prevents connection pool exhaustion during hot reloads.
 */

import { PrismaClient } from '@prisma/client';

// Prisma 7+ requires passing the datasource URL to the constructor
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  }).$extends({});
};

// Type for global prisma instance
type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

// Extend global type
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

// Use existing instance or create new one
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Check if database is configured
 */
export function isDatabaseConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

/**
 * Health check for database connection
 */
export async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  latencyMs?: number;
  error?: string;
}> {
  if (!isDatabaseConfigured()) {
    return { connected: false, error: 'DATABASE_URL not configured' };
  }

  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { 
      connected: true, 
      latencyMs: Date.now() - start 
    };
  } catch (error) {
    return { 
      connected: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export default prisma;

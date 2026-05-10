import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!prisma) prisma = new PrismaClient();
  return prisma;
}

/**
 * Truncate all data tables in dependency order. Called between tests so each
 * spec starts with a clean DB. Uses raw SQL because Prisma doesn't expose
 * a bulk truncate API.
 */
export async function resetDb(): Promise<void> {
  const p = getPrisma();
  await p.$executeRawUnsafe(`
    TRUNCATE TABLE
      trip_locations,
      reviews,
      payments,
      bids,
      bookings,
      trucks,
      drivers,
      refresh_tokens,
      users
    RESTART IDENTITY CASCADE;
  `);
}

export async function disconnectDb(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

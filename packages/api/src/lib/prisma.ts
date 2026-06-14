import { PrismaClient } from '@prisma/client';

// Single shared client. Creating one per file (we had ~20) leaks
// connection pools — ts-node-dev restarts eat file descriptors,
// and in prod each replica would hold N× the expected Postgres
// connections. Import `prisma` everywhere; never construct your own.
export const prisma = new PrismaClient();

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

// Standard PostgreSQL PrismaClient (no SQLite adapter needed)
if (!process.env.DATABASE_URL) {
  console.error('[CRITICAL] DATABASE_URL is missing! Prisma connection will fail.');
}

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;

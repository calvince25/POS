import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

// Standard PostgreSQL PrismaClient (no SQLite adapter needed)
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

export default prisma;

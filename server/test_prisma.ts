import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

console.log('DATABASE_URL:', process.env.DATABASE_URL);

try {
  const prisma = new PrismaClient();
  console.log('Prisma Client initialized successfully');
  prisma.$disconnect();
} catch (err) {
  console.error('Error initializing Prisma Client:', err);
}

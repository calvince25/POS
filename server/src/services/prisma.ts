import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// SQLite database path
const DATABASE_URL = process.env.DATABASE_URL || 'file:./dev.db';
const dbPath = DATABASE_URL.replace('file:', '');

// Resolve path relative to project root (server directory)
const resolvedPath = path.isAbsolute(dbPath) 
  ? dbPath 
  : path.resolve(process.cwd(), dbPath);

console.log('Initializing Prisma with SQLite at:', resolvedPath);

// In Prisma 7, the adapter constructor takes an object with 'url' and other BetterSQLite3 options
const adapter = new PrismaBetterSqlite3({ url: 'file:' + resolvedPath });
const prisma = new PrismaClient({ adapter });

export default prisma;

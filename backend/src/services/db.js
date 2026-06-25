const { PrismaClient } = require('@prisma/client');
const path = require('path');

// Ensure DATABASE_URL is always set for SQLite — Render free tier has no persistent env
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `file:${path.join(__dirname, '../../prisma/dev.db')}`;
}

// Singleton Prisma client
const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

module.exports = prisma;

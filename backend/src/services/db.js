const { PrismaClient } = require('@prisma/client');

// Singleton Prisma client
const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

module.exports = prisma;

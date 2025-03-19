import { PrismaClient } from '@prisma/client'

// Prevent multiple instances of Prisma Client in development
declare global {
  var prisma: PrismaClient | undefined
}

function createPrismaClient() {
  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
  } catch (e) {
    console.error('Failed to create Prisma Client:', e)
    throw new Error(`Prisma Client initialization failed. Please check your database connection and run 'npx prisma generate'.`)
  }
}

// Use the globally cached instance in development to prevent connection issues during hot reload
const prisma = global.prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') global.prisma = prisma

export default prisma
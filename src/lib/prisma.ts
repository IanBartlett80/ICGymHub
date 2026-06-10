import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

// Bound each app instance's connection pool so multiple instances can't exhaust
// the managed database's limited connection slots. Prisma otherwise defaults to
// (num_cpus * 2 + 1) per instance, which multiplies across instances and caused
// "remaining connection slots are reserved" failures in production.
// If DATABASE_URL already specifies connection_limit (e.g. a PgBouncer pooled
// URL), we respect it and don't override.
function buildDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL
  if (!url) return undefined
  if (url.includes('connection_limit')) return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}connection_limit=5&pool_timeout=20`
}

const databaseUrl = buildDatabaseUrl()

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error'],
    ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Prisma Client includes Venue model

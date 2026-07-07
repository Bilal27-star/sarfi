import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createClient() {
  // Cap pool size per serverless function instance — DATABASE_URL points at
  // a transaction-mode pooler (Supavisor/PgBouncer) which already multiplexes
  // connections across invocations. Without a cap, `pg.Pool`'s default (10)
  // lets concurrent invocations exhaust the pooler's own client limit.
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 3 })
  return new PrismaClient({ adapter })
}

export const db = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

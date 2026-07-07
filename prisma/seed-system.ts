/**
 * Runs on every production build (see package.json `build` script). Only
 * upserts global reference data (system categories, achievements) — never
 * touches user, wallet, or expense rows. Safe to run repeatedly.
 */
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { seedSystemData } from './system-data'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

seedSystemData(prisma)
  .then((categoryIdBySlug) => {
    console.log(`Seeded ${categoryIdBySlug.size} system categories.`)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

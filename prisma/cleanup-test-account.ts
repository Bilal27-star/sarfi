/**
 * One-off: removes the QA deployment-verification test account and all its
 * data (cascades via onDelete: Cascade on every user-scoped relation).
 * Intentionally not part of the normal seed pipeline — run once via the
 * build command, then remove that step again.
 */
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const TEST_EMAIL = 'sarfi.qa.deploy@example.com'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } })
  if (!user) {
    console.log(`No user found with email ${TEST_EMAIL} — nothing to remove.`)
    return
  }
  const expenseCount = await prisma.expense.count({ where: { userId: user.id } })
  await prisma.user.delete({ where: { id: user.id } })
  console.log(`Deleted user ${TEST_EMAIL} (id ${user.id}) and ${expenseCount} expense(s).`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

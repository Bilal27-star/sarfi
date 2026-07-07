import 'dotenv/config'
import { defineConfig } from 'prisma/config'

// The CLI (migrate/seed) needs a session-capable connection for advisory
// locks — a transaction-mode pooler (e.g. Supabase's pooler on 6543) hangs
// forever on `prisma migrate deploy`. DIRECT_URL lets production point the
// CLI at a direct/session connection while the app runtime keeps using the
// pooled DATABASE_URL. Locally there's only one Postgres URL, so it falls
// back to DATABASE_URL.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: (process.env.DIRECT_URL || process.env.DATABASE_URL)!,
  },
  migrations: {
    seed: 'npx tsx prisma/seed.ts',
  },
})

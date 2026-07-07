# SARFI · صرفي

**Know where your money goes.**

SARFI is a mobile-first personal finance PWA built for Algeria first (DZD as a first-class currency) with an architecture ready for international expansion. Track an expense in seconds, understand where your money goes, and build better habits.

## Stack

- **Next.js 16** (App Router, Turbopack, TypeScript strict)
- **Tailwind CSS v4** — semantic design-token system in `src/app/globals.css`
- **Framer Motion** — centralized motion presets in `src/components/motion/presets.ts`
- **Prisma 7 + PostgreSQL** — money stored as `Decimal(12,2)`, never floats
- **Custom session auth** — httpOnly cookie, hashed tokens, bcrypt passwords
- **Custom SVG charts** — no chart library, every visualization answers one question
- **Vitest + Testing Library** — unit + component test foundation

## Run locally

```bash
# 1. PostgreSQL (any instance works; a container is easiest)
docker run -d --name sarfi-postgres \
  -e POSTGRES_USER=sarfi -e POSTGRES_PASSWORD=sarfi_dev_password -e POSTGRES_DB=sarfi \
  -p 5433:5432 postgres:16-alpine

# 2. Environment
cp .env.example .env   # set DATABASE_URL (and a real SESSION_SECRET)

# 3. Install, migrate, seed
npm install
npm run db:migrate
npm run db:seed

# 4. Go
npm run dev
```

**Demo account:** `demo@sarfi.app` / `sarfi-demo` — seeded with ~10 weeks of realistic Algerian expense history.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Reserved for signed-cookie hardening (sessions currently use random 256-bit DB-backed tokens) |

### Commands

| Command | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js dev / production build / serve |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | ESLint (flat config) |
| `npm test` | Vitest (money, insights engine, NL parser, components) |
| `npm run db:migrate` / `db:seed` / `db:studio` | Prisma workflows |

## Architecture

```
src/
  app/                  # App Router routes
    welcome/            # Onboarding (3 steps)
    (auth)/             # signin, signup, forgot-password
    setup/              # Initial financial setup wizard
    (app)/              # Authenticated shell: home, transactions[+id], insights, profile
    manifest.ts         # PWA manifest
    offline/            # Offline fallback (used by the service worker)
  proxy.ts              # Next 16 route gate (middleware successor)
  components/
    ui/                 # Button, Input, Card, Sheet, Progress, chips, empty states
    motion/             # Motion presets + AnimatedAmount
    layout/             # AppShell (bottom nav / desktop rail), logo
    expenses/           # AddExpenseSheet (keypad → description → category), rows
    insights/           # Custom SVG charts + insight cards
  server/
    db.ts               # Prisma client (pg driver adapter)
    auth/               # session, password hashing, rate limit, server actions
    services/           # expenses, insights engine, settings actions
  lib/                  # money (minor-units), dates, validation (zod), ai parser
  config/               # category icon/color token maps
prisma/                 # schema + seed (realistic Algerian demo data)
public/sw.js            # Service worker (static cache + offline navigation fallback)
```

### Money strategy (important)

- DB: `Decimal(12,2)`. Wire: canonical decimal **strings**. UI: formatted at the last step.
- Collection arithmetic uses integer minor units (`src/lib/money.ts`), covered by tests.

### Insights engine

`src/server/services/insights.ts` is a deterministic, pure-function engine (no AI APIs): category increases/decreases, budget pace projection, expensive weekdays, outlier days, repeated merchants, small-purchase accumulation. Structured `Insight` objects, fully unit-tested.

### AI-ready parsing

`src/lib/ai/expense-parser.ts` defines a provider-agnostic `ExpenseParser` interface with a deterministic rule-based implementation that already handles Darija like «شريت دجاج 800 وخضر 700» (→ two candidates). Swap in an LLM provider later without touching callers.

## PWA status

- ✅ Manifest (standalone, icons incl. maskable + real PNGs), installable
- ✅ Service worker: cache-first static assets, network-first navigations, offline fallback page
- ✅ Safe-area handling, `dvh` viewport units, standalone display
- 🔜 **Not yet** (honestly): offline expense drafts + background sync queue. The SW deliberately never caches financial data. This is the next PWA milestone.

## Security

- Ownership enforced on every query (`userId` always derived from the server session)
- bcrypt(10) passwords, sha256-hashed session tokens, httpOnly/SameSite=Lax cookies
- Zod validation on every server action; generic auth errors (no account enumeration)
- In-memory rate limiting on auth endpoints (swap for Redis before horizontal scale)

## Known limitations / next milestone

1. **i18n**: language preference + full RTL layout flip work; string translation coverage is partial (UI is English-first). Wire a dictionary layer next.
2. **Offline drafts & sync queue** (see PWA status).
3. **Forgot-password email** — UI + rate-limited action exist; no email provider wired.
4. Profile rows marked **Soon**: category/wallet management, recurring expenses, notifications, appearance (dark mode tokens), export, PIN quick-unlock.
5. Savings goals & achievements are modeled and seeded but have no UI yet.
6. Playwright responsive smoke tests — manual multi-viewport validation was done; automating it is scaffold-ready (`tests/`).

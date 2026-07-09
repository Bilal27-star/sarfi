# SARFI — Engineering Handoff

> Written 2026-07-10 for a fresh Claude Code session. Repository-grounded: every claim
> below was checked against the working tree at commit `6ae5f0e` (branch `main`, clean,
> in sync with `origin/main`) unless labeled otherwise.
> Labels: **VERIFIED** (checked in repo/API this session) · **PARTIALLY VERIFIED** ·
> **INFERRED** · **UNKNOWN**.

---

## 1. What SARFI Is

SARFI (صرفي) is a mobile-first expense-tracking / budgeting / spending-insights PWA
for Algerian users. Currency-first design around DZD, full trilingual localization
(Arabic RTL, French, English). Solo-user personal finance: track expenses in seconds,
see where money goes, build habits. Current maturity: deployed MVP in production with
real auth + Postgres persistence; several Profile sections are intentionally "Soon"
placeholders.

- Production URL: **https://sarfi-gamma.vercel.app** (VERIFIED)
- GitHub: `Bilal27-star/sarfi` (public repo — VERIFIED; note: public visibility is a
  deliberate-or-accidental fact worth confirming with the owner before adding anything
  sensitive)
- Vercel project: `sarfi` (`prj_yWEaJLnFAIu171mCR9BoCT8qkPkd`,
  team `team_Oqrylfnl7R1rkfaNhumBzJs3`); GitHub → Vercel auto-deploy on push to `main`
  (VERIFIED across many pushes)
- Supabase project "Sarfi", region eu-west-1 (Ireland), Postgres only — **the app does
  NOT use the Supabase SDK**; it is a plain Postgres host accessed via Prisma (VERIFIED)

### Environment/paths quirks (important)
- The project root is `/Users/bilal/Documents/Masrofi/Sarfi ` — **with a trailing space
  in the directory name**. Always quote paths. (VERIFIED)
- The parent folder `/Users/bilal/Documents/Masrofi/` is an empty shell (iCloud
  incident residue) whose own `package.json` has a `dev` script that invokes the nested
  project's `next` binary by absolute path. That wrapper is NOT the app and is not
  deployed. The dev preview launch config `sarfi-dev` (port 3005) goes through it.
  Do not "fix"/merge/delete the parent shell. (VERIFIED)
- Do not run destructive git or filesystem operations without explicit user approval —
  standing instruction from the owner.

---

## 2. Stack (VERIFIED from package.json / configs)

| Thing | Choice |
|---|---|
| Framework | Next.js **16.2.10** App Router, Turbopack, React 19.2.4 |
| Language | TypeScript strict |
| DB | PostgreSQL (Supabase-hosted in prod, localhost:5433 in dev) |
| ORM | Prisma 7.8.0 with `@prisma/adapter-pg` driver adapter (NOT the classic engine) |
| Styling | Tailwind v4 (`@theme` tokens in `src/app/globals.css`) |
| Motion | framer-motion 12 |
| Icons | lucide-react ^1.23 — **has no brand/social icons in this env; write inline SVGs** |
| Forms/validation | react-hook-form + zod 4 |
| Tests | vitest 4 + testing-library, files in `tests/` (5 files, 33 tests, all green) |
| Package manager | npm |
| Node | v20 locally; Vercel runs 24.x |

**Next 16 warning:** this environment's Next has breaking changes vs training data
(see `AGENTS.md` at repo root of `/Users/bilal/test` — different project, but the rule
came from there). Notably `middleware.ts` is renamed **`proxy.ts`** in this Next 16.
Read `node_modules/next/dist/docs/` before using unfamiliar APIs. (VERIFIED — the
build output shows "ƒ Proxy (Middleware)").

### Build pipeline (VERIFIED, package.json)
```
build: prisma migrate deploy && tsx prisma/seed-system.ts && next build
```
- `prisma migrate deploy` — applies committed migrations, never destructive.
- `prisma/seed-system.ts` — upserts ~30 global system categories + 5 achievement
  definitions (userId: null reference data ONLY; never touches user rows). Runs on
  every Vercel build by design because `migrate deploy` cannot seed.
- Full dev seed (`prisma/seed.ts`, via `npm run db:seed`) additionally creates demo
  user `demo@sarfi.app` with ~10 weeks of fake history — **dev only, never run against
  production**.

### Environment variables (names only; VERIFIED via grep)
- `DATABASE_URL` — runtime queries. In production = Supabase **Transaction pooler
  (port 6543)**. Consumed by `src/server/db.ts` with `max: 3` pool cap (do not raise
  casually — pooler client limit is 15 and was exhausted once; see §8).
- `DIRECT_URL` — Prisma CLI only (migrate/seed), **Session pooler (port 5432)**;
  `prisma.config.ts` prefers it and falls back to `DATABASE_URL` locally. Transaction
  pooler cannot run migrations (no advisory locks) — this split is load-bearing.
- `SESSION_SECRET` appears in `.env.example` but is **referenced nowhere in code**
  (sessions are random opaque tokens, SHA-256-hashed in DB). Documented discrepancy.

---

## 3. Architecture Map

### Routing (App Router; all pages dynamic ƒ)
- `/` — `src/app/page.tsx`: pure redirect dispatcher (guest→/welcome, mid-setup→/setup,
  else →/home)
- `(auth)/` — signin, signup, forgot-password; layout redirects signed-in users away
- `(app)/` — home, transactions, transactions/[id], insights, profile; layout enforces
  auth + fetches categories/wallets for the Add Expense sheet; has `loading.tsx`
  skeleton and `template.tsx` (enter-only page fade — no exit gate, do not add
  AnimatePresence mode="wait" here, it would block navigation)
- `welcome` (3-step onboarding), `setup` (currency/budget/language), `offline`

### Server layer
- `src/server/db.ts` — Prisma client, global singleton in dev, pool `max: 3`
- `src/server/auth/session.ts` — cookie `sarfi_session`, 30-day opaque tokens,
  `getCurrentUser` wrapped in React `cache()` (per-request dedup — keep this)
- `src/server/auth/actions.ts` — signUp/signIn/signOut/forgotPassword/completeSetup
  server actions + in-memory rate limiting
- `src/server/services/expenses.ts` — queries (sums, category totals, recent, filters)
- `src/server/services/expense-actions.ts` — createExpense / update / delete server
  actions; each calls `revalidatePath('/home' | '/transactions' | '/insights')` —
  **this is what keeps the client router cache honest; every new mutation must do the
  same** (see staleTimes below)
- `src/server/services/insights.ts` — spending insights engine (rule-based, localized
  via `src/i18n/localize-insight.ts`)

### i18n
`src/i18n/` — provider + server translator, dictionaries `locales/{en,fr,ar}.ts`,
`dir()` for RTL, `categoryLabel()` maps category slugs → localized names. User
preference persisted on the User row; `<html lang dir>` set server-side. All UI uses
logical CSS properties (`ps-`, `pe-`, `start-`, `end-`) — no hardcoded left/right.

### Financial data flow (see §9 before touching)
DB `Decimal(12,2)` → strings across the server boundary → `src/lib/money.ts` integer
minor-units arithmetic → `formatMoney` per-locale display.

### PWA
- `src/app/manifest.ts` — icons any/maskable SVG + 192/512 PNG, standalone
- `public/sw.js` — hand-written SW, **cache version `sarfi-v2`**: cache-first for
  `/_next/static` + `/icons/`, network-first navigations with `/offline` fallback, no
  API caching. **If you ever change anything under `/icons/`, bump VERSION.**
- `src/components/pwa/register-sw.tsx` — registers in production only

---

## 4. Approved Decisions — Do Not Regress

**Hard constraints (owner-approved, explicit):**
1. **Logo is APPROVED — do not redesign, alter geometry, or replace.**
   "The sarf path": S monogram of two opposing 270° arcs meeting at a central balance
   point + one dot above the entry terminal (the dinar entering the flow; the diacritic
   dot of ف in صرفي). Canonical geometry lives as exported constants in
   `src/components/layout/logo.tsx` (`MARK_S_PATH`, `MARK_DOT = {cx:34, cy:6.5, r:2.5}`,
   stroke 6.5 on a 48-grid, ink-900 tile rx 14, green #58cc6b). Scaled copies:
   `src/app/icon.svg`, `public/icons/icon.svg` (512, ×10.667),
   `public/icons/icon-maskable.svg` (512 full-bleed, ×8.5 — verified inside the 80%
   maskable safe zone), PNGs 192/512/apple-touch (rendered from those SVGs).
2. **Splash animation is APPROVED — do not modify without explicit request.**
   `src/components/layout/splash-screen.tsx`: mounted once in root layout; tile
   grounds (blur→sharp 0.32s) → S draws via pathLength (0.18–1.08s) → dot springs
   (1.08s) → light sweep + settle (1.3–1.7s) → exit fade at 2.0s, done 2.42s. Reduced
   motion = plain fade ~720ms total. Never replays on client-side navigation.
3. **Sonic logo (splash sound) exists and is approved-by-acceptance:**
   `src/components/layout/sonic-logo.ts` — synthesized Web Audio (glass E6 + B6
   partial + warm E5), fired at 1450ms, ~550ms scheduled tail, master gain 0.12
   through 6.2kHz lowpass. Autoplay-blocked → silent skip; reduced-motion → skipped;
   module flag prevents replays. Future interaction sounds must be **quieter and
   shorter** than this and in the same sonic family (sine-based, warm, no harsh
   treble) — that's an explicit owner requirement of the active workstream.
4. **Original interaction language only** — Duolingo-quality responsiveness as a bar,
   but zero copied sounds/assets/patterns from anyone.
5. Do not rewrite stable architecture without measurement/evidence (owner repeated
   this multiple times; the perf phase followed measure-first and it should stay
   that way).

**Established preferences:**
- Design tokens/typography (Manrope body, Space Grotesk display, Almarai Arabic) and
  the warm off-white/leaf-green palette are settled — consistency over novelty.
- Motion presets centralized in `src/components/motion/presets.ts` (springSnappy/
  springSoft/pageEnter/successPop/pressTap...). New animation should pull from here.
- No confetti for ordinary actions; celebration is reserved for real milestones; never
  celebrate overspending.
- Buttons use the `btn-tactile` CSS class (globals.css): 3px shadow press-down —
  the existing tactile identity. `<Button>` (`src/components/ui/button.tsx`) already
  has `loading` handling (PARTIALLY VERIFIED — prop seen in use: `loading={saving}`).

**Temporary implementation choices (fine to revisit with evidence):**
- `experimental.staleTimes { dynamic: 30 }` in `next.config.ts` — experimental flag.
- Prisma pool `max: 3` — tuned to the free-tier pooler; revisit only if Supabase plan
  changes.
- qlmanage (macOS) was used to rasterize icon PNGs; QuickLook caches by path, so
  rasterize from a fresh temp filename if regenerating.

---

## 5. Feature Matrix

| Feature | Status | Evidence | Note |
|---|---|---|---|
| Auth (signup/signin/signout, rate-limited) | COMPLETE | `src/server/auth/*` | verified end-to-end in production |
| Forgot password | PARTIAL | `auth/actions.ts` | UI real; email delivery intentionally not wired (returns `sent:true`) |
| Setup flow (currency/budget/language) | COMPLETE | `src/app/setup` | |
| Onboarding (3-step animated) | COMPLETE | `src/app/welcome` | |
| Add Expense (numpad→description→category sheet) | COMPLETE | `components/expenses/add-expense-sheet.tsx` | 3-step framer-motion sheet; save via server action |
| Transactions list (sticky header, search, filters, chips) | COMPLETE | `(app)/transactions/transactions-explorer.tsx` | collapsible sticky header verified EN/AR/320px/768px |
| Transaction detail / edit / delete | COMPLETE | `(app)/transactions/[id]` + `expense-actions.ts` | PARTIALLY VERIFIED in production (delete verified locally) |
| Home (spent today, month budget, insights, recent) | COMPLETE | `(app)/home/page.tsx` | |
| Insights (periods 7d/30d/3m/1y, charts, narratives) | COMPLETE | `(app)/insights` | |
| Profile + language switcher | COMPLETE | `(app)/profile` | many rows are "Soon" placeholders by design |
| Wallets CRUD, categories mgmt, recurring, notifications, export, appearance | PLANNED | Profile shows "Soon" | data models exist in schema |
| Budgets model | PARTIAL | schema + `getOverallBudget` | monthly overall budget works; per-category budgets unbuilt |
| SavingsGoal / Achievements / DailyTracking | PARTIAL | schema + seed | models + seed exist; little/no UI |
| PWA (manifest, SW, offline page, icons) | COMPLETE | `manifest.ts`, `public/sw.js` | installability verified; offline expense queue is a documented future step |
| Splash + sonic logo | COMPLETE/APPROVED | see §4 | |
| Perf: dub1 region + staleTimes | COMPLETE | `vercel.json`, `next.config.ts` | deployed `6ae5f0e`, READY, regions:["dub1"] VERIFIED via API |
| **Interaction feedback system** | **PLANNED — ACTIVE WORKSTREAM** | nothing implemented yet | see §6 |

---

## 6. Active Workstream — Premium Interaction Feedback System

**State: brief received and accepted; ZERO implementation exists in the repo yet.**
The audit had just begun when this handoff was requested. No files were created for
it; nothing is uncommitted. The next session starts this cleanly.

Owner's brief (12 phases, condensed — treat as requirements):
1. **Audit first** (buttons, destructive actions, save-expense flow, auth actions,
   settings, nav, animation/sound utilities, PWA constraints). Don't scatter
   `navigator.vibrate()`/audio calls — build ONE centralized system.
2. **Centralized feedback module** with semantic API: `feedback.tap/selection/
   success/softSuccess/error/warning/destructive/milestone`. TS-safe, SSR-safe, no
   global re-renders, no unhandled rejections, Strict-Mode-safe, never blocks
   mutations.
3. **Save Expense = flagship interaction.** Success feedback ONLY after server
   confirms persistence (never optimistic). Sequence: press compression (~0.97–0.985,
   70–110ms) → saving state (stable dimensions, reuse existing loading pattern) → on
   confirm: success haptic + short original sound + button success state + springing
   checkmark + subtle green pulse → after 300–600ms close sheet, data updates via
   existing revalidatePath flow. No confetti.
4. **Haptics**: progressive enhancement via `navigator.vibrate` where it exists
   (Android Chrome); **iOS Safari does not support the Vibration API — fail silently,
   do not fake it**. Success = short pulse→gap→slightly stronger pulse. Haptics only
   for: successful save, important mutations, confirmed destructive, milestones. NOT
   for tab navigation/scroll/every button.
5. **Sound**: original synthesized Web Audio cue for save success, 120–350ms, quieter
   + shorter than the splash sonic logo, same sonic family (reuse the sine/lowpass
   language of `sonic-logo.ts`; consider extracting its context handling into a shared
   util). Save-button click IS a user gesture → AudioContext will be resumable, unlike
   the splash case. Still: no console errors, no blocking.
6. **Error feedback**: horizontal shake, restrained error haptic, optional quiet
   low cue, human-readable message, preserve form data, allow retry. The sheet
   currently has an `error` state + `setError` (VERIFIED in add-expense-sheet.tsx).
7. **Button micro-interactions**: press compression on primaries (note `pressTap`
   preset + `active:scale-95` already used on chips; `btn-tactile` on Button — build
   on these, don't duplicate). Disabled buttons: no feedback of any kind.
8. **Number feedback**: `AnimatedAmount` (`components/motion/animated-number.tsx`)
   already exists on Home — animate only changed values, verify EN/FR/AR + RTL.
9. **Settings**: add Sound effects + Haptics toggles. `UserPreferences` model already
   has `reducedMotion`, `notifyDailyReminder` etc. — adding two booleans requires a
   Prisma migration (safe, additive) OR localStorage-first approach; decide next
   session. Respect them in the feedback module.
10. **Performance**: no new deps, no bundle bloat, no AudioContext churn (create
    once, lazily, on first gesture), measure bundle before/after.
11. **Verification**: exactly-once save under rapid double-tap (the sheet's `saving`
    state guards — verify), slow network, failure path, audio blocked, EN/FR/AR/RTL,
    mobile/desktop.
12. **Deploy** via existing pipeline; verify READY.

Suggested shape (INFERRED, not yet built): `src/lib/feedback/` with `haptics.ts`,
`sounds.ts` (sharing one lazy AudioContext), `index.ts` exporting the semantic API +
a `useFeedback()` hook or plain module functions; settings read from a tiny
localStorage-backed store mirrored to UserPreferences if the DB route is chosen.

---

## 7. Recent Changes (last 6 commits, newest first — all pushed, tree clean)

| Commit | What | Stability |
|---|---|---|
| `6ae5f0e` | `vercel.json` regions ["dub1"] + `staleTimes.dynamic: 30` | deployed READY, regions VERIFIED dub1 |
| `129c67c` | Sonic logo (splash sound) | deployed READY, verified no-error in blocked-audio env |
| `dd25533` | **Approved brand mark + splash** (replaced placeholder logo everywhere, SW v2) | deployed READY; prod /icon.svg serves new mark (VERIFIED) |
| `9da4202` | Removed one-off cleanup step from build | stable |
| `9c10e6b` | One-off deletion of QA test account (sarfi.qa.deploy@example.com) — already executed in prod | historical |
| `83c11ae` | System-category seeding on every build (fixed empty-category production bug that disabled Save) | load-bearing — keep in build command |

**Uncommitted changes: NONE** (git status clean at handoff time; SARFI_HANDOFF.md and
SARFI_NEXT_SESSION_PROMPT.md are the only new files, added by the handoff itself).

---

## 8. Deployment & Production Status

- Hosting: Vercel, project `sarfi`, production branch `main`, auto-deploy on push
  (VERIFIED repeatedly).
- Latest production deployment at handoff time: `dpl_3WfhTiAQLiN8GWAcUyv9RvFiJhsZ`
  (commit `6ae5f0e`) — **state READY, regions ["dub1"]** (VERIFIED via Vercel API
  ~30 min before writing this).
- Runtime errors: none in the last hour at check time (VERIFIED).
- Production alias: sarfi-gamma.vercel.app (+ two team aliases).
- Function region dub1 == Supabase eu-west-1 (function↔DB latency now single-digit ms
  vs ~90ms before). A post-deploy client-side TTFB after-measurement was started but
  interrupted — **UNKNOWN, requires fresh verification** (prior vantage point was
  network-noisy anyway; server-side evidence is solid).
- Vercel env vars: `DATABASE_URL` (Transaction pooler 6543, Sensitive),
  `DIRECT_URL` (Session pooler 5432) — both set for Production+Preview by the owner
  manually. **Never print their values; never ask the user to paste them in chat.**
- Supabase: single `20260706124744_init` migration applied; schema + 30 system
  categories live. `prisma migrate deploy` runs on every build (no-op when current).
- Free-tier constraints: Supabase pauses inactive free projects; account is at its
  2-free-project limit (creating branches/projects will fail).

---

## 9. Financial Logic Safety (read before touching money code)

- **Canonical strategy (documented in `src/lib/money.ts` header, VERIFIED):**
  DB stores `Decimal(12,2)`; amounts cross the server boundary as canonical decimal
  **strings** ("1250.00"); collection arithmetic happens in **integer minor units**
  (centimes) via `toMinor`/`fromMinor`; display converts at the last step.
  `toMinor` validates with a strict regex and throws on malformed input.
- `tests/money.test.ts` covers this — run vitest after any change here.
- Prisma returns Decimal objects; services convert with `Number(e.amount)` in some
  aggregation paths (e.g. transactions grouping) — safe within Decimal(12,2) range
  but keep new aggregation in minor units where possible.
- Sign convention: expenses are stored positive and displayed with a leading minus
  ("−220 DZD") at the UI layer (PARTIALLY VERIFIED — observed in UI; no income model
  exists yet, "add income" from the feedback brief has NO backing model today).
- Dates: `src/lib/dates.ts` provides startOfDay/endOfDay/financialMonthRange
  (respects `financialMonthStartDay` preference)/periodRange/previousRange. Local
  server timezone semantics; user timezone field exists on User (`Africa/Algiers`
  default) but per-user TZ math is not applied everywhere (INFERRED risk, LOW-MED).
- Recurring expenses: model + seed exist; **no scheduler/cron materializes them** —
  PLANNED only.
- Deletion: `deleteExpense` is a hard delete with revalidation (VERIFIED locally).

---

## 10. Known Issues, Risks, Fragile Areas

| Severity | Issue | Evidence / Note | Recommended action |
|---|---|---|---|
| HIGH (operational) | Supabase Transaction pooler client cap 15; pool max 3 per function instance was tuned after a real `EMAXCONNSESSION` outage | commit `06feda7`, incident in convo | don't raise pool size; if scaling, move to paid pooler settings first |
| MED | `staleTimes` is experimental; future Next upgrades may change semantics | `next.config.ts` | re-verify tab-hop caching after any Next upgrade |
| MED | SW cache-first on `/icons/` + `/_next/static` — stale brand assets if VERSION not bumped | `public/sw.js` | bump `sarfi-vN` whenever icons change |
| MED | Audio autoplay: splash sound silent on first-ever visit (by design); interaction sounds must be gesture-anchored | `sonic-logo.ts` | for save-sound, resume context inside the click handler |
| MED | iOS Safari: no Vibration API; no haptics possible in web/PWA | platform fact | feature-detect `navigator.vibrate`, fail silent |
| MED | Repo is public on GitHub | Vercel meta `githubRepoVisibility: public` | confirm owner intent; never commit .env |
| LOW-MED | Per-user timezone not consistently applied to date boundaries | `lib/dates.ts` | audit if Algerian users report off-by-one day totals |
| LOW | `SESSION_SECRET` documented in .env.example but unused | grep | remove from example or implement signing; cosmetic |
| LOW | `prisma/seed-system.ts` runs on every build — a Supabase outage during build fails deploys | build command | acceptable; could add retry later |
| LOW | Headless-tab measurements: rAF/timers throttle to ~1s — don't trust in-tab animation timings from automated preview | perf phase finding | measure on real devices |
| FRAGILE | `src/components/layout/logo.tsx` geometry constants feed component + splash; icon SVGs are scaled copies | §4 | any logo change (forbidden anyway) must update all 7 assets + SW version |
| FRAGILE | `prisma.config.ts` DIRECT_URL/DATABASE_URL split | §2 | breaking it re-introduces the 45-min build-hang failure mode |
| FRAGILE | `add-expense-sheet.tsx` step transitions (framer AnimatePresence) — automated clicks during the ~180ms transitions hit wrong elements | verification experience | wait for settle in automated tests |

Accessibility gaps (LOW): no full screen-reader pass done; focus management within
sheets is default browser behavior.

---

## 11. Critical File Map

| Area | Path | Purpose | Risk |
|---|---|---|---|
| Root layout + splash mount | `src/app/layout.tsx` | fonts, i18n provider, SplashScreen, SW registration | MED |
| Approved logo | `src/components/layout/logo.tsx` | mark geometry constants + LogoMark/LogoWord | **DO NOT EDIT** without owner |
| Approved splash | `src/components/layout/splash-screen.tsx` | construction animation + sound timing | **DO NOT EDIT** without owner |
| Splash sound | `src/components/layout/sonic-logo.ts` | Web Audio sonic logo; template for interaction sounds | MED |
| App shell | `src/components/layout/app-shell.tsx` | side/bottom nav, Add Expense button | MED |
| Add Expense | `src/components/expenses/add-expense-sheet.tsx` | 3-step sheet; flagship for feedback workstream | HIGH (active) |
| Expense mutations | `src/server/services/expense-actions.ts` | create/update/delete + revalidatePath | HIGH |
| Money math | `src/lib/money.ts` | minor-units arithmetic | **HIGH — financial** |
| Dates | `src/lib/dates.ts` | ranges, financial month | HIGH — financial |
| Session/auth | `src/server/auth/session.ts`, `actions.ts` | cookie sessions, React cache dedup | HIGH |
| DB client | `src/server/db.ts` | pg adapter, pool max 3 | HIGH |
| Prisma CLI config | `prisma.config.ts` | DIRECT_URL preference | HIGH |
| Schema/migrations | `prisma/schema.prisma`, `prisma/migrations/` | Decimal(12,2) money | HIGH |
| Build-time seed | `prisma/seed-system.ts` (+ `system-data.ts`) | global categories/achievements | MED |
| Design tokens | `src/app/globals.css` | palette, type roles, btn-tactile, safe-area utils | MED |
| Motion presets | `src/components/motion/presets.ts` | central animation vocabulary | MED |
| Animated numbers | `src/components/motion/animated-number.tsx` | for Phase-8 number feedback | LOW |
| i18n | `src/i18n/**` | dictionaries EN/FR/AR, RTL | MED |
| Transactions UI | `src/app/(app)/transactions/transactions-explorer.tsx` | sticky header system | MED |
| PWA | `src/app/manifest.ts`, `public/sw.js`, `public/icons/` | SW VERSION discipline | MED |
| Deploy config | `vercel.json` (regions dub1), `next.config.ts` | region + staleTimes | MED |

---

## 12. Recommended Next Steps

### P0 — Immediate: Interaction Feedback System (owner's active request)
1. **Complete the Phase-1 audit** (buttons/actions inventory — §6 lists file targets).
   Files: read-only. Risk: none. Validate: written mapping of action→feedback.
2. **Build `src/lib/feedback/`** (haptics + sounds + semantic API, settings-aware,
   lazy single AudioContext, Strict-Mode safe). Risk: LOW (additive). Validate:
   tsc/eslint/vitest + browser console clean, OfflineAudioContext render test for the
   cue (pattern exists in convo: peak amplitude / clipping check).
3. **Wire Save Expense flagship sequence** in `add-expense-sheet.tsx` (+ Button
   success state). Success feedback strictly post-server-confirm; rapid double-tap
   must persist exactly once (the `saving` guard exists — verify). Risk: MED (touches
   the most-used flow). Validate: full local prod-build browser pass incl. failure
   path (kill local DB to simulate), EN/FR/AR.
4. **Error feedback path** (shake + preserved form state). Risk: LOW-MED.
5. **Settings toggles** for Sound/Haptics (decide localStorage vs UserPreferences
   migration). Risk: LOW (additive migration if chosen). Validate: toggles gate all
   feedback.
6. Bundle-impact measurement + deploy + production verification + final report
   (the owner expects the 16-point report format from their brief).

### P1 — Next
- Finish interrupted after-measurement of prod TTFB from a stable vantage (or accept
  server-side evidence and close it out in reporting).
- Number-feedback polish on Home totals (AnimatedAmount already exists) incl. budget
  threshold semantics (no celebration for overspend).
- Confirm repo visibility intent (public vs private) with owner.

### P2 — Later
- Profile "Soon" areas: wallets CRUD, per-category budgets, recurring materialization
  (needs a scheduler — Vercel cron), data export.
- Offline expense drafts + sync queue (SW groundwork exists).
- Per-user timezone audit for date boundaries.
- Email delivery for forgot-password.

---

## 13. Fresh Session Start Protocol

1. Read this file completely before any tool use beyond orientation.
2. `cd "/Users/bilal/Documents/Masrofi/Sarfi "` (mind the trailing space) — run
   `git status` and `git log --oneline -8`; expect clean tree at `6ae5f0e` or later.
3. **Never** discard/reset/overwrite uncommitted changes if any exist.
4. Verify branch is `main` tracking `origin/main`.
5. Re-open the active workstream files: `add-expense-sheet.tsx`, `button.tsx`,
   `sonic-logo.ts`, `presets.ts`, `expense-actions.ts`.
6. Cross-check §5/§7 against reality (`git log`, quick greps). Repository wins over
   this document if they diverge — and note the divergence to the user.
7. Validation loop for any change: `npx tsc --noEmit`, `npx eslint .`,
   `npx vitest run` (expect 33/33), `npm run build` (note: build runs migrate+seed
   against the LOCAL .env DB — Postgres on localhost:5433 must be up).
8. Do not redesign approved assets (§4). Do not touch DATABASE_URL/DIRECT_URL.
9. Dev preview: launch config `sarfi-dev` → http://localhost:3005 (goes through the
   parent-shell wrapper; that's expected). Local prod check: `npx next start -p 3006`.
10. Production checks: Vercel project `sarfi` / team `team_Oqrylfnl7R1rkfaNhumBzJs3`;
    deploy = push to main; verify READY + `regions: ["dub1"]`.
11. Current task: **Premium Interaction Feedback System, starting at Phase 1 audit**
    (§6). Ask the user only if repository evidence is genuinely ambiguous.

# Paste this into the fresh Claude Code session

Continue the SARFI project (personal-finance PWA, Next.js 16 + Prisma + Postgres,
trilingual EN/FR/AR with RTL).

Project root (note the trailing space in the folder name — always quote it):
`/Users/bilal/Documents/Masrofi/Sarfi `

Start protocol:
1. Read `SARFI_HANDOFF.md` at the project root COMPLETELY before doing anything else.
2. Run `git status` and `git log --oneline -8`. Do not discard or reset any
   uncommitted changes. Expect branch `main`, clean at `6ae5f0e` or later.
3. Verify repository reality against the handoff; the repository wins — flag any
   divergence to me.

Hard rules (from the handoff, section 4):
- The logo and splash animation are APPROVED. Do not redesign, alter, or replace them.
- Do not rewrite stable architecture without measured evidence.
- Do not touch DATABASE_URL / DIRECT_URL. Never print secret values.
- No copied third-party sounds/assets/interaction patterns — SARFI's interaction
  language must be original.
- Validation loop for every change: `npx tsc --noEmit`, `npx eslint .`,
  `npx vitest run` (33/33 expected), `npm run build`.

Current active task: the **Premium Interaction Feedback System** (handoff §6) —
centralized semantic feedback module (visual + haptic + original synthesized sound),
with Save Expense as the flagship interaction (success feedback only after confirmed
persistence). Nothing has been implemented yet; begin with the Phase-1 audit listed
in the handoff, then implement, verify in the browser, and deploy via push to main.

Work autonomously; ask me only if repository evidence is genuinely ambiguous.

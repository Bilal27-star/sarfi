// Next.js aliases the bare `server-only` import to its own bundled copy at
// build/dev time (next/dist/compiled/server-only) — a no-op module whose
// only job is to throw if accidentally bundled for the browser. Vitest
// doesn't go through Next's resolver, so this stub fills that gap: same
// no-op behavior, letting server-only modules (avatar-storage.ts, etc.) be
// imported directly in tests. See vitest.config.ts's resolve.alias.
export {}

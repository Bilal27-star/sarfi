import 'server-only'

/**
 * Minimal in-memory fixed-window rate limiter for sensitive endpoints.
 * Per-instance only — good enough for a single-node deployment; swap for a
 * shared store (Redis/Upstash) before scaling horizontally.
 */
const buckets = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(key: string, { limit = 10, windowMs = 60_000 } = {}): boolean {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  bucket.count += 1
  return bucket.count <= limit
}

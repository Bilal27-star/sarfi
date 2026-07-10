/**
 * Progressive-enhancement haptics. `navigator.vibrate` only exists on
 * Android Chrome/Firefox — iOS Safari (web and installed PWA) has no
 * Vibration API at all. We feature-detect once and fail silently
 * everywhere it's unsupported; we never fake or claim haptics we can't
 * deliver.
 */

export type HapticKind = 'selection' | 'success' | 'softSuccess' | 'warning' | 'error' | 'destructive' | 'milestone'

// Pattern values are ms on/off pairs, kept short and restrained — these fire
// only for confirmed mutations and meaningful state changes, never on every
// tap (see feedback/index.ts for which semantic kinds carry haptics at all).
const PATTERNS: Record<HapticKind, number | number[]> = {
  selection: 10,
  success: [12, 40, 18],
  softSuccess: 10,
  warning: [15, 60, 15],
  error: [20, 50, 20, 50, 20],
  destructive: [25, 70, 25],
  milestone: [10, 40, 10, 40, 20],
}

let cachedSupport: boolean | null = null

export function hapticsSupported(): boolean {
  if (cachedSupport !== null) return cachedSupport
  cachedSupport = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
  return cachedSupport
}

export function vibrate(kind: HapticKind): void {
  if (!hapticsSupported()) return
  try {
    navigator.vibrate(PATTERNS[kind])
  } catch {
    // some browsers throw under a restrictive Permissions-Policy — never let
    // haptics failure interrupt the interaction it's decorating
  }
}

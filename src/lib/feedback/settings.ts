/**
 * Feedback preferences (sound/haptics on-off), persisted to localStorage.
 * localStorage-first by design: no DB round trip, no migration, works
 * offline, and the feedback module needs to read it synchronously on every
 * interaction. SSR-safe — falls back to defaults when `window` is absent.
 */

const STORAGE_KEY = 'sarfi:feedback-settings:v1'

export type FeedbackSettings = { sound: boolean; haptics: boolean }

const DEFAULTS: FeedbackSettings = { sound: true, haptics: true }

let cache: FeedbackSettings = DEFAULTS
let loaded = false
const listeners = new Set<() => void>()

function load(): FeedbackSettings {
  if (loaded || typeof window === 'undefined') return cache
  loaded = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) cache = { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    // malformed value or storage unavailable (private mode) — defaults stand
  }
  return cache
}

export function getFeedbackSettings(): FeedbackSettings {
  return load()
}

export function setFeedbackSetting(key: keyof FeedbackSettings, value: boolean): void {
  cache = { ...load(), [key]: value }
  loaded = true
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
  } catch {
    // in-memory cache still reflects the change for this session
  }
  listeners.forEach((listener) => listener())
}

export function subscribeFeedbackSettings(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

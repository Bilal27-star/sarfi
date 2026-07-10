'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { setThemePreference } from '@/lib/theme/actions'
import { THEME_COOKIE, type ResolvedTheme, type ThemePreference } from '@/lib/theme/config'

const LIGHT_META_COLOR = '#f7f8f3'
const DARK_META_COLOR = '#10140e'

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolve(preference: ThemePreference): ResolvedTheme {
  return preference === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : preference
}

function applyToDocument(resolved: ResolvedTheme) {
  document.documentElement.setAttribute('data-theme', resolved)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', resolved === 'dark' ? DARK_META_COLOR : LIGHT_META_COLOR)
}

type ThemeContextValue = {
  preference: ThemePreference
  resolvedTheme: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/**
 * `initialPreference` is computed server-side (getServerThemePreference) and
 * passed as a prop — same discipline as I18nProvider's locale — so this
 * never re-derives the *preference* on the client. The one thing that IS
 * legitimately client-only is resolving 'system' to an actual light/dark
 * value, which the inline boot script in layout.tsx already did before
 * paint; this effect just picks up that already-correct DOM state on mount
 * instead of re-computing and risking a mismatch flash.
 */
export function ThemeProvider({ initialPreference, children }: { initialPreference: ThemePreference; children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference)
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  )
  const preferenceRef = useRef(preference)
  useEffect(() => {
    preferenceRef.current = preference
  }, [preference])

  useEffect(() => {
    if (!window.matchMedia) return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (preferenceRef.current !== 'system') return
      const resolved = systemPrefersDark() ? 'dark' : 'light'
      applyToDocument(resolved)
      setResolvedTheme(resolved)
    }
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  const setPreference = useCallback((next: ThemePreference) => {
    const resolved = resolve(next)
    applyToDocument(resolved)
    setPreferenceState(next)
    setResolvedTheme(resolved)
    // zero-latency same-tab persistence; the server action below is the
    // durable/cross-device write (fire-and-forget — never blocks the UI)
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    void setThemePreference(next)
  }, [])

  const value = useMemo<ThemeContextValue>(() => ({ preference, resolvedTheme, setPreference }), [preference, resolvedTheme, setPreference])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

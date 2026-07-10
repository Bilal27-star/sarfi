import { describe, expect, it } from 'vitest'
import { dbThemeFromPreference, isThemePreference, themePreferenceFromDb } from '@/lib/theme/config'

describe('theme preference helpers', () => {
  it('accepts only the three known preferences', () => {
    expect(isThemePreference('light')).toBe(true)
    expect(isThemePreference('dark')).toBe(true)
    expect(isThemePreference('system')).toBe(true)
    expect(isThemePreference('sepia')).toBe(false)
    expect(isThemePreference(undefined)).toBe(false)
    expect(isThemePreference(null)).toBe(false)
  })

  it('maps the DB enum (uppercase) to a lowercase preference', () => {
    expect(themePreferenceFromDb('LIGHT')).toBe('light')
    expect(themePreferenceFromDb('DARK')).toBe('dark')
    expect(themePreferenceFromDb('SYSTEM')).toBe('system')
  })

  it('falls back to system for an unrecognized DB value rather than throwing', () => {
    expect(themePreferenceFromDb('WHATEVER')).toBe('system')
  })

  it('round-trips preference -> DB enum', () => {
    expect(dbThemeFromPreference('light')).toBe('LIGHT')
    expect(dbThemeFromPreference('dark')).toBe('DARK')
    expect(dbThemeFromPreference('system')).toBe('SYSTEM')
  })
})

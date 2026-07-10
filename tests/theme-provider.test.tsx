// ThemeProvider — instant DOM application, system-preference reactivity,
// and background persistence. The actual Taptic-engine-style "does the
// right CSS variables exist" question is a browser/visual concern (see the
// manual dark-mode verification pass); this covers the state machine.
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const setThemePreferenceMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/theme/actions', () => ({
  setThemePreference: (...args: unknown[]) => setThemePreferenceMock(...args),
}))

import { ThemeProvider, useTheme } from '@/components/theme/theme-provider'

function mockMatchMedia(prefersDark: boolean) {
  const listeners: Array<(e: { matches: boolean }) => void> = []
  const mql = {
    matches: prefersDark,
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_: string, cb: (e: { matches: boolean }) => void) => listeners.push(cb),
    removeEventListener: (_: string, cb: (e: { matches: boolean }) => void) => {
      const i = listeners.indexOf(cb)
      if (i >= 0) listeners.splice(i, 1)
    },
  }
  window.matchMedia = vi.fn().mockReturnValue(mql)
  return {
    fireChange: (matches: boolean) => {
      mql.matches = matches
      listeners.forEach((cb) => cb({ matches }))
    },
  }
}

function Consumer() {
  const { preference, resolvedTheme, setPreference } = useTheme()
  return (
    <div>
      <span data-testid="pref">{preference}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button onClick={() => setPreference('dark')}>dark</button>
      <button onClick={() => setPreference('light')}>light</button>
      <button onClick={() => setPreference('system')}>system</button>
    </div>
  )
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme')
    document.head.innerHTML = '<meta name="theme-color" content="#f7f8f3">'
    setThemePreferenceMock.mockClear()
  })
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme')
  })

  it('applies an explicit preference to the DOM immediately and persists it', () => {
    mockMatchMedia(false)
    render(
      <ThemeProvider initialPreference="light">
        <Consumer />
      </ThemeProvider>,
    )

    fireEvent.click(screen.getByText('dark'))

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#10140e')
    expect(screen.getByTestId('resolved').textContent).toBe('dark')
    expect(setThemePreferenceMock).toHaveBeenCalledWith('dark')
  })

  it('resolves system against prefers-color-scheme at the moment it is selected', () => {
    mockMatchMedia(true)
    render(
      <ThemeProvider initialPreference="light">
        <Consumer />
      </ThemeProvider>,
    )

    fireEvent.click(screen.getByText('system'))

    expect(screen.getByTestId('pref').textContent).toBe('system')
    expect(screen.getByTestId('resolved').textContent).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('reacts live to OS theme changes only while preference is system', () => {
    const { fireChange } = mockMatchMedia(false)
    render(
      <ThemeProvider initialPreference="light">
        <Consumer />
      </ThemeProvider>,
    )

    fireEvent.click(screen.getByText('system'))
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')

    act(() => fireChange(true))
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')

    // switch to an explicit preference — further OS changes must not override it
    fireEvent.click(screen.getByText('light'))
    act(() => fireChange(true))
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('sets a same-tab cookie for zero-latency persistence alongside the server action', () => {
    mockMatchMedia(false)
    render(
      <ThemeProvider initialPreference="light">
        <Consumer />
      </ThemeProvider>,
    )
    fireEvent.click(screen.getByText('dark'))
    expect(document.cookie).toContain('sarfi_theme=dark')
  })
})

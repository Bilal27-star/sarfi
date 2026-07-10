// iOS/WebKit haptic fallback — the <input type="checkbox" switch> tick
// trick. Verifies feature detection, singleton DOM node reuse, focus
// preservation, and silent no-ops when unsupported. This is a jsdom
// simulation of the DOM mechanics only: jsdom cannot exercise the real
// Taptic Engine, so whether iOS actually ticks on-device is NOT verified
// by this suite — see the physical-device test plan in the PR/report.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

async function freshModule() {
  vi.resetModules()
  return import('@/lib/feedback/ios-switch-haptic')
}

describe('iOS switch haptic — feature detection', () => {
  const originalSupports = window.CSS?.supports

  afterEach(() => {
    if (originalSupports) window.CSS.supports = originalSupports
  })

  it('reports supported when CSS.supports(appearance: switch) is true', async () => {
    window.CSS.supports = vi.fn().mockReturnValue(true)
    const mod = await freshModule()
    expect(mod.iosSwitchHapticSupported()).toBe(true)
  })

  it('reports unsupported when CSS.supports(appearance: switch) is false (most browsers today)', async () => {
    window.CSS.supports = vi.fn().mockReturnValue(false)
    const mod = await freshModule()
    expect(mod.iosSwitchHapticSupported()).toBe(false)
  })

  it('reports unsupported and never throws when CSS.supports is absent entirely', async () => {
    // @ts-expect-error -- simulate an environment without the CSS global
    window.CSS = undefined
    const mod = await freshModule()
    expect(() => mod.iosSwitchHapticSupported()).not.toThrow()
    expect(mod.iosSwitchHapticSupported()).toBe(false)
    window.CSS = { supports: originalSupports } as unknown as typeof CSS
  })
})

describe('iOS switch haptic — tick behavior', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    window.CSS.supports = vi.fn().mockReturnValue(true)
  })

  it('is a silent no-op when unsupported — no DOM node created', async () => {
    window.CSS.supports = vi.fn().mockReturnValue(false)
    const mod = await freshModule()
    expect(() => mod.tickIOSSwitchHaptic()).not.toThrow()
    expect(document.querySelectorAll('input[type="checkbox"]').length).toBe(0)
  })

  it('creates exactly one hidden switch element and reuses it across calls', async () => {
    const mod = await freshModule()
    mod.tickIOSSwitchHaptic()
    mod.tickIOSSwitchHaptic()
    mod.tickIOSSwitchHaptic()
    const nodes = document.querySelectorAll('input[type="checkbox"]')
    expect(nodes.length).toBe(1)
  })

  it('keeps the switch out of the accessibility tree and tab order, and invisible/non-interactive', async () => {
    const mod = await freshModule()
    mod.tickIOSSwitchHaptic()
    const el = document.querySelector('input[type="checkbox"]') as HTMLInputElement
    expect(el.getAttribute('aria-hidden')).toBe('true')
    expect(el.tabIndex).toBe(-1)
    expect(el.style.opacity).toBe('0')
    expect(el.style.pointerEvents).toBe('none')
  })

  it('does not steal focus from a previously focused element', async () => {
    const button = document.createElement('button')
    document.body.appendChild(button)
    button.focus()
    expect(document.activeElement).toBe(button)

    const mod = await freshModule()
    mod.tickIOSSwitchHaptic()

    expect(document.activeElement).toBe(button)
  })

  it('never throws even if the underlying click() throws', async () => {
    const mod = await freshModule()
    mod.tickIOSSwitchHaptic()
    const el = document.querySelector('input[type="checkbox"]') as HTMLInputElement
    el.click = () => {
      throw new Error('boom')
    }
    expect(() => mod.tickIOSSwitchHaptic()).not.toThrow()
  })
})

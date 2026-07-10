/**
 * iOS/WebKit haptic fallback.
 *
 * iOS Safari (both the web and installed-PWA contexts) has no Vibration
 * API at all — `navigator.vibrate` does not exist, full stop. There is no
 * public, documented way to trigger the Taptic Engine from web content on
 * iOS. What *does* exist, since iOS 17.4 / Safari 17.4: the native
 * `<input type="checkbox" switch>` control (WebKit's implementation of
 * the proposed HTML "switch" control) plays the same short haptic tick a
 * native iOS toggle plays when its checked state changes as a result of
 * user interaction. This is platform *behavior*, not an API — there is no
 * spec guarantee it fires, no way to choose intensity, and it could change
 * or disappear in a future WebKit release. Treat it as a best-effort,
 * feature-detected enhancement, never a claim of "haptics support."
 *
 * Implementation notes:
 * - A single hidden switch checkbox is created once and reused (never
 *   recreated per call) — it stays out of the accessibility tree
 *   (aria-hidden, tabIndex -1) and out of layout (fixed, 1px, opacity 0,
 *   pointer-events none), so it is never visible, never focusable via Tab,
 *   and never adds a repeated DOM node.
 * - Must be toggled via `.click()`, not by setting `.checked` directly —
 *   only the former runs WebKit's native switch state-change handling
 *   (and, on-device, the haptic). This only works chained off an actual
 *   user gesture; a click() fired from an unrelated timer will not tick.
 * - Each call flips the checked state (no reset), so state simply
 *   alternates between calls — a single tick per call either way.
 * - Focus is restored synchronously after the click so this never steals
 *   focus from whatever the user was actually interacting with.
 */

let switchEl: HTMLInputElement | null = null
let supportCache: boolean | null = null

export function iosSwitchHapticSupported(): boolean {
  if (supportCache !== null) return supportCache
  supportCache = typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('appearance', 'switch')
  return supportCache
}

function getSwitchElement(): HTMLInputElement | null {
  if (typeof document === 'undefined' || !iosSwitchHapticSupported()) return null
  if (switchEl) return switchEl

  const el = document.createElement('input')
  el.type = 'checkbox'
  el.setAttribute('switch', '')
  el.setAttribute('aria-hidden', 'true')
  el.tabIndex = -1
  Object.assign(el.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '1px',
    height: '1px',
    margin: '0',
    padding: '0',
    border: '0',
    opacity: '0',
    pointerEvents: 'none',
  })
  document.body.appendChild(el)
  switchEl = el
  return el
}

/** Fires one native switch-toggle tick. No-op (silent) if the switch
 * control isn't supported, or if anything about the click throws. */
export function tickIOSSwitchHaptic(): void {
  const el = getSwitchElement()
  if (!el) return
  const previouslyFocused = document.activeElement as HTMLElement | null
  try {
    el.click()
  } catch {
    // best-effort only — never let this interrupt the interaction it's decorating
  } finally {
    if (previouslyFocused && previouslyFocused !== el && typeof previouslyFocused.focus === 'function') {
      previouslyFocused.focus({ preventScroll: true })
    } else if (document.activeElement === el && typeof el.blur === 'function') {
      el.blur()
    }
  }
}

/**
 * Centralized interaction-feedback system. Every haptic/sound call in the
 * app should go through this semantic API rather than reaching for
 * `navigator.vibrate` or Web Audio directly — keeps the "what triggers
 * what" decision in one place and respects the user's Sound/Haptics
 * settings uniformly.
 *
 * `tap` and `selection` are visual-only by design (existing CSS
 * `active:scale`/`btn-tactile` already covers instant press feedback) —
 * haptics/sound are reserved for confirmed mutations and meaningful state
 * changes, not every button press.
 */

import { getFeedbackSettings } from './settings'
import { hapticsSupported, vibrate, type HapticKind } from './haptics'
import { iosSwitchHapticSupported, tickIOSSwitchHaptic } from './ios-switch-haptic'
import { playErrorCue, playSuccessCue, primeAudioContext } from './sound'

export type FeedbackKind = 'tap' | 'selection' | 'success' | 'softSuccess' | 'error' | 'warning' | 'destructive' | 'milestone'

const HAPTIC_KIND: Partial<Record<FeedbackKind, HapticKind>> = {
  selection: 'selection',
  success: 'success',
  softSuccess: 'softSuccess',
  warning: 'warning',
  error: 'error',
  destructive: 'destructive',
  milestone: 'milestone',
}

/** navigator.vibrate (Android/etc.) is tried first; the iOS/WebKit switch
 * tick is a distinct, weaker fallback (one fixed tick, no per-kind
 * patterns) used only where the Vibration API doesn't exist at all. */
function fireHaptic(kind: HapticKind): void {
  if (hapticsSupported()) {
    vibrate(kind)
    return
  }
  if (iosSwitchHapticSupported()) tickIOSSwitchHaptic()
}

function fire(kind: FeedbackKind): void {
  const settings = getFeedbackSettings()

  const hapticKind = HAPTIC_KIND[kind]
  if (settings.haptics && hapticKind) fireHaptic(hapticKind)

  if (!settings.sound) return
  if (kind === 'success' || kind === 'milestone') playSuccessCue()
  if (kind === 'error' || kind === 'destructive') playErrorCue()
}

export const feedback = {
  tap: () => fire('tap'),
  selection: () => fire('selection'),
  success: () => fire('success'),
  softSuccess: () => fire('softSuccess'),
  error: () => fire('error'),
  warning: () => fire('warning'),
  destructive: () => fire('destructive'),
  milestone: () => fire('milestone'),
  /** Call synchronously inside the originating click handler, before any
   * `await`, so a cue scheduled after a later server confirmation plays on
   * an already-unlocked AudioContext. */
  primeAudio: primeAudioContext,
  /** True if this platform can deliver a haptic through any known path
   * (Vibration API or the iOS switch-tick fallback). */
  hapticsSupported: () => hapticsSupported() || iosSwitchHapticSupported(),
}

// Interaction-feedback module — settings persistence, haptic feature
// detection, and the semantic API's gating logic (never fires a haptic/sound
// the user has turned off, and `tap`/`selection` never carry haptics).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const STORAGE_KEY = 'sarfi:feedback-settings:v1'

async function freshFeedbackModules() {
  vi.resetModules()
  const settings = await import('@/lib/feedback/settings')
  const haptics = await import('@/lib/feedback/haptics')
  const iosSwitch = await import('@/lib/feedback/ios-switch-haptic')
  const sound = await import('@/lib/feedback/sound')
  const feedbackApi = await import('@/lib/feedback')
  return { settings, haptics, iosSwitch, sound, feedbackApi }
}

describe('feedback settings', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('defaults to sound and haptics both enabled', async () => {
    const { settings } = await freshFeedbackModules()
    expect(settings.getFeedbackSettings()).toEqual({ sound: true, haptics: true })
  })

  it('persists changes to localStorage and reflects them on next read', async () => {
    const { settings } = await freshFeedbackModules()
    settings.setFeedbackSetting('sound', false)
    expect(settings.getFeedbackSettings().sound).toBe(false)
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)).toMatchObject({ sound: false })
  })

  it('notifies subscribers when a setting changes', async () => {
    const { settings } = await freshFeedbackModules()
    const listener = vi.fn()
    const unsubscribe = settings.subscribeFeedbackSettings(listener)
    settings.setFeedbackSetting('haptics', false)
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    settings.setFeedbackSetting('haptics', true)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('falls back to defaults when stored JSON is malformed', async () => {
    window.localStorage.setItem(STORAGE_KEY, '{not-json')
    const { settings } = await freshFeedbackModules()
    expect(settings.getFeedbackSettings()).toEqual({ sound: true, haptics: true })
  })
})

describe('haptics feature detection', () => {
  const originalVibrate = navigator.vibrate

  afterEach(() => {
    Object.defineProperty(navigator, 'vibrate', { value: originalVibrate, configurable: true, writable: true })
  })

  it('reports supported and calls navigator.vibrate when present', async () => {
    const vibrateSpy = vi.fn().mockReturnValue(true)
    Object.defineProperty(navigator, 'vibrate', { value: vibrateSpy, configurable: true, writable: true })
    const { haptics } = await freshFeedbackModules()
    expect(haptics.hapticsSupported()).toBe(true)
    haptics.vibrate('success')
    expect(vibrateSpy).toHaveBeenCalledTimes(1)
  })

  it('reports unsupported and never throws when navigator.vibrate is absent (iOS Safari)', async () => {
    Object.defineProperty(navigator, 'vibrate', { value: undefined, configurable: true, writable: true })
    const { haptics } = await freshFeedbackModules()
    expect(haptics.hapticsSupported()).toBe(false)
    expect(() => haptics.vibrate('success')).not.toThrow()
  })

  it('fails silently if navigator.vibrate throws', async () => {
    Object.defineProperty(navigator, 'vibrate', {
      value: () => {
        throw new Error('denied by Permissions-Policy')
      },
      configurable: true,
      writable: true,
    })
    const { haptics } = await freshFeedbackModules()
    expect(() => haptics.vibrate('error')).not.toThrow()
  })
})

describe('semantic feedback API', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('routes success/error through haptics and sound when both are enabled', async () => {
    const vibrateSpy = vi.fn().mockReturnValue(true)
    Object.defineProperty(navigator, 'vibrate', { value: vibrateSpy, configurable: true, writable: true })
    const { feedbackApi, sound } = await freshFeedbackModules()
    const successCue = vi.spyOn(sound, 'playSuccessCue')
    const errorCue = vi.spyOn(sound, 'playErrorCue')

    feedbackApi.feedback.success()
    expect(vibrateSpy).toHaveBeenCalledTimes(1)
    expect(successCue).toHaveBeenCalledTimes(1)

    feedbackApi.feedback.error()
    expect(vibrateSpy).toHaveBeenCalledTimes(2)
    expect(errorCue).toHaveBeenCalledTimes(1)
  })

  it('never plays sound or haptics for tap — visual-only by design', async () => {
    const vibrateSpy = vi.fn().mockReturnValue(true)
    Object.defineProperty(navigator, 'vibrate', { value: vibrateSpy, configurable: true, writable: true })
    const { feedbackApi, sound } = await freshFeedbackModules()
    const successCue = vi.spyOn(sound, 'playSuccessCue')
    const errorCue = vi.spyOn(sound, 'playErrorCue')

    feedbackApi.feedback.tap()
    expect(vibrateSpy).not.toHaveBeenCalled()
    expect(successCue).not.toHaveBeenCalled()
    expect(errorCue).not.toHaveBeenCalled()
  })

  it('respects the sound=off setting without touching haptics', async () => {
    const vibrateSpy = vi.fn().mockReturnValue(true)
    Object.defineProperty(navigator, 'vibrate', { value: vibrateSpy, configurable: true, writable: true })
    const { feedbackApi, settings, sound } = await freshFeedbackModules()
    settings.setFeedbackSetting('sound', false)
    const successCue = vi.spyOn(sound, 'playSuccessCue')

    feedbackApi.feedback.success()
    expect(vibrateSpy).toHaveBeenCalledTimes(1)
    expect(successCue).not.toHaveBeenCalled()
  })

  it('respects the haptics=off setting without touching sound', async () => {
    const vibrateSpy = vi.fn().mockReturnValue(true)
    Object.defineProperty(navigator, 'vibrate', { value: vibrateSpy, configurable: true, writable: true })
    const { feedbackApi, settings, sound } = await freshFeedbackModules()
    settings.setFeedbackSetting('haptics', false)
    const successCue = vi.spyOn(sound, 'playSuccessCue')

    feedbackApi.feedback.success()
    expect(vibrateSpy).not.toHaveBeenCalled()
    expect(successCue).toHaveBeenCalledTimes(1)
  })
})

describe('semantic feedback API — iOS switch-tick fallback', () => {
  const originalCSSSupports = window.CSS?.supports

  beforeEach(() => {
    window.localStorage.clear()
    document.body.innerHTML = ''
    Object.defineProperty(navigator, 'vibrate', { value: undefined, configurable: true, writable: true })
  })
  afterEach(() => {
    if (originalCSSSupports) window.CSS.supports = originalCSSSupports
  })

  it('falls back to the iOS switch tick when navigator.vibrate is absent but the switch control is supported', async () => {
    window.CSS.supports = vi.fn().mockReturnValue(true)
    const { feedbackApi, iosSwitch } = await freshFeedbackModules()
    const tickSpy = vi.spyOn(iosSwitch, 'tickIOSSwitchHaptic')

    feedbackApi.feedback.success()

    expect(tickSpy).toHaveBeenCalledTimes(1)
    // one hidden switch node, reused — not recreated per call
    feedbackApi.feedback.error()
    expect(document.querySelectorAll('input[type="checkbox"]').length).toBe(1)
  })

  it('never throws and triggers nothing when neither vibrate nor the switch control is supported', async () => {
    window.CSS.supports = vi.fn().mockReturnValue(false)
    const { feedbackApi } = await freshFeedbackModules()

    expect(() => feedbackApi.feedback.success()).not.toThrow()
    expect(document.querySelectorAll('input[type="checkbox"]').length).toBe(0)
  })

  it('prefers navigator.vibrate over the iOS fallback when both are present (Android path unaffected)', async () => {
    const vibrateSpy = vi.fn().mockReturnValue(true)
    Object.defineProperty(navigator, 'vibrate', { value: vibrateSpy, configurable: true, writable: true })
    window.CSS.supports = vi.fn().mockReturnValue(true)
    const { feedbackApi, iosSwitch } = await freshFeedbackModules()
    const tickSpy = vi.spyOn(iosSwitch, 'tickIOSSwitchHaptic')

    feedbackApi.feedback.success()

    expect(vibrateSpy).toHaveBeenCalledTimes(1)
    expect(tickSpy).not.toHaveBeenCalled()
  })

  it('hapticsSupported() reports true via the switch fallback even without the Vibration API', async () => {
    window.CSS.supports = vi.fn().mockReturnValue(true)
    const { feedbackApi } = await freshFeedbackModules()
    expect(feedbackApi.feedback.hapticsSupported()).toBe(true)
  })

  it('hapticsSupported() reports false when neither path is available', async () => {
    window.CSS.supports = vi.fn().mockReturnValue(false)
    const { feedbackApi } = await freshFeedbackModules()
    expect(feedbackApi.feedback.hapticsSupported()).toBe(false)
  })
})

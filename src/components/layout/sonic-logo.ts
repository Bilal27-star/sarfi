/**
 * SARFI sonic logo — a ~550ms synthesized completion cue for the splash:
 * one soft glass-like accent (E6 with a quiet upper partial) answered by a
 * warmer confirmation an octave below. Fully generated with Web Audio, so
 * there is no asset to load, nothing to license, and synchronization is
 * sample-accurate.
 *
 * Autoplay reality: browsers keep a fresh AudioContext suspended until the
 * user has interacted with the origin. We attempt one resume; if the
 * context stays suspended (typical very first visit), we close it and skip
 * silently — the app must open identically with or without sound, and no
 * error may reach the console.
 */

let attempted = false

export function playSonicLogo(): void {
  if (attempted || typeof window === 'undefined') return
  attempted = true

  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()

    const dispose = () => {
      ctx.close().catch(() => {})
    }

    const start = () => {
      try {
        const now = ctx.currentTime + 0.02

        // Gentle top-end rolloff — no harsh highs
        const filter = ctx.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.value = 6200
        filter.Q.value = 0.7

        const master = ctx.createGain()
        master.gain.value = 0.12
        filter.connect(master)
        master.connect(ctx.destination)

        const tone = (freq: number, at: number, peak: number, decay: number) => {
          const osc = ctx.createOscillator()
          osc.type = 'sine'
          osc.frequency.value = freq
          const gain = ctx.createGain()
          gain.gain.setValueAtTime(0, at)
          gain.gain.linearRampToValueAtTime(peak, at + 0.008)
          gain.gain.exponentialRampToValueAtTime(0.0001, at + decay)
          osc.connect(gain)
          gain.connect(filter)
          osc.start(at)
          osc.stop(at + decay + 0.05)
        }

        // Glass accent: E6 + quiet upper partial (B6)
        tone(1318.51, now, 1, 0.38)
        tone(1975.53, now, 0.3, 0.3)
        // Warm confirmation: E5, slightly later and softer
        tone(659.26, now + 0.09, 0.5, 0.45)

        // Free the context once the tail has fully decayed
        window.setTimeout(dispose, 750)
      } catch {
        dispose()
      }
    }

    if (ctx.state === 'suspended') {
      // One polite resume attempt; skip silently if the browser says no
      ctx
        .resume()
        .then(() => {
          if (ctx.state === 'running') start()
          else dispose()
        })
        .catch(dispose)
    } else {
      start()
    }
  } catch {
    // Sound is strictly optional — never let it interfere with launch
  }
}

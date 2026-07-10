/**
 * Interaction sound cues — same synthesized sonic family as the splash
 * sonic logo (`layout/sonic-logo.ts`: sine oscillators, gentle lowpass,
 * no harsh treble) but shorter and quieter, for in-app confirmations.
 *
 * One AudioContext is created lazily and reused for the lifetime of the
 * page — never recreated per interaction. Autoplay policy requires the
 * context to be resumed from within a user gesture; `primeAudioContext`
 * is meant to be called synchronously inside a click handler (e.g. the
 * moment "Save expense" is pressed), *before* any awaited work, so that
 * a cue scheduled later — after a server round trip confirms success —
 * plays on a context that's already running instead of needing a second,
 * potentially-too-late resume.
 */

type Tone = { freq: number; at: number; peak: number; decay: number }

let ctx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (ctx) return ctx
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null
  try {
    ctx = new Ctx()
  } catch {
    return null
  }
  return ctx
}

export function primeAudioContext(): void {
  const audio = getContext()
  if (!audio) return
  if (audio.state === 'suspended') {
    audio.resume().catch(() => {})
  }
}

function playTones(tones: Tone[], masterPeak: number, lowpassHz: number): void {
  const audio = getContext()
  if (!audio) return

  const run = () => {
    try {
      const now = audio.currentTime + 0.005

      const filter = audio.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = lowpassHz
      filter.Q.value = 0.7

      const master = audio.createGain()
      master.gain.value = masterPeak
      filter.connect(master)
      master.connect(audio.destination)

      for (const tone of tones) {
        const osc = audio.createOscillator()
        osc.type = 'sine'
        osc.frequency.value = tone.freq
        const gain = audio.createGain()
        const at = now + tone.at
        gain.gain.setValueAtTime(0, at)
        gain.gain.linearRampToValueAtTime(tone.peak, at + 0.006)
        gain.gain.exponentialRampToValueAtTime(0.0001, at + tone.decay)
        osc.connect(gain)
        gain.connect(filter)
        osc.start(at)
        osc.stop(at + tone.decay + 0.03)
      }
    } catch {
      // sound is strictly optional — never let synthesis errors surface
    }
  }

  if (audio.state === 'suspended') {
    audio.resume().then(() => { if (audio.state === 'running') run() }).catch(() => {})
  } else {
    run()
  }
}

/** Save-success cue — a single lighter echo of the splash sonic logo's
 * glass+warm pairing. ~230ms total, quieter than the splash (peak gain
 * 0.09 vs 0.12). */
export function playSuccessCue(): void {
  playTones(
    [
      { freq: 1318.51, at: 0, peak: 0.55, decay: 0.11 }, // E6 glass accent
      { freq: 659.26, at: 0.03, peak: 0.4, decay: 0.16 }, // E5 warm confirmation
    ],
    0.09,
    6200,
  )
}

/** Restrained low, short cue for failed saves / errors — no melodic
 * resolution, deliberately unresolved-sounding. ~150ms. */
export function playErrorCue(): void {
  playTones([{ freq: 293.66, at: 0, peak: 0.4, decay: 0.15 }], 0.07, 2200)
}

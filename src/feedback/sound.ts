import type { FeedbackKind } from './kinds'

/** freq (Hz), start offset and duration (s), optional glide target. */
interface Note { f: number; t: number; d: number; to?: number; type?: OscillatorType }

const SOUNDS: Record<FeedbackKind, Note[]> = {
  tap: [{ f: 520, t: 0, d: 0.05, to: 380 }],
  log: [{ f: 880, t: 0, d: 0.06, type: 'triangle' }, { f: 1320, t: 0.05, d: 0.09, type: 'triangle' }],
  restDone: [{ f: 523, t: 0, d: 0.12 }, { f: 659, t: 0.1, d: 0.12 }, { f: 784, t: 0.2, d: 0.22 }],
  celebrate: [{ f: 523, t: 0, d: 0.1 }, { f: 659, t: 0.1, d: 0.1 }, { f: 784, t: 0.2, d: 0.1 }, { f: 1047, t: 0.3, d: 0.32 }],
  levelUp: [
    { f: 392, t: 0, d: 0.1 }, { f: 523, t: 0.1, d: 0.1 }, { f: 659, t: 0.2, d: 0.1 },
    { f: 784, t: 0.3, d: 0.1 }, { f: 1047, t: 0.4, d: 0.45 },
  ],
  petTap: [{ f: 700, t: 0, d: 0.07, to: 950 }, { f: 760, t: 0.08, d: 0.07, to: 1050 }],
}
const GAIN = 0.08

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (ctx) return ctx
  const w = window as typeof window & { webkitAudioContext?: typeof AudioContext }
  const AC = w.AudioContext ?? w.webkitAudioContext
  if (!AC) return null
  ctx = new AC()
  return ctx
}

/** Short synthesized sounds; created lazily, so the first one always follows a user gesture. */
export function playSound(kind: FeedbackKind): void {
  try {
    const ac = audio()
    if (!ac) return
    if (ac.state === 'suspended') void ac.resume()
    const now = ac.currentTime
    for (const n of SOUNDS[kind]) {
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      const start = now + n.t
      osc.type = n.type ?? 'sine'
      osc.frequency.setValueAtTime(n.f, start)
      if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to, start + n.d)
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(GAIN, start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + n.d)
      osc.connect(gain).connect(ac.destination)
      osc.start(start)
      osc.stop(start + n.d + 0.02)
    }
  } catch {
    // Audio is a nicety; never let it break a tap.
  }
}

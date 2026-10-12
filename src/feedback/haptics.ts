import type { FeedbackKind } from './kinds'

const PATTERNS: Record<FeedbackKind, number | number[]> = {
  tap: 10,
  log: [20, 40, 20],
  restDone: 300,
  celebrate: [30, 60, 30],
  levelUp: [40, 60, 40, 60, 80],
  petTap: 15,
}

export function vibrate(kind: FeedbackKind): void {
  try {
    navigator.vibrate?.(PATTERNS[kind])
  } catch {
    // Some browsers throw when vibration is blocked; feedback is never essential.
  }
}

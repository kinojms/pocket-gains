import confetti from 'canvas-confetti'
import { prefersReducedMotion } from './motion'

export function burstConfetti(): void {
  if (prefersReducedMotion()) return
  void confetti({
    particleCount: 90, spread: 75, startVelocity: 38, origin: { y: 0.3 },
    colors: ['#ff8a1f', '#ffd34d', '#7ed957', '#4da3ff', '#9b7bff'], disableForReducedMotion: true,
  })
}

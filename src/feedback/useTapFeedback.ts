import { useEffect } from 'react'
import { feedback } from './feedback'
import type { FeedbackKind } from './kinds'

const TAPPABLE = '[data-feedback], .btn, .choice, .tab, .swatch'
const KINDS: FeedbackKind[] = ['tap', 'log', 'restDone', 'celebrate', 'levelUp', 'petTap']
/** A label click also clicks its input; both arrive within a few ms. */
const SAME_TAP_MS = 60

export function tapKindFor(target: EventTarget | null): FeedbackKind | null {
  if (!(target instanceof Element)) return null
  const el = target.closest<HTMLElement>(TAPPABLE)
  if (!el || el.matches(':disabled') || el.getAttribute('aria-disabled') === 'true') return null
  const kind = el.dataset.feedback
  if (kind === 'none') return null
  return KINDS.find((k) => k === kind) ?? 'tap'
}

/** One listener gives every button its tap sound and vibration. */
export function useTapFeedback(): void {
  useEffect(() => {
    let last = 0
    const onClick = (e: MouseEvent) => {
      const kind = tapKindFor(e.target)
      if (!kind) return
      const now = performance.now()
      if (now - last < SAME_TAP_MS) return
      last = now
      feedback(kind)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])
}

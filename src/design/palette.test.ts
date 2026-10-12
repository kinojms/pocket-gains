import { describe, expect, it } from 'vitest'
import { applyPhase, contrast, PHASE_PALETTES, STATIC_TOKENS } from './palette'
import type { DayPhase } from '../domain/dayPhase'

const PHASES: DayPhase[] = ['morning', 'day', 'sunset', 'night']

describe('contrast', () => {
  it('matches the WCAG formula', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 0)
    expect(contrast('#ffffff', '#ffffff')).toBeCloseTo(1, 5)
  })
})

describe('palette', () => {
  it.each(PHASES)('keeps body text readable in the %s phase', (phase) => {
    const p = PHASE_PALETTES[phase]
    for (const fg of [p.text, p['text-muted'], p.danger]) {
      expect(contrast(fg, p.panel)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(fg, p.bg)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('keeps white button labels (large text) and focus-mode text readable', () => {
    expect(contrast(STATIC_TOKENS['on-color'], STATIC_TOKENS.primary)).toBeGreaterThanOrEqual(3)
    expect(contrast(STATIC_TOKENS['on-color'], STATIC_TOKENS.success)).toBeGreaterThanOrEqual(3)
    for (const n of [0, 1, 2, 3] as const) {
      expect(contrast('#ffffff', STATIC_TOKENS[`focus-${n}`])).toBeGreaterThanOrEqual(4.5)
      expect(contrast('#ffffff', STATIC_TOKENS[`focus-${n}-top`])).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('applies a phase as CSS variables, data-phase, color-scheme and theme-color', () => {
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.append(meta)
    applyPhase('night')
    const root = document.documentElement
    expect(root.dataset.phase).toBe('night')
    expect(root.style.getPropertyValue('--panel')).toBe(PHASE_PALETTES.night.panel)
    expect(root.style.getPropertyValue('--primary')).toBe(STATIC_TOKENS.primary)
    expect(root.style.colorScheme).toBe('dark')
    expect(meta.content).toBe(PHASE_PALETTES.night['sky-top'])
    applyPhase('day')
    expect(root.style.colorScheme).toBe('light')
    meta.remove()
  })
})

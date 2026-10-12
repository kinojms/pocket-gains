import { describe, expect, it } from 'vitest'
import theme from '../theme.css?raw'

// Vite reads the sources as text, so the audit needs no Node APIs.
const sources = import.meta.glob<string>(['../screens/**/*.tsx', '../ui/**/*.tsx', '../router.tsx', '!**/*.test.tsx'], {
  query: '?raw', import: 'default', eager: true,
})

describe('design audit', () => {
  it('reads the interface sources', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(20)
    expect(theme.length).toBeGreaterThan(5000) // vite.config's test.css.include keeps theme.css readable
  })

  it('uses icons, not emoji, in the interface', () => {
    const hits = Object.entries(sources).flatMap(([f, text]) =>
      text.split('\n').flatMap((line, i) => (/\p{Extended_Pictographic}/u.test(line) ? [`${f}:${i + 1}`] : [])),
    )
    expect(hits).toEqual([])
  })

  it('draws focus-mode text in solid white (faded white drops below 4.5:1 on the lighter gradient stop)', () => {
    const rules = theme.match(/[^}]*\{[^}]*\}/g) ?? []
    const faded = rules.filter((r) => /\.(focus|ring-caption)/.test(r.split('{')[0]) && /color: rgba\(255, 255, 255, 0\.\d+\)|opacity: 0\.\d+|#ffe0de/.test(r))
    expect(faded).toEqual([])
  })

  it('keeps small links and selects at least 44px tall', () => {
    for (const sel of ['.back-link', '.quiet-link', '.day-tile select']) {
      const rule = theme.match(new RegExp(`\n${sel.replace('.', '\.')} \{[^}]*\}`))?.[0] ?? ''
      expect(rule, sel).toMatch(/min-height: 44px/)
    }
  })

  it('no longer uses the old colour names', () => {
    // Neither used (var(--accent)) nor still defined (--accent: …).
    const legacy = /var\(--(accent|accent-2|good|muted|surface|surface-2|ink)\)|--(accent|accent-2|good|muted|surface|surface-2|ink)\s*:/
    const hits = [...Object.entries(sources), ['theme.css', theme] as const].filter(([, text]) => legacy.test(text)).map(([f]) => f)
    expect(hits).toEqual([])
  })
})

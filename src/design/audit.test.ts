import { describe, expect, it } from 'vitest'
import theme from '../theme.css?raw'

// Vite reads the sources as text, so the audit needs no Node APIs.
const sources = import.meta.glob<string>(['../screens/**/*.tsx', '../ui/**/*.tsx', '../router.tsx', '!**/*.test.tsx'], {
  query: '?raw', import: 'default', eager: true,
})

describe('design audit', () => {
  it('reads the interface sources', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(20)
  })

  it('uses icons, not emoji, in the interface', () => {
    const hits = Object.entries(sources).flatMap(([f, text]) =>
      text.split('\n').flatMap((line, i) => (/\p{Extended_Pictographic}/u.test(line) ? [`${f}:${i + 1}`] : [])),
    )
    expect(hits).toEqual([])
  })

  it('no longer uses the old colour names', () => {
    // Neither used (var(--accent)) nor still defined (--accent: …).
    const legacy = /var\(--(accent|accent-2|good|muted|surface|surface-2|ink)\)|--(accent|accent-2|good|muted|surface|surface-2|ink)\s*:/
    const hits = [...Object.entries(sources), ['theme.css', theme] as const].filter(([, text]) => legacy.test(text)).map(([f]) => f)
    expect(hits).toEqual([])
  })
})

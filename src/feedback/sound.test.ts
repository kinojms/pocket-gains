import { describe, expect, it } from 'vitest'
import { playSound } from './sound'

describe('playSound', () => {
  it('is a silent no-op without Web Audio (jsdom has none)', () => {
    expect(() => playSound('celebrate')).not.toThrow()
  })
})

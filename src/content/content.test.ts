import { describe, expect, it } from 'vitest'
import { chainEquipment, chainMovement, content, imageUrl, videoUrl } from './index'
import { SOURCES } from './sources'
import images from './images.generated.json'

const exercises = Object.values(content.exercises)
const chains = Object.values(content.chains)

describe('content', () => {
  it('every exercise is complete and cites known sources', () => {
    for (const ex of exercises) {
      const warm = ex.movement === 'warmup'
      expect(ex.cues.length, ex.id).toBeGreaterThanOrEqual(warm ? 4 : 3)
      expect(ex.mistakes.length, ex.id).toBeGreaterThanOrEqual(2)
      expect(ex.sources.length, ex.id).toBeGreaterThanOrEqual(1)
      for (const s of ex.sources) expect(Object.keys(SOURCES), `${ex.id} source ${s}`).toContain(s)
      if (warm) {
        expect(ex.durationSec, ex.id).toBeGreaterThan(0)
      } else {
        expect(ex.regions.length, ex.id).toBeGreaterThan(0)
        expect(ex.repRange[0], ex.id).toBeGreaterThanOrEqual(1)
        expect(ex.repRange[0], ex.id).toBeLessThanOrEqual(ex.repRange[1])
        expect(ex.restSec, ex.id).toBeGreaterThan(0)
      }
    }
  })

  it('every chain references real, consistent, non-warm-up exercises', () => {
    for (const ch of chains) {
      expect(ch.steps.length, ch.id).toBeGreaterThan(0)
      expect(ch.defaultStep, ch.id).toBeLessThan(ch.steps.length)
      const steps = ch.steps.map((id) => content.exercises[id])
      for (const [i, ex] of steps.entries()) {
        expect(ex, `${ch.id} step ${ch.steps[i]}`).toBeDefined()
        expect(ex.movement, ch.id).not.toBe('warmup')
        expect(ex.movement, ch.id).toBe(chainMovement(ch))
        expect(ex.equipment, ch.id).toBe(chainEquipment(ch))
      }
    }
  })

  it('every non-warm-up exercise belongs to at least one chain', () => {
    const inChains = new Set(chains.flatMap((c) => c.steps))
    for (const ex of exercises) {
      if (ex.movement !== 'warmup') expect(inChains.has(ex.id), ex.id).toBe(true)
    }
  })

  it('every deck has a warm-up, real chains, and a chain for each slot movement', () => {
    for (const deck of content.decks) {
      expect(content.exercises[deck.warmupId]?.movement, deck.id).toBe('warmup')
      for (const id of deck.chainIds) expect(content.chains[id], `${deck.id}: ${id}`).toBeDefined()
      for (const slot of deck.slots) {
        const has = deck.chainIds.some((id) => chainMovement(content.chains[id]) === slot.movement)
        expect(has, `${deck.id} slot ${slot.movement}`).toBe(true)
      }
    }
  })

  it('image list only names real exercises and builds a base-relative URL', () => {
    for (const id of images as string[]) expect(content.exercises[id], id).toBeDefined()
    expect(imageUrl('definitely-not-real')).toBeNull()
  })

  it('videoUrl falls back to a YouTube search when not curated', () => {
    const ex = content.exercises['pushup']
    expect(videoUrl({ ...ex, videoUrl: undefined })).toBe(
      'https://www.youtube.com/results?search_query=Push-up%20proper%20form',
    )
    expect(videoUrl({ ...ex, videoUrl: 'https://youtu.be/x' })).toBe('https://youtu.be/x')
  })
})

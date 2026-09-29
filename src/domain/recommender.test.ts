import { describe, expect, it } from 'vitest'
import { content } from '../content'
import type { Equipment } from './types'
import {
  availableChains, currentExerciseFor, dealHand, handTemplate, maxCards, suggestNextDeck, swapOptions,
} from './recommender'
import { makeHistory, makeProfile, makeSession, makeSet } from './testFixtures'

const deck = (id: string) => content.decks.find((d) => d.id === id)!
const movementOf = (chainId: string) => content.exercises[content.chains[chainId].steps[0]].movement
const equipmentOf = (chainId: string) => content.exercises[content.chains[chainId].steps[0]].equipment

describe('handTemplate', () => {
  it('flattens slots in order and truncates', () => {
    expect(handTemplate(deck('push'), 5)).toEqual(['push', 'push', 'isolation', 'isolation', 'core'])
    expect(handTemplate(deck('push'), 4)).toEqual(['push', 'push', 'isolation', 'isolation'])
  })
  it('cycles slots when more cards are requested than the template holds', () => {
    expect(handTemplate(deck('push'), 7)).toEqual(['push', 'push', 'isolation', 'isolation', 'core', 'push', 'push'])
  })
})

describe('dealHand', () => {
  const profile = makeProfile()
  const args = { content, profile, history: makeHistory() }

  it('fills slots by movement with distinct chains', () => {
    const hand = dealHand({ ...args, deck: deck('push'), cards: 5, seed: 'a' })
    expect(hand.map((c) => movementOf(c.chainId))).toEqual(['push', 'push', 'isolation', 'isolation', 'core'])
    expect(new Set(hand.map((c) => c.chainId)).size).toBe(5)
  })

  it('deals a full hand of 5 distinct, owned-equipment cards for every deck and equipment set', () => {
    const subsets: Equipment[][] = [
      ['bodyweight'], ['bodyweight', 'dumbbell'], ['bodyweight', 'band'], ['bodyweight', 'dumbbell', 'band'],
    ]
    for (const d of content.decks) {
      for (const equipment of subsets) {
        for (const seed of ['s1', 's2', 's3']) {
          const hand = dealHand({ ...args, profile: makeProfile({ equipment }), deck: d, cards: 5, seed })
          const label = `${d.id} ${equipment.join('+')} ${seed}`
          expect(hand, label).toHaveLength(5)
          expect(new Set(hand.map((c) => c.chainId)).size, label).toBe(5)
          for (const c of hand) expect(equipment, label).toContain(equipmentOf(c.chainId))
        }
      }
    }
  })

  it('returns a shorter hand rather than duplicates when the deck runs out', () => {
    const bw = makeProfile({ equipment: ['bodyweight'] })
    expect(maxCards(deck('pull'), content, ['bodyweight'])).toBe(5)
    const hand = dealHand({ ...args, profile: bw, deck: deck('pull'), cards: 6, seed: 'x' })
    expect(hand).toHaveLength(5)
    expect(new Set(hand.map((c) => c.chainId)).size).toBe(5)
  })

  it('is deterministic for a seed', () => {
    const a = dealHand({ ...args, deck: deck('pull'), cards: 5, seed: 'same' })
    const b = dealHand({ ...args, deck: deck('pull'), cards: 5, seed: 'same' })
    expect(a).toEqual(b)
  })

  it('prefers chains not used in the previous session of the same deck', () => {
    const prev = makeSession({
      deckId: 'push',
      hand: [
        { chainId: 'pushup', exerciseId: 'pushup' },
        { chainId: 'pike', exerciseId: 'pike-pushup' },
      ],
    })
    for (const seed of ['a', 'b', 'c', 'd']) {
      const hand = dealHand({ ...args, history: makeHistory({ sessions: [prev] }), deck: deck('push'), cards: 5, seed })
      const pushChains = hand.filter((c) => movementOf(c.chainId) === 'push').map((c) => c.chainId).sort()
      expect(pushChains, seed).toEqual(['db-floor-press', 'db-shoulder-press'])
    }
  })
})

describe('currentExerciseFor', () => {
  const pushup = content.chains['pushup']

  it('uses the chain default for returning/consistent users', () => {
    expect(currentExerciseFor(pushup, makeProfile({ experience: 'returning' }), makeHistory())).toBe('pushup')
  })

  it('starts new users one step easier', () => {
    expect(currentExerciseFor(pushup, makeProfile({ experience: 'new' }), makeHistory())).toBe('pushup-incline')
  })

  it('steps down one variation after the latest set in the chain was stopped for pain', () => {
    const h = makeHistory({
      sets: [
        makeSet({ exerciseId: 'pushup', loggedAt: '2026-01-05T09:10:00.000Z' }),
        makeSet({ exerciseId: 'pushup', stoppedForPain: true, loggedAt: '2026-01-05T09:12:00.000Z' }),
      ],
    })
    expect(currentExerciseFor(pushup, makeProfile(), h)).toBe('pushup-incline')
  })

  it('never steps below the first variation', () => {
    const h = makeHistory({ sets: [makeSet({ exerciseId: 'pushup-incline', stoppedForPain: true })] })
    expect(currentExerciseFor(pushup, makeProfile(), h)).toBe('pushup-incline')
  })
})

describe('swapOptions', () => {
  it('offers only same-movement chains that are not already in the hand', () => {
    const args = { content, profile: makeProfile(), history: makeHistory(), deck: deck('push') }
    const hand = dealHand({ ...args, cards: 5, seed: 'q' })
    const idx = hand.findIndex((c) => movementOf(c.chainId) === 'push')
    const options = swapOptions({ ...args, hand, index: idx })
    const inHand = new Set(hand.map((c) => c.chainId))
    expect(options.length).toBeGreaterThan(0)
    for (const o of options) {
      expect(movementOf(o.chainId)).toBe('push')
      expect(inHand.has(o.chainId)).toBe(false)
    }
  })

  it('respects equipment', () => {
    const args = { content, profile: makeProfile({ equipment: ['bodyweight'] }), history: makeHistory(), deck: deck('push') }
    const hand = dealHand({ ...args, cards: 5, seed: 'q' })
    for (let i = 0; i < hand.length; i++) {
      for (const o of swapOptions({ ...args, hand, index: i })) expect(equipmentOf(o.chainId)).toBe('bodyweight')
    }
  })
})

describe('availableChains', () => {
  it('filters by equipment', () => {
    const ids = availableChains(deck('push'), content, ['bodyweight']).map((c) => c.id)
    expect(ids).toEqual(['pushup', 'pike', 'bench-dip', 'core-deadbug', 'core-crunch'])
  })
})

describe('suggestNextDeck', () => {
  const done = (n: number) =>
    Array.from({ length: n }, (_, i) => makeSession({ id: `s${i}`, status: i % 2 ? 'partial' : 'complete' }))

  it('rotates push -> lower -> pull -> lower by number of finished sessions', () => {
    const ids = [0, 1, 2, 3, 4].map((n) => suggestNextDeck(content.decks, makeHistory({ sessions: done(n) })).id)
    expect(ids).toEqual(['push', 'lower', 'pull', 'lower', 'push'])
  })

  it('ignores in-progress and abandoned sessions', () => {
    const h = makeHistory({
      sessions: [makeSession({ status: 'in_progress' }), makeSession({ id: 'z', status: 'abandoned' })],
    })
    expect(suggestNextDeck(content.decks, h).id).toBe('push')
  })
})

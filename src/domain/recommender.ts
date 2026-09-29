import { hashString, mulberry32, shuffled } from './rng'
import type { Content, Deck, Equipment, HandCard, History, Movement, Profile, VariationChain } from './types'

export const MAX_SWAPS = 2
export const MAX_REROLLS = 1
export const ROTATION = ['push', 'lower', 'pull', 'lower'] as const

const movementOf = (chain: VariationChain, content: Content): Movement => content.exercises[chain.steps[0]].movement
const equipmentOf = (chain: VariationChain, content: Content): Equipment => content.exercises[chain.steps[0]].equipment

export function currentExerciseFor(chain: VariationChain, profile: Profile, history: History): string {
  let step = profile.experience === 'new' ? Math.max(0, chain.defaultStep - 1) : chain.defaultStep
  const chainSets = history.sets.filter((s) => chain.steps.includes(s.exerciseId))
  if (chainSets.length > 0) {
    const latest = chainSets.reduce((a, b) => (a.loggedAt >= b.loggedAt ? a : b))
    if (latest.stoppedForPain) step = Math.max(0, chain.steps.indexOf(latest.exerciseId) - 1)
  }
  return chain.steps[step]
}

export function availableChains(deck: Deck, content: Content, equipment: Equipment[]): VariationChain[] {
  return deck.chainIds
    .map((id) => content.chains[id])
    .filter((chain) => equipment.includes(equipmentOf(chain, content)))
}

export function maxCards(deck: Deck, content: Content, equipment: Equipment[]): number {
  return availableChains(deck, content, equipment).length
}

export function handTemplate(deck: Deck, cards: number): Movement[] {
  const flat = deck.slots.flatMap((s) => Array<Movement>(s.count).fill(s.movement))
  const out: Movement[] = []
  for (let i = 0; out.length < cards && flat.length > 0; i++) out.push(flat[i % flat.length])
  return out
}

export interface DealArgs {
  deck: Deck
  content: Content
  profile: Profile
  history: History
}

export function dealHand({ deck, content, profile, history, cards, seed }: DealArgs & { cards: number; seed: string }): HandCard[] {
  const rand = mulberry32(hashString(seed))
  const avail = availableChains(deck, content, profile.equipment)
  const prevSession = history.sessions
    .filter((s) => s.deckId === deck.id && s.status !== 'in_progress')
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]
  const prev = new Set(prevSession?.hand.map((c) => c.chainId) ?? [])
  const order = (list: VariationChain[]) => {
    const mixed = shuffled(list, rand)
    return [...mixed.filter((c) => !prev.has(c.id)), ...mixed.filter((c) => prev.has(c.id))]
  }

  const used = new Set<string>()
  const hand: HandCard[] = []
  for (const movement of handTemplate(deck, cards)) {
    const unused = avail.filter((c) => !used.has(c.id))
    const pick = order(unused.filter((c) => movementOf(c, content) === movement))[0] ?? order(unused)[0]
    if (!pick) break
    used.add(pick.id)
    hand.push({ chainId: pick.id, exerciseId: currentExerciseFor(pick, profile, history) })
  }
  return hand
}

export function swapOptions({ deck, content, profile, history, hand, index }: DealArgs & { hand: HandCard[]; index: number }): HandCard[] {
  const movement = movementOf(content.chains[hand[index].chainId], content)
  const inHand = new Set(hand.map((c) => c.chainId))
  return availableChains(deck, content, profile.equipment)
    .filter((c) => !inHand.has(c.id) && movementOf(c, content) === movement)
    .map((c) => ({ chainId: c.id, exerciseId: currentExerciseFor(c, profile, history) }))
}

export function suggestNextDeck(decks: Deck[], history: History): Deck {
  const finished = history.sessions.filter((s) => s.status === 'complete' || s.status === 'partial').length
  const id = ROTATION[finished % ROTATION.length]
  return decks.find((d) => d.id === id) ?? decks[0]
}

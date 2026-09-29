import type { Content, Deck, Equipment, Exercise, Movement, VariationChain } from '../domain/types'
import exercisesJson from './exercises.json'
import chainsJson from './chains.json'
import decksJson from './decks.json'
import imagesJson from './images.generated.json'

const exerciseList = exercisesJson as unknown as Exercise[]
const chainList = chainsJson as unknown as VariationChain[]

export const content: Content = {
  exercises: Object.fromEntries(exerciseList.map((e) => [e.id, e])),
  chains: Object.fromEntries(chainList.map((c) => [c.id, c])),
  decks: decksJson as unknown as Deck[],
}

export function chainMovement(chain: VariationChain, c: Content = content): Movement {
  return c.exercises[chain.steps[0]].movement
}

export function chainEquipment(chain: VariationChain, c: Content = content): Equipment {
  return c.exercises[chain.steps[0]].equipment
}

const withImages = new Set<string>(imagesJson as string[])

export function imageUrl(exerciseId: string): string | null {
  return withImages.has(exerciseId) ? `${import.meta.env.BASE_URL}exercises/${exerciseId}.jpg` : null
}

export function videoUrl(ex: Exercise): string {
  return ex.videoUrl ?? `https://www.youtube.com/results?search_query=${encodeURIComponent(`${ex.name} proper form`)}`
}

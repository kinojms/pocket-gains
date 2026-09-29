export type Movement = 'push' | 'pull' | 'squat' | 'hinge' | 'core' | 'isolation' | 'warmup'
export type Equipment = 'bodyweight' | 'dumbbell' | 'band'
export type Region = 'arms' | 'chest' | 'back' | 'shoulders' | 'core' | 'legs'
export type Experience = 'new' | 'returning' | 'consistent'
export type Goal = 'muscle_strength'
export type PetColor = 'mint' | 'peach' | 'lavender' | 'sky' | 'lemon' | 'rose'

export interface Exercise {
  id: string
  name: string
  movement: Movement
  equipment: Equipment
  rarity: 1 | 2 | 3
  /** [0, 0] for warm-ups */
  repRange: [number, number]
  /** reps are counted per side (lunges, one-arm rows) */
  perSide?: boolean
  /** 0 for warm-ups */
  restSec: number
  /** warm-ups only */
  durationSec?: number
  muscles: { primary: string[]; secondary: string[] }
  regions: Region[]
  cues: string[]
  mistakes: string[]
  /** keys of SOURCES in src/content/sources.ts */
  sources: string[]
  /** human-curated tutorial link; absent until curated */
  videoUrl?: string
}

export interface VariationChain {
  id: string
  /** exercise ids, easiest -> hardest; all share movement + equipment */
  steps: string[]
  defaultStep: number
  /** unlock when all `sets` hit the top of the current step's repRange (M3) */
  unlockRule: { sets: number }
}

export interface DeckSlot {
  movement: Movement
  count: number
}

export interface Deck {
  id: string
  name: string
  tagline: string
  warmupId: string
  slots: DeckSlot[]
  chainIds: string[]
}

export interface Content {
  exercises: Record<string, Exercise>
  chains: Record<string, VariationChain>
  decks: Deck[]
}

export interface Profile {
  goal: Goal
  experience: Experience
  /** ISO timestamp */
  onboardedAt: string
  equipment: Equipment[]
  petName: string
  petColor: PetColor
  timezone: string
}

export type SessionStatus = 'in_progress' | 'complete' | 'partial' | 'abandoned'
export type EndReason = 'tired' | 'no_time' | 'too_hard' | 'other'

export interface SessionSettings {
  sets: number
  cards: number
  /** reps in reserve, [low, high] */
  rir: [number, number]
  /** null = per-exercise default */
  restSec: number | null
  /** null = per-exercise default */
  repRange: [number, number] | null
}

export interface HandCard {
  chainId: string
  exerciseId: string
}

export interface SessionRecord {
  id: string
  startedAt: string
  endedAt: string | null
  deckId: string
  settings: SessionSettings
  hand: HandCard[]
  status: SessionStatus
  endReason: EndReason | null
}

export interface SetLog {
  id: string
  sessionId: string
  exerciseId: string
  setNo: number
  reps: number
  weightKg: number | null
  stoppedForPain: boolean
  loggedAt: string
}

export type SetLogDraft = Omit<SetLog, 'id' | 'sessionId' | 'loggedAt'>

export interface SorenessCheckin {
  id: string
  sessionId: string
  rating: 1 | 2 | 3
  createdAt: string
}

export interface History {
  sessions: SessionRecord[]
  sets: SetLog[]
  soreness: SorenessCheckin[]
}

export const EMPTY_HISTORY: History = { sessions: [], sets: [], soreness: [] }

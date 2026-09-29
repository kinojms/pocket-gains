import type { Content, EndReason, Exercise, HandCard, SessionSettings, SessionStatus, SetLogDraft } from './types'

export type Phase = 'warmup' | 'tutorial' | 'set' | 'rest' | 'summary'

export const RESUME_WINDOW_MS = 12 * 60 * 60 * 1000

export interface ActiveSession {
  sessionId: string
  deckId: string
  settings: SessionSettings
  hand: HandCard[]
  warmupId: string
  phase: Phase
  cardIndex: number
  /** 1-based; exceeds settings.sets while resting after a card's final set */
  setNo: number
  warmupEndsAt: number | null
  restEndsAt: number | null
  lastReps: number | null
  completedCards: number
  stoppedCards: number[]
  status: SessionStatus
  endReason: EndReason | null
  startedAt: number
}

export type SessionAction =
  | { type: 'WARMUP_DONE' }
  | { type: 'READY' }
  | { type: 'LOG_SET'; reps: number; weightKg: number | null; now: number }
  | { type: 'ADD_REST'; ms: number }
  | { type: 'REST_DONE' }
  | { type: 'HURT'; reps: number; weightKg: number | null }
  | { type: 'END_EARLY'; reason: EndReason }

export interface StepResult {
  state: ActiveSession
  logs: SetLogDraft[]
}

export function startSession(a: {
  sessionId: string
  deckId: string
  settings: SessionSettings
  hand: HandCard[]
  warmupId: string
  warmupSec: number
  now: number
}): ActiveSession {
  return {
    sessionId: a.sessionId,
    deckId: a.deckId,
    settings: a.settings,
    hand: a.hand,
    warmupId: a.warmupId,
    phase: 'warmup',
    cardIndex: 0,
    setNo: 1,
    warmupEndsAt: a.now + a.warmupSec * 1000,
    restEndsAt: null,
    lastReps: null,
    completedCards: 0,
    stoppedCards: [],
    status: 'in_progress',
    endReason: null,
    startedAt: a.now,
  }
}

export function restSecFor(ex: Exercise, s: SessionSettings): number {
  return s.restSec ?? ex.restSec
}

export function repRangeFor(ex: Exercise, s: SessionSettings): [number, number] {
  return s.repRange ?? ex.repRange
}

export function remainingMs(endsAt: number | null, now: number): number {
  return endsAt === null ? 0 : Math.max(0, endsAt - now)
}

export function step(state: ActiveSession, action: SessionAction, content: Content): StepResult {
  const unchanged: StepResult = { state, logs: [] }
  if (state.phase === 'summary') return unchanged
  const card = state.hand[state.cardIndex]
  const isLastCard = state.cardIndex >= state.hand.length - 1

  switch (action.type) {
    case 'WARMUP_DONE':
      if (state.phase !== 'warmup') return unchanged
      return { state: { ...state, phase: 'tutorial', warmupEndsAt: null }, logs: [] }

    case 'READY':
      if (state.phase !== 'tutorial') return unchanged
      return { state: { ...state, phase: 'set' }, logs: [] }

    case 'LOG_SET': {
      if (state.phase !== 'set') return unchanged
      const log: SetLogDraft = {
        exerciseId: card.exerciseId, setNo: state.setNo, reps: action.reps, weightKg: action.weightKg, stoppedForPain: false,
      }
      const isLastSet = state.setNo >= state.settings.sets
      const completedCards = state.completedCards + (isLastSet ? 1 : 0)
      if (isLastSet && isLastCard) {
        return {
          state: { ...state, phase: 'summary', status: 'complete', completedCards, lastReps: action.reps, restEndsAt: null },
          logs: [log],
        }
      }
      const rest = restSecFor(content.exercises[card.exerciseId], state.settings)
      return {
        state: {
          ...state, phase: 'rest', setNo: state.setNo + 1, completedCards, lastReps: action.reps,
          restEndsAt: action.now + rest * 1000,
        },
        logs: [log],
      }
    }

    case 'ADD_REST':
      if (state.phase !== 'rest' || state.restEndsAt === null) return unchanged
      return { state: { ...state, restEndsAt: state.restEndsAt + action.ms }, logs: [] }

    case 'REST_DONE':
      if (state.phase !== 'rest') return unchanged
      if (state.setNo > state.settings.sets) {
        return {
          state: { ...state, phase: 'tutorial', cardIndex: state.cardIndex + 1, setNo: 1, restEndsAt: null, lastReps: null },
          logs: [],
        }
      }
      return { state: { ...state, phase: 'set', restEndsAt: null }, logs: [] }

    case 'HURT': {
      if (state.phase !== 'set') return unchanged
      const log: SetLogDraft = {
        exerciseId: card.exerciseId, setNo: state.setNo, reps: action.reps, weightKg: action.weightKg, stoppedForPain: true,
      }
      const stoppedCards = [...state.stoppedCards, state.cardIndex]
      if (isLastCard) {
        return { state: { ...state, phase: 'summary', status: 'complete', stoppedCards }, logs: [log] }
      }
      return {
        state: { ...state, phase: 'tutorial', cardIndex: state.cardIndex + 1, setNo: 1, stoppedCards, lastReps: null },
        logs: [log],
      }
    }

    case 'END_EARLY':
      return {
        state: { ...state, phase: 'summary', status: 'partial', endReason: action.reason, restEndsAt: null, warmupEndsAt: null },
        logs: [],
      }
  }
}

import type { History, Profile, SessionRecord, SetLog } from './types'

// Monday 2026-01-05, 08:00 UTC
export const T0 = '2026-01-05T08:00:00.000Z'

export function makeProfile(o: Partial<Profile> = {}): Profile {
  return {
    goal: 'muscle_strength',
    experience: 'returning',
    onboardedAt: T0,
    equipment: ['bodyweight', 'dumbbell', 'band'],
    petName: 'Biscuit',
    petColor: 'mint',
    timezone: 'UTC',
    ...o,
  }
}

export function makeSession(o: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: 's1',
    startedAt: '2026-01-05T09:00:00.000Z',
    endedAt: '2026-01-05T09:40:00.000Z',
    deckId: 'push',
    settings: { sets: 3, cards: 5, rir: [1, 3], restSec: null, repRange: null },
    hand: [],
    status: 'complete',
    endReason: null,
    ...o,
  }
}

export function makeSet(o: Partial<SetLog> = {}): SetLog {
  return {
    id: `set-${Math.random().toString(36).slice(2)}`,
    sessionId: 's1',
    exerciseId: 'pushup',
    setNo: 1,
    reps: 10,
    weightKg: null,
    stoppedForPain: false,
    loggedAt: '2026-01-05T09:10:00.000Z',
    ...o,
  }
}

export function makeHistory(o: Partial<History> = {}): History {
  return { sessions: [], sets: [], soreness: [], ...o }
}

export function daysAfter(iso: string, days: number): Date {
  return new Date(new Date(iso).getTime() + days * 86_400_000)
}

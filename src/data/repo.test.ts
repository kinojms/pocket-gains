import { beforeEach, describe, expect, it } from 'vitest'
import { startSession } from '../domain/session'
import { makeProfile, makeSession } from '../domain/testFixtures'
import { LockInDB } from './db'
import {
  addSetLogs, addSoreness, countDirty, createSession, getProfile, loadActive, loadHistory,
  recoverStaleSession, saveActive, saveProfile, updateSession,
} from './repo'

let db: LockInDB
beforeEach(() => {
  db = new LockInDB(`test-${crypto.randomUUID()}`)
})

const HOUR = 3_600_000
const active = (startedAt: number, sessionId = 's1') =>
  startSession({
    sessionId, deckId: 'push', warmupId: 'warmup-upper', warmupSec: 180, now: startedAt,
    settings: { sets: 2, cards: 1, rir: [3, 4], restSec: null, repRange: null },
    hand: [{ chainId: 'pushup', exerciseId: 'pushup' }],
  })

describe('repo', () => {
  it('saves and loads the profile, marking it dirty', async () => {
    expect(await getProfile(db)).toBeNull()
    await saveProfile(db, makeProfile({ petName: 'Mochi' }))
    expect(await getProfile(db)).toEqual(makeProfile({ petName: 'Mochi' }))
    expect(await countDirty(db)).toBe(1)
  })

  it('stores sessions, sets and soreness and returns clean domain objects', async () => {
    await createSession(db, makeSession({ id: 's1', status: 'in_progress', endedAt: null }))
    const logs = await addSetLogs(
      db, 's1',
      [{ exerciseId: 'pushup', setNo: 1, reps: 10, weightKg: null, stoppedForPain: false }],
      new Date('2026-01-05T09:10:00.000Z'),
    )
    await addSoreness(db, 's1', 2, new Date('2026-01-05T10:00:00.000Z'))
    await updateSession(db, 's1', { status: 'complete', endedAt: '2026-01-05T09:40:00.000Z' })

    expect(logs[0]).toMatchObject({ sessionId: 's1', loggedAt: '2026-01-05T09:10:00.000Z' })
    expect(logs[0].id).toMatch(/^[0-9a-f-]{36}$/)

    const h = await loadHistory(db)
    expect(h.sessions[0]).toEqual(makeSession({ id: 's1', status: 'complete', endedAt: '2026-01-05T09:40:00.000Z' }))
    expect(h.sets[0]).not.toHaveProperty('dirty')
    expect(h.sets[0]).not.toHaveProperty('updatedAt')
    expect(h.soreness[0]).toMatchObject({ sessionId: 's1', rating: 2 })
    expect(await countDirty(db)).toBe(3)
  })

  it('saves, loads and clears the active session', async () => {
    const a = active(1_000)
    await saveActive(db, a)
    expect(await loadActive(db)).toEqual(a)
    await saveActive(db, null)
    expect(await loadActive(db)).toBeNull()
  })
})

describe('recoverStaleSession', () => {
  it('returns none when nothing is active', async () => {
    expect(await recoverStaleSession(db, 0)).toBe('none')
  })

  it('keeps a session resumable for 12 hours (e.g. app killed mid-set)', async () => {
    const a = { ...active(0), phase: 'set' as const, cardIndex: 0, setNo: 2 }
    await createSession(db, makeSession({ id: 's1', status: 'in_progress' }))
    await saveActive(db, a)
    expect(await recoverStaleSession(db, 12 * HOUR)).toBe('resumable')
    expect(await loadActive(db)).toEqual(a)
  })

  it('finalizes as partial after 12 hours when sets were logged', async () => {
    await createSession(db, makeSession({ id: 's1', status: 'in_progress', endedAt: null }))
    await addSetLogs(db, 's1', [{ exerciseId: 'pushup', setNo: 1, reps: 8, weightKg: null, stoppedForPain: false }])
    await saveActive(db, active(0))
    expect(await recoverStaleSession(db, 12 * HOUR + 1)).toBe('finalized')
    const h = await loadHistory(db)
    expect(h.sessions[0].status).toBe('partial')
    expect(h.sessions[0].endedAt).toBe(new Date(12 * HOUR + 1).toISOString())
    expect(await loadActive(db)).toBeNull()
  })

  it('finalizes as abandoned when no sets were logged', async () => {
    await createSession(db, makeSession({ id: 's1', status: 'in_progress', endedAt: null }))
    await saveActive(db, active(0))
    await recoverStaleSession(db, 13 * HOUR)
    expect((await loadHistory(db)).sessions[0].status).toBe('abandoned')
  })

  it('clears a leftover active session that already reached the summary', async () => {
    await saveActive(db, { ...active(0), phase: 'summary', status: 'complete' })
    expect(await recoverStaleSession(db, 1)).toBe('none')
    expect(await loadActive(db)).toBeNull()
  })
})

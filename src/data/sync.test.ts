import { beforeEach, describe, expect, it } from 'vitest'
import { makeProfile, makeSession } from '../domain/testFixtures'
import { PocketGainsDB } from './db'
import type { Remote, RemoteTable, Row } from './remote'
import { addSetLogs, countDirty, createSession, getProfile, loadHistory, saveProfile, updateSession } from './repo'
import { pullAll, pushDirty } from './sync'

class FakeRemote implements Remote {
  tables: Record<RemoteTable, Map<string, Row>> = {
    profile: new Map(), session: new Map(), set_log: new Map(), soreness_checkin: new Map(),
  }
  failOn: RemoteTable | null = null
  calls: RemoteTable[] = []
  beforeUpsert: ((table: RemoteTable) => Promise<void>) | null = null

  async upsert(table: RemoteTable, rows: Row[]) {
    this.calls.push(table)
    if (this.beforeUpsert) await this.beforeUpsert(table)
    if (this.failOn === table) throw new Error('offline')
    for (const r of rows) this.tables[table].set(table === 'profile' ? 'me' : String(r.id), r)
  }
  async fetchAll(table: RemoteTable) {
    return [...this.tables[table].values()]
  }
}

let db: PocketGainsDB
let remote: FakeRemote
beforeEach(async () => {
  db = new PocketGainsDB(`test-${crypto.randomUUID()}`)
  remote = new FakeRemote()
  await saveProfile(db, makeProfile())
  await createSession(db, makeSession({ id: '11111111-1111-4111-8111-111111111111' }))
  await addSetLogs(db, '11111111-1111-4111-8111-111111111111', [
    { exerciseId: 'pushup', setNo: 1, reps: 10, weightKg: null, stoppedForPain: false },
    { exerciseId: 'db-curl', setNo: 1, reps: 9, weightKg: 7.5, stoppedForPain: false },
  ])
})

describe('pushDirty', () => {
  it('pushes in foreign-key order, marks rows clean, and pushes nothing the second time', async () => {
    expect(await pushDirty(db, remote)).toBe(4)
    expect(remote.calls).toEqual(['profile', 'session', 'set_log'])
    expect(await countDirty(db)).toBe(0)
    remote.calls = []
    expect(await pushDirty(db, remote)).toBe(0)
    expect(remote.calls).toEqual([])
  })

  it('maps to snake_case rows', async () => {
    await pushDirty(db, remote)
    const row = [...remote.tables.set_log.values()].find((r) => r.exercise_id === 'db-curl')!
    expect(row).toMatchObject({ session_id: '11111111-1111-4111-8111-111111111111', set_no: 1, reps: 9, weight_kg: 7.5, stopped_for_pain: false })
    expect(remote.tables.profile.get('me')).toMatchObject({ pet_name: 'Biscuit', pet_color: 'mint', onboarded_at: makeProfile().onboardedAt })
  })

  it('a failure halfway keeps unsent rows dirty; a retry sends them once, with no duplicates', async () => {
    remote.failOn = 'set_log'
    await expect(pushDirty(db, remote)).rejects.toThrow('offline')
    expect(await countDirty(db)).toBe(2)
    remote.failOn = null
    await pushDirty(db, remote)
    await pushDirty(db, remote)
    expect(remote.tables.set_log.size).toBe(2)
    expect(await countDirty(db)).toBe(0)
  })

  it('a row edited while its push is in flight stays dirty', async () => {
    remote.beforeUpsert = async (table) => {
      if (table === 'session') await updateSession(db, '11111111-1111-4111-8111-111111111111', { status: 'partial', endReason: 'tired' })
    }
    await pushDirty(db, remote)
    expect(await countDirty(db)).toBe(1)
    remote.beforeUpsert = null
    await pushDirty(db, remote)
    expect(remote.tables.session.get('11111111-1111-4111-8111-111111111111')).toMatchObject({ status: 'partial', end_reason: 'tired' })
  })
})

describe('pullAll', () => {
  it('restores everything into an empty device', async () => {
    await pushDirty(db, remote)
    const fresh = new PocketGainsDB(`test-${crypto.randomUUID()}`)
    await pullAll(fresh, remote)
    expect(await loadHistory(fresh)).toEqual(await loadHistory(db))
    expect(await countDirty(fresh)).toBe(0)
  })

  it('restores the pet colour, defaulting to mint when the column is missing', async () => {
    await pushDirty(db, remote)
    remote.tables.profile.set('me', { ...remote.tables.profile.get('me')!, pet_color: 'sky' })
    const fresh = new PocketGainsDB(`test-${crypto.randomUUID()}`)
    await pullAll(fresh, remote)
    expect((await getProfile(fresh))?.petColor).toBe('sky')
    const { pet_color: _gone, ...legacy } = remote.tables.profile.get('me')!
    remote.tables.profile.set('me', legacy)
    const fresh2 = new PocketGainsDB(`test-${crypto.randomUUID()}`)
    await pullAll(fresh2, remote)
    expect((await getProfile(fresh2))?.petColor).toBe('mint')
  })

  it('never overwrites a local row that has unsynced changes', async () => {
    await pushDirty(db, remote)
    await updateSession(db, '11111111-1111-4111-8111-111111111111', { status: 'partial', endReason: 'no_time' })
    await pullAll(db, remote)
    const h = await loadHistory(db)
    expect(h.sessions[0].status).toBe('partial')
  })
})

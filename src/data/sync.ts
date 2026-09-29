import type { Table } from 'dexie'
import type { EndReason, Experience, Goal, HandCard, SessionSettings, SessionStatus, Equipment } from '../domain/types'
import type { LocalProfile, LocalSession, LocalSet, LocalSoreness, PocketGainsDB, SyncMeta } from './db'
import type { Remote, RemoteTable, Row } from './remote'

// ---- mapping: local camelCase <-> remote snake_case ----

const profileToRow = (p: LocalProfile): Row => ({
  goal: p.goal, experience: p.experience, onboarded_at: p.onboardedAt, equipment: p.equipment,
  pet_name: p.petName, timezone: p.timezone, updated_at: p.updatedAt,
})
const profileFromRow = (r: Row): LocalProfile => ({
  id: 'me', goal: r.goal as Goal, experience: r.experience as Experience, onboardedAt: iso(r.onboarded_at),
  equipment: r.equipment as Equipment[], petName: r.pet_name as string, timezone: r.timezone as string,
  dirty: 0, updatedAt: iso(r.updated_at),
})

const sessionToRow = (s: LocalSession): Row => ({
  id: s.id, started_at: s.startedAt, ended_at: s.endedAt, deck_id: s.deckId, settings: s.settings, hand: s.hand,
  status: s.status, end_reason: s.endReason, updated_at: s.updatedAt,
})
const sessionFromRow = (r: Row): LocalSession => ({
  id: r.id as string, startedAt: iso(r.started_at), endedAt: r.ended_at === null ? null : iso(r.ended_at),
  deckId: r.deck_id as string, settings: r.settings as SessionSettings, hand: r.hand as HandCard[],
  status: r.status as SessionStatus, endReason: (r.end_reason as EndReason | null) ?? null,
  dirty: 0, updatedAt: iso(r.updated_at),
})

const setToRow = (s: LocalSet): Row => ({
  id: s.id, session_id: s.sessionId, exercise_id: s.exerciseId, set_no: s.setNo, reps: s.reps, weight_kg: s.weightKg,
  stopped_for_pain: s.stoppedForPain, logged_at: s.loggedAt, updated_at: s.updatedAt,
})
const setFromRow = (r: Row): LocalSet => ({
  id: r.id as string, sessionId: r.session_id as string, exerciseId: r.exercise_id as string, setNo: Number(r.set_no),
  reps: Number(r.reps), weightKg: r.weight_kg === null ? null : Number(r.weight_kg),
  stoppedForPain: Boolean(r.stopped_for_pain), loggedAt: iso(r.logged_at), dirty: 0, updatedAt: iso(r.updated_at),
})

const sorenessToRow = (s: LocalSoreness): Row => ({
  id: s.id, session_id: s.sessionId, rating: s.rating, created_at: s.createdAt, updated_at: s.updatedAt,
})
const sorenessFromRow = (r: Row): LocalSoreness => ({
  id: r.id as string, sessionId: r.session_id as string, rating: Number(r.rating) as 1 | 2 | 3,
  createdAt: iso(r.created_at), dirty: 0, updatedAt: iso(r.updated_at),
})

/** Postgres returns "2026-01-05T09:00:00+00:00"; normalize to JS ISO so local and remote compare equal. */
function iso(v: unknown): string {
  return new Date(v as string).toISOString()
}

// ---- push ----

async function pushTable<T extends SyncMeta & { id: string }>(
  table: Table<T, string>, name: RemoteTable, toRow: (r: T) => Row, remote: Remote,
): Promise<number> {
  const dirty = await table.where('dirty').equals(1).toArray()
  if (dirty.length === 0) return 0
  await remote.upsert(name, dirty.map(toRow))
  await table.db.transaction('rw', table, async () => {
    for (const sent of dirty) {
      const current = await table.get(sent.id)
      // only clear the flag if nothing changed while the request was in flight
      if (current && current.updatedAt === sent.updatedAt) await table.put({ ...current, dirty: 0 as const })
    }
  })
  return dirty.length
}

/** Pushes in foreign-key order. Throws on the first failing table; everything unsent stays dirty. */
export async function pushDirty(db: PocketGainsDB, remote: Remote): Promise<number> {
  let n = 0
  n += await pushTable(db.profile, 'profile', profileToRow, remote)
  n += await pushTable(db.sessions, 'session', sessionToRow, remote)
  n += await pushTable(db.sets, 'set_log', setToRow, remote)
  n += await pushTable(db.soreness, 'soreness_checkin', sorenessToRow, remote)
  return n
}

// ---- pull ----

async function pullTable<T extends SyncMeta & { id: string }>(
  table: Table<T, string>, name: RemoteTable, fromRow: (r: Row) => T, remote: Remote,
): Promise<void> {
  const rows = (await remote.fetchAll(name)).map(fromRow)
  await table.db.transaction('rw', table, async () => {
    for (const row of rows) {
      const local = await table.get(row.id)
      if (!local || local.dirty === 0) await table.put(row)
    }
  })
}

export async function pullAll(db: PocketGainsDB, remote: Remote): Promise<void> {
  await pullTable(db.profile, 'profile', profileFromRow, remote)
  await pullTable(db.sessions, 'session', sessionFromRow, remote)
  await pullTable(db.sets, 'set_log', setFromRow, remote)
  await pullTable(db.soreness, 'soreness_checkin', sorenessFromRow, remote)
}

// ---- background syncer ----

export function createSyncer(db: PocketGainsDB, remote: Remote, onSynced: () => void): { syncNow(): Promise<void> } {
  let running: Promise<void> | null = null
  return {
    syncNow() {
      running ??= pushDirty(db, remote)
        .then(onSynced, (e: unknown) => console.warn('sync failed; will retry', e))
        .finally(() => {
          running = null
        })
      return running
    },
  }
}

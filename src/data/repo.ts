import { dateKey } from '../domain/dates'
import type { PlanDays, PlanSnapshot } from '../domain/plan'
import { RESUME_WINDOW_MS, type ActiveSession } from '../domain/session'
import type { History, Profile, SessionRecord, SetLog, SetLogDraft } from '../domain/types'
import type { LocalProfile, PocketGainsDB, SyncMeta } from './db'

const ACTIVE_KEY = 'activeSession'

let lastStamp = 0
/** Strictly increasing updatedAt, so sync can always detect an edit made while a push is in flight. */
function stamp(): string {
  lastStamp = Math.max(Date.now(), lastStamp + 1)
  return new Date(lastStamp).toISOString()
}

function strip<T extends SyncMeta>(row: T): Omit<T, keyof SyncMeta> {
  const copy: Partial<T> = { ...row }
  delete copy.dirty
  delete copy.updatedAt
  return copy as Omit<T, keyof SyncMeta>
}

function toProfile(row: LocalProfile): Profile {
  return {
    goal: row.goal,
    experience: row.experience,
    onboardedAt: row.onboardedAt,
    equipment: row.equipment,
    petName: row.petName,
    // profiles saved before pet colours existed
    petColor: row.petColor ?? 'mint',
    reminderEnabled: row.reminderEnabled ?? false,
    reminderTime: row.reminderTime ?? '18:00',
    nudgeEnabled: row.nudgeEnabled ?? false,
    reminderDays: row.reminderDays ?? [],
    timezone: row.timezone,
  }
}

export async function getProfile(db: PocketGainsDB): Promise<Profile | null> {
  const row = await db.profile.get('me')
  return row ? toProfile(row) : null
}

export async function saveProfile(db: PocketGainsDB, p: Profile): Promise<void> {
  await db.profile.put({ ...p, id: 'me', dirty: 1, updatedAt: stamp() })
}

export async function loadHistory(db: PocketGainsDB): Promise<History> {
  const [sessions, sets, soreness] = await Promise.all([db.sessions.toArray(), db.sets.toArray(), db.soreness.toArray()])
  return { sessions: sessions.map(strip), sets: sets.map(strip), soreness: soreness.map(strip) }
}

export async function createSession(db: PocketGainsDB, rec: SessionRecord): Promise<void> {
  await db.sessions.put({ ...rec, dirty: 1, updatedAt: stamp() })
}

export async function updateSession(db: PocketGainsDB, id: string, patch: Partial<Omit<SessionRecord, 'id'>>): Promise<void> {
  await db.transaction('rw', db.sessions, async () => {
    const current = await db.sessions.get(id)
    if (!current) throw new Error(`session ${id} not found`)
    await db.sessions.put({ ...current, ...patch, dirty: 1, updatedAt: stamp() })
  })
}

export async function addSetLogs(db: PocketGainsDB, sessionId: string, drafts: SetLogDraft[], at = new Date()): Promise<SetLog[]> {
  const logs: SetLog[] = drafts.map((d) => ({ ...d, id: crypto.randomUUID(), sessionId, loggedAt: at.toISOString() }))
  const updatedAt = stamp()
  await db.sets.bulkPut(logs.map((l) => ({ ...l, dirty: 1 as const, updatedAt })))
  return logs
}

export async function addSoreness(db: PocketGainsDB, sessionId: string, rating: 1 | 2 | 3, at = new Date()): Promise<void> {
  await db.soreness.put({
    id: crypto.randomUUID(), sessionId, rating, createdAt: at.toISOString(), dirty: 1, updatedAt: stamp(),
  })
}

export async function saveActive(db: PocketGainsDB, active: ActiveSession | null): Promise<void> {
  if (active === null) await db.kv.delete(ACTIVE_KEY)
  else await db.kv.put({ key: ACTIVE_KEY, value: active })
}

export async function loadActive(db: PocketGainsDB): Promise<ActiveSession | null> {
  const row = await db.kv.get(ACTIVE_KEY)
  return (row?.value as ActiveSession | undefined) ?? null
}

/** Sets and the resume point are saved atomically, so a crash can never resume "before" a logged set. */
export async function logSetsAndSaveActive(
  db: PocketGainsDB, sessionId: string, drafts: SetLogDraft[], active: ActiveSession, at = new Date(),
): Promise<void> {
  await db.transaction('rw', [db.sets, db.kv], async () => {
    if (drafts.length > 0) await addSetLogs(db, sessionId, drafts, at)
    await saveActive(db, active)
  })
}

export type RecoveryResult = 'none' | 'resumable' | 'finalized'

export async function recoverStaleSession(db: PocketGainsDB, now = Date.now()): Promise<RecoveryResult> {
  const active = await loadActive(db)
  if (!active) return 'none'
  if (active.phase === 'summary') {
    await saveActive(db, null)
    return 'none'
  }
  if (now - active.startedAt <= RESUME_WINDOW_MS) return 'resumable'
  const sets = await db.sets.where('sessionId').equals(active.sessionId).count()
  await updateSession(db, active.sessionId, {
    status: sets > 0 ? 'partial' : 'abandoned',
    endedAt: new Date(now).toISOString(),
  })
  await saveActive(db, null)
  return 'finalized'
}

export async function finalizeOrphans(db: PocketGainsDB, now = Date.now()): Promise<number> {
  const active = await loadActive(db)
  const stale = (await db.sessions.where('status').equals('in_progress').toArray()).filter(
    (s) => s.id !== active?.sessionId && now - Date.parse(s.startedAt) > RESUME_WINDOW_MS,
  )
  for (const s of stale) {
    const sets = await db.sets.where('sessionId').equals(s.id).count()
    await updateSession(db, s.id, { status: sets > 0 ? 'partial' : 'abandoned', endedAt: new Date(now).toISOString() })
  }
  return stale.length
}

export async function recoverSessions(db: PocketGainsDB, now = Date.now()): Promise<RecoveryResult> {
  const result = await recoverStaleSession(db, now)
  await finalizeOrphans(db, now)
  return result
}

export async function loadPlans(db: PocketGainsDB): Promise<PlanSnapshot[]> {
  return (await db.plans.toArray()).map(strip)
}

export async function savePlan(db: PocketGainsDB, days: PlanDays, isCustom: boolean, today = new Date()): Promise<PlanSnapshot> {
  const snap: PlanSnapshot = { id: crypto.randomUUID(), effectiveFrom: dateKey(today), savedAt: new Date().toISOString(), days, isCustom }
  await db.plans.put({ ...snap, dirty: 1, updatedAt: stamp() })
  return snap
}

export async function countDirty(db: PocketGainsDB): Promise<number> {
  const counts = await Promise.all(
    [db.profile, db.sessions, db.sets, db.soreness, db.plans].map((t) => t.where('dirty').equals(1).count()),
  )
  return counts.reduce((a, b) => a + b, 0)
}

export async function clearAll(db: PocketGainsDB): Promise<void> {
  await db.transaction('rw', [db.profile, db.sessions, db.sets, db.soreness, db.plans, db.kv], async () => {
    await Promise.all([
      db.profile.clear(), db.sessions.clear(), db.sets.clear(), db.soreness.clear(), db.plans.clear(), db.kv.clear(),
    ])
  })
}

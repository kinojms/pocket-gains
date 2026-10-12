import Dexie, { type Table } from 'dexie'
import type { PlanSnapshot } from '../domain/plan'
import type { Profile, SessionRecord, SetLog, SorenessCheckin } from '../domain/types'

export interface SyncMeta {
  dirty: 0 | 1
  updatedAt: string
}

export type LocalProfile = Profile & SyncMeta & { id: 'me' }
export type LocalSession = SessionRecord & SyncMeta
export type LocalSet = SetLog & SyncMeta
export type LocalSoreness = SorenessCheckin & SyncMeta
export type LocalPlan = PlanSnapshot & SyncMeta

export interface KvRow {
  key: string
  value: unknown
}

export class PocketGainsDB extends Dexie {
  declare profile: Table<LocalProfile, string>
  declare sessions: Table<LocalSession, string>
  declare sets: Table<LocalSet, string>
  declare soreness: Table<LocalSoreness, string>
  declare kv: Table<KvRow, string>
  declare plans: Table<LocalPlan, string>

  constructor(name = 'pocket-gains') {
    super(name)
    this.version(1).stores({
      profile: 'id, dirty',
      sessions: 'id, startedAt, deckId, status, dirty',
      sets: 'id, sessionId, exerciseId, dirty',
      soreness: 'id, sessionId, dirty',
      kv: 'key',
    })
    this.version(2).stores({
      profile: 'id, dirty',
      sessions: 'id, startedAt, deckId, status, dirty',
      sets: 'id, sessionId, exerciseId, dirty',
      soreness: 'id, sessionId, dirty',
      kv: 'key',
      plans: 'id, effectiveFrom, dirty',
    })
  }
}

export const db = new PocketGainsDB()

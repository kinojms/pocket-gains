import Dexie, { type Table } from 'dexie'
import type { Profile, SessionRecord, SetLog, SorenessCheckin } from '../domain/types'

export interface SyncMeta {
  dirty: 0 | 1
  updatedAt: string
}

export type LocalProfile = Profile & SyncMeta & { id: 'me' }
export type LocalSession = SessionRecord & SyncMeta
export type LocalSet = SetLog & SyncMeta
export type LocalSoreness = SorenessCheckin & SyncMeta

export interface KvRow {
  key: string
  value: unknown
}

export class LockInDB extends Dexie {
  declare profile: Table<LocalProfile, string>
  declare sessions: Table<LocalSession, string>
  declare sets: Table<LocalSet, string>
  declare soreness: Table<LocalSoreness, string>
  declare kv: Table<KvRow, string>

  constructor(name = 'lock-in') {
    super(name)
    this.version(1).stores({
      profile: 'id, dirty',
      sessions: 'id, startedAt, deckId, status, dirty',
      sets: 'id, sessionId, exerciseId, dirty',
      soreness: 'id, sessionId, dirty',
      kv: 'key',
    })
  }
}

export const db = new LockInDB()

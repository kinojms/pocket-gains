import type { SupabaseClient } from '@supabase/supabase-js'

export type RemoteTable = 'profile' | 'session' | 'set_log' | 'soreness_checkin' | 'weekly_plan'
export type Row = Record<string, unknown>

export interface Remote {
  upsert(table: RemoteTable, rows: Row[]): Promise<void>
  fetchAll(table: RemoteTable): Promise<Row[]>
}

const PAGE = 1000

export function supabaseRemote(client: SupabaseClient): Remote {
  return {
    async upsert(table, rows) {
      const { error } = await client.from(table).upsert(rows, { onConflict: table === 'profile' ? 'user_id' : 'id' })
      if (error) throw new Error(`${table} upsert failed: ${error.message}`)
    },
    async fetchAll(table) {
      const key = table === 'profile' ? 'user_id' : 'id'
      const out: Row[] = []
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await client.from(table).select('*').order(key).range(from, from + PAGE - 1)
        if (error) throw new Error(`${table} fetch failed: ${error.message}`)
        out.push(...(data ?? []))
        if (!data || data.length < PAGE) return out
      }
    },
  }
}

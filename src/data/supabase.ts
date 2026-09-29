import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** null = local mode: no login, no sync (used by E2E tests and offline development). */
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null

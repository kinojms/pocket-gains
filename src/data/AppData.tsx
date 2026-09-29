import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ActiveSession } from '../domain/session'
import { EMPTY_HISTORY, type History, type Profile } from '../domain/types'
import type { PullState } from '../gate'
import { db as defaultDb, type LockInDB } from './db'
import { supabaseRemote } from './remote'
import { clearAll, countDirty, getProfile, loadActive, loadHistory, recoverStaleSession } from './repo'
import { supabase } from './supabase'
import { createSyncer, pullAll } from './sync'

export interface AppData {
  db: LockInDB
  ready: boolean
  mode: 'local' | 'cloud'
  authChecked: boolean
  /** a live Supabase session exists (needed for sync) */
  signedIn: boolean
  /** this device has signed in before and not signed out (lets the app open offline with an expired token) */
  deviceSignedIn: boolean
  /** first download of the user's data on this app start */
  initialPull: PullState
  profile: Profile | null
  history: History
  active: ActiveSession | null
  dirtyCount: number
  refresh(): Promise<void>
  afterWrite(): Promise<void>
  signIn(email: string, password: string): Promise<string | null>
  signOut(): Promise<void>
  retryPull(): void
}

const Ctx = createContext<AppData | null>(null)

const DEVICE_FLAG = 'lockin.signedInOnDevice'

function readDeviceFlag(): boolean {
  try {
    return localStorage.getItem(DEVICE_FLAG) === '1'
  } catch {
    return false
  }
}

function writeDeviceFlag(on: boolean): void {
  try {
    if (on) localStorage.setItem(DEVICE_FLAG, '1')
    else localStorage.removeItem(DEVICE_FLAG)
  } catch {
    // storage unavailable (private mode): the app just asks to sign in again
  }
}

interface Loaded {
  ready: boolean
  profile: Profile | null
  history: History
  active: ActiveSession | null
  dirtyCount: number
}

export function AppDataProvider({ children, database = defaultDb }: { children: ReactNode; database?: LockInDB }) {
  const [loaded, setLoaded] = useState<Loaded>({ ready: false, profile: null, history: EMPTY_HISTORY, active: null, dirtyCount: 0 })
  const [authChecked, setAuthChecked] = useState(supabase === null)
  const [signedIn, setSignedIn] = useState(supabase === null)
  const [deviceSignedIn, setDeviceSignedIn] = useState(() => supabase === null || readDeviceFlag())
  const [pullRaw, setPullRaw] = useState<PullState>(supabase === null ? 'done' : 'idle')
  // Without a live session (offline, token expired) the first pull cannot happen.
  const initialPull: PullState = pullRaw === 'idle' && authChecked && !signedIn ? 'failed' : pullRaw

  const markSignedIn = useCallback(() => {
    writeDeviceFlag(true)
    setDeviceSignedIn(true)
  }, [])

  const refresh = useCallback(async () => {
    const [profile, history, active, dirtyCount] = await Promise.all([
      getProfile(database), loadHistory(database), loadActive(database), countDirty(database),
    ])
    setLoaded({ ready: true, profile, history, active, dirtyCount })
  }, [database])

  const syncer = useMemo(
    () => (supabase ? createSyncer(database, supabaseRemote(supabase), () => void refresh()) : null),
    [database, refresh],
  )

  // Startup: finalize sessions older than 12 h, then load.
  useEffect(() => {
    void recoverStaleSession(database).then(refresh)
  }, [database, refresh])

  // Auth state (cloud mode only).
  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => {
      setSignedIn(data.session !== null)
      if (data.session) markSignedIn()
      setAuthChecked(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(session !== null)
      if (session) markSignedIn()
    })
    return () => data.subscription.unsubscribe()
  }, [markSignedIn])

  // While signed in: pull once, then push on reconnect and every minute.
  useEffect(() => {
    if (!supabase || !syncer || !signedIn) return
    const client = supabase
    let cancelled = false
    void (async () => {
      setPullRaw((p) => (p === 'done' ? p : 'pending'))
      try {
        await pullAll(database, supabaseRemote(client))
        if (!cancelled) setPullRaw('done')
      } catch (e) {
        console.warn('pull failed; working offline', e)
        if (!cancelled) setPullRaw((p) => (p === 'done' ? p : 'failed'))
      }
      await refresh()
      await syncer.syncNow()
    })()
    const tick = () => void syncer.syncNow()
    window.addEventListener('online', tick)
    const timer = window.setInterval(tick, 60_000)
    return () => {
      cancelled = true
      window.removeEventListener('online', tick)
      window.clearInterval(timer)
    }
  }, [database, refresh, signedIn, syncer])

  const afterWrite = useCallback(async () => {
    await refresh()
    if (syncer && signedIn) void syncer.syncNow()
  }, [refresh, signedIn, syncer])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return null
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return error.message
    markSignedIn()
    return null
  }, [markSignedIn])

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut()
    writeDeviceFlag(false)
    setDeviceSignedIn(false)
    await clearAll(database)
    await refresh()
  }, [database, refresh])

  const value: AppData = {
    db: database,
    ...loaded,
    mode: supabase ? 'cloud' : 'local',
    authChecked,
    signedIn,
    deviceSignedIn,
    initialPull,
    refresh,
    afterWrite,
    signIn,
    signOut,
    retryPull: () => window.location.reload(),
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAppData(): AppData {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAppData must be used inside AppDataProvider')
  return v
}

# Pocket Gains — M2 (Consistency) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Pocket Gains into a habit tool: a recommended-but-editable weekly plan, forgiving streaks with a weekly shield, a Progress tab with a calendar and per-exercise history, and daily push reminders in the pet's voice. First, clear the eight robustness "minors" deferred from the M1 review.

**Architecture:** Same shape as M1. New rules (dates, weekly plan, streaks, calendar grid, exercise history) are pure functions in `src/domain/` with unit tests. Plans are stored as dated snapshots in a new synced table, so changing your plan never rewrites past streak days. Reminders run server-side: a `pg_cron` job calls a Supabase Edge Function every 15 minutes. The function decides who is due, with the decision logic in a pure, unit-tested module, and sends Web Push. The service worker moves to vite-plugin-pwa's `injectManifest` strategy so it can show notifications, and app updates switch from silent auto-reload to an "Update" prompt that never interrupts a workout.

**Tech Stack:** as M1, plus workbox-precaching (custom service worker), web-push (VAPID key generation locally; sending inside the Edge Function via `npm:web-push`), `@supabase/server` (secret-key auth in the Edge Function), Supabase `pg_cron`, `pg_net` and Vault.

**Spec:** `docs/superpowers/specs/2026-09-29-lock-in-design.md` (M2 rows of §2, §6 end-early rules, §8 Streaks, §9 Reminders, §10)

## Global Constraints

- Everything in the M1 plan's Global Constraints still applies, with the base path and repo now `/pocket-gains/` / `pocket-gains`.
- **No Claude/AI attribution** in commit messages or PR text (repo owner's rule).
- Commit author is the configured git user; never change git identity.
- Dates for streaks, plans and the calendar use the **device's local calendar day**. The server uses `profile.timezone` for the same purpose.
- Weeks start on **Monday** (ISO week), both for the weekly shield and for the calendar grid.
- Never commit secrets: the Supabase **secret** key, the VAPID **private** key and the Vault values are set only through the Supabase CLI or dashboard. The VAPID **public** key is public (repo variable plus `.env.local`).
- Reminders are opt-in, cloud mode only, and sent **at most once per day**, plus an optional morning nudge.
- Tests run in local mode (no Supabase). Anything that needs a real backend is covered by a pure-function test plus an on-device check.

### Decisions beyond the spec (reviewers: intended)

| Topic | Decision | Why |
|---|---|---|
| Plan storage | `weekly_plan` rows are **dated snapshots** `{effectiveFrom, savedAt, days, isCustom}`. The plan for a date is the latest snapshot on or before it; before any custom snapshot (or after "Use recommended"), the recommended plan for that date's on-ramp stage applies | Editing your plan must not retroactively break or repair streak days |
| Recommended plans | 3 days (on-ramp): Mon Push · Wed Lower · Fri Pull. 4 days (target): Mon Push · Tue Lower · Thu Pull · Sat Lower | Spec's example rotation; each muscle ~2×/week at target |
| "Counted" day | A scheduled day counts if a complete/partial session that day has ≥ 1 **completed card**: an exercise with at least `settings.sets` non-pain sets with reps > 0 | Spec: "warm-up + ≥ 1 completed card", derived from `set_log` so it stays retroactive |
| Training on a rest day | Shown as a "bonus" day on the calendar; it neither extends nor breaks the streak | Spec: only scheduled days count |
| Today | Today can only add to the streak; it never breaks it (it's "pending" until midnight) | Avoids a false "streak lost" screen in the morning |
| Server knowledge of the plan | The client keeps `profile.reminderDays` (weekdays scheduled in the plan in effect today) up to date; the server reads only that | Keeps plan/streak logic in one place (client) |
| Morning nudge | Sent at 09:00–12:00 local if **yesterday was a reminder day with no session**, and the user hasn't trained yet today | Server-side approximation of "after a shield is used"; the server can't compute shields |
| Reminder window | Reminder is due from `reminderTime` until 23:00 local, once per day, skipped if a session already started that day | Survives missed cron runs; never nags after training |
| App updates | `registerType: 'prompt'` with an "Update" banner shown only on the tab screens | M1 minor: auto-update could reload mid-workout |
| Push subscription writes | `push_subscription` is written directly to Supabase (online) when reminders are switched on, not through the offline sync queue | A subscription is useless offline; simpler |

## Review Focus

1. **Midnight, DST and time-zone boundaries** → a session started 23:50 counts for that day; days are counted with calendar arithmetic (`setDate`), never by adding 24 h. Pinned in Task 6 (dates tests across a DST change) and Task 14 (`localParts` for a non-UTC zone).
2. **Changing the plan mid-week** → past days keep the plan that was in effect then; the new plan applies from today. Pinned in Task 6 (`planFor` snapshot tests) and Task 7 (streak unaffected by a later plan change).
3. **Brand-new user / onboarding mid-week** → no "missed" days before onboarding; streak 0 without errors; the calendar shows pre-onboarding days as blank. Pinned in Task 7.
4. **Push subscription expired or revoked (HTTP 404/410)** → the server deletes it and keeps going; one bad subscription never blocks other users. Pinned in Task 14 (handled in `index.ts`; delivery outcome checked on-device in Task 15).
5. **Notifications blocked or unsupported** → the reminder toggle stays off and explains how to fix it; nothing crashes. Pinned in Task 13 (`RemindersSection` tests).
6. **A failing save during a workout** (IndexedDB quota or closed DB) → the workout continues, an alert appears, and ending the session still reaches the summary. Pinned in Task 1.

## File Map

```
supabase/migrations/20261001000000_m2.sql        # weekly_plan, reminder columns, push_subscription, reminder_state, cron/net extensions
supabase/functions/send-reminders/index.ts       # Edge Function (Deno): load, decide, send, record
supabase/functions/send-reminders/due.ts         # pure decision logic (no Deno APIs)
supabase/functions/send-reminders/due.test.ts
scripts/setup-vapid.mjs                           # generates VAPID keys, sets secrets/variables without printing the private key
tsconfig.sw.json                                  # WebWorker types for src/sw.ts
src/sw.ts                                         # custom service worker: precache + push + notificationclick
src/domain/dates.ts            (+ .test.ts)       # local-day helpers, weekdays, ISO week keys
src/domain/plan.ts             (+ .test.ts)       # recommended plans, planFor(date), coverage warnings, reminder days
src/domain/streak.ts           (+ .test.ts)       # counted days, streak/best/shield, per-day status
src/domain/calendar.ts         (+ .test.ts)       # month grid
src/domain/exerciseHistory.ts  (+ .test.ts)       # per-exercise sessions, bests
src/domain/pet.ts                                 # + 'home_rest' lines
src/data/db.ts  repo.ts  sync.ts  remote.ts       # plans table, atomic set+active write, orphan finalization, LWW pull, stable paging
src/data/push.ts               (+ .test.ts)       # subscribe/unsubscribe Web Push
src/data/AppData.tsx                              # plans in context, robust recovery, reminderDays upkeep
src/ui/UpdateBanner.tsx        (+ .test.tsx)
src/ui/RemindersSection.tsx    (+ .test.tsx)
src/ui/MonthCalendar.tsx
src/ui/Sparkline.tsx
src/screens/HomeScreen.tsx  PlanScreen.tsx  ProgressScreen.tsx  ExerciseHistoryScreen.tsx  ProfileScreen.tsx  PlayScreen.tsx  OnboardingScreen.tsx
src/router.tsx
e2e/session.spec.ts                               # fixed clock (a Monday)
.github/workflows/deploy.yml  README.md
```

---

### Task 1: Workout saves never strand you (write-chain errors, atomic set + resume point)

**Files:**
- Modify: `src/data/repo.ts`, `src/data/repo.test.ts`, `src/screens/PlayScreen.tsx`, `src/screens/PlayScreen.test.tsx`

**Interfaces:**
- Consumes: M1 repo functions; `ActiveSession` (`src/domain/session.ts`).
- Produces: `logSetsAndSaveActive(db: PocketGainsDB, sessionId: string, drafts: SetLogDraft[], active: ActiveSession, at?: Date): Promise<void>`. It writes the sets and the resume point in one IndexedDB transaction.

- [ ] **Step 1: Write the failing repo test** (append to `src/data/repo.test.ts`, inside a new `describe`):

```ts
describe('logSetsAndSaveActive', () => {
  it('writes the set and the resume point together, or neither', async () => {
    const a = { ...active(0), phase: 'rest' as const, setNo: 2 }
    await logSetsAndSaveActive(db, 's1', [{ exerciseId: 'pushup', setNo: 1, reps: 9, weightKg: null, stoppedForPain: false }], a)
    expect((await loadHistory(db)).sets).toHaveLength(1)
    expect((await loadActive(db))?.setNo).toBe(2)

    vi.spyOn(db.kv, 'put').mockRejectedValueOnce(new Error('quota'))
    const b = { ...a, phase: 'set' as const }
    await expect(
      logSetsAndSaveActive(db, 's1', [{ exerciseId: 'pushup', setNo: 2, reps: 8, weightKg: null, stoppedForPain: false }], b),
    ).rejects.toThrow()
    expect((await loadHistory(db)).sets).toHaveLength(1)
    expect((await loadActive(db))?.phase).toBe('rest')
  })
})
```

Add `vi` to the `vitest` import and `logSetsAndSaveActive` to the `./repo` import.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/data/repo.test.ts`
Expected: FAIL — `logSetsAndSaveActive` is not exported.

- [ ] **Step 3: Implement in `src/data/repo.ts`** (after `loadActive`):

```ts
/** Sets and the resume point are saved atomically, so a crash can never resume "before" a logged set. */
export async function logSetsAndSaveActive(
  db: PocketGainsDB, sessionId: string, drafts: SetLogDraft[], active: ActiveSession, at = new Date(),
): Promise<void> {
  await db.transaction('rw', [db.sets, db.kv], async () => {
    if (drafts.length > 0) await addSetLogs(db, sessionId, drafts, at)
    await saveActive(db, active)
  })
}
```

- [ ] **Step 4: Run** `npx vitest run src/data/repo.test.ts` → PASS.

- [ ] **Step 5: Write the failing PlayScreen test** (append to `src/screens/PlayScreen.test.tsx`):

```tsx
describe('PlayScreen save failures', () => {
  it('keeps the workout going and still reaches the summary when a save fails', async () => {
    const db = await seeded()
    const user = userEvent.setup()
    renderRoutes(db, routes, ['/session/play'])
    await user.click(await screen.findByRole('button', { name: /Start first card/ }))
    await user.click(screen.getByRole('button', { name: /start set 1/i }))

    vi.spyOn(db.sets, 'bulkPut').mockRejectedValueOnce(new Error('quota'))
    await user.click(screen.getByRole('button', { name: /Log set/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/Couldn't save/)

    await user.click(screen.getByRole('button', { name: 'End session' }))
    await user.click(screen.getByRole('button', { name: /No time/ }))
    expect(await screen.findByText('SUMMARY')).toBeInTheDocument()
  })
})
```

Add `vi` to the `vitest` import.

- [ ] **Step 6: Run to verify failure**

Run: `npx vitest run src/screens/PlayScreen.test.tsx`
Expected: FAIL — no alert (the rejected write breaks the chain silently).

- [ ] **Step 7: Update `Player` in `src/screens/PlayScreen.tsx`**

Change the repo import to `import { addSetLogs, loadActive, logSetsAndSaveActive, saveActive, updateSession } from '../data/repo'`. Add state next to the others: `const [saveError, setSaveError] = useState(false)`. Replace the `writes.current = ...` block inside `dispatch` with:

```ts
      // Persist in order; a later write never overtakes an earlier one, and one failure never blocks the rest.
      writes.current = writes.current
        .then(async () => {
          if (next.phase === 'summary') {
            try {
              if (logs.length > 0) await addSetLogs(db, next.sessionId, logs)
              await updateSession(db, next.sessionId, {
                status: next.status, endReason: next.endReason, endedAt: new Date().toISOString(),
              })
              await saveActive(db, null)
            } finally {
              await afterWrite().catch(() => undefined)
              navigate(`/session/summary/${next.sessionId}`, { replace: true })
            }
          } else {
            await logSetsAndSaveActive(db, next.sessionId, logs, next)
            setSaveError(false)
          }
        })
        .catch((e: unknown) => {
          console.error('could not save workout step', e)
          setSaveError(true)
        })
```

In the returned JSX, directly under the `topbar` div, add:

```tsx
      {saveError && (
        <p role="alert" className="panel">
          Couldn't save the last step on this phone. Keep going: the next step saves again.
        </p>
      )}
```

- [ ] **Step 8: Run all tests**

Run: `npx vitest run && npm run typecheck && npm run lint`
Expected: all PASS; no new lint warnings.

- [ ] **Step 9: Commit**

```bash
git add src/data/repo.ts src/data/repo.test.ts src/screens/PlayScreen.tsx src/screens/PlayScreen.test.tsx
git commit -m "fix(play): keep workouts going when a save fails; save sets and resume point atomically"
```

---

### Task 2: Session recovery that can't hang startup, runs on resume, and finalizes orphans

**Files:**
- Modify: `src/data/repo.ts`, `src/data/repo.test.ts`, `src/data/AppData.tsx`
- Create: `src/data/AppData.recovery.test.tsx`

**Interfaces:**
- Produces:
  - `finalizeOrphans(db: PocketGainsDB, now?: number): Promise<number>`: `in_progress` sessions older than 12 h that are not the active session become `partial` (sets logged) or `abandoned`.
  - `recoverSessions(db: PocketGainsDB, now?: number): Promise<RecoveryResult>`: `recoverStaleSession`, then `finalizeOrphans`.

- [ ] **Step 1: Write the failing repo test** (append to `src/data/repo.test.ts`):

```ts
describe('finalizeOrphans', () => {
  it('finalizes old in-progress sessions that are not the active one (e.g. synced from another device)', async () => {
    await createSession(db, makeSession({ id: 'old-with-sets', startedAt: new Date(0).toISOString(), status: 'in_progress', endedAt: null }))
    await addSetLogs(db, 'old-with-sets', [{ exerciseId: 'pushup', setNo: 1, reps: 8, weightKg: null, stoppedForPain: false }])
    await createSession(db, makeSession({ id: 'old-empty', startedAt: new Date(0).toISOString(), status: 'in_progress', endedAt: null }))
    await createSession(db, makeSession({ id: 'recent', startedAt: new Date(13 * HOUR).toISOString(), status: 'in_progress', endedAt: null }))
    await createSession(db, makeSession({ id: 's1', startedAt: new Date(0).toISOString(), status: 'in_progress', endedAt: null }))
    await saveActive(db, active(0, 's1'))

    expect(await finalizeOrphans(db, 14 * HOUR)).toBe(2)
    const byId = Object.fromEntries((await loadHistory(db)).sessions.map((s) => [s.id, s.status]))
    expect(byId).toEqual({ 'old-with-sets': 'partial', 'old-empty': 'abandoned', recent: 'in_progress', s1: 'in_progress' })
  })
})
```

Add `finalizeOrphans` to the `./repo` import.

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/data/repo.test.ts` → FAIL (not exported).

- [ ] **Step 3: Implement in `src/data/repo.ts`** (after `recoverStaleSession`):

```ts
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
```

- [ ] **Step 4: Run** `npx vitest run src/data/repo.test.ts` → PASS.

- [ ] **Step 5: Write the failing provider test `src/data/AppData.recovery.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { makeProfile } from '../domain/testFixtures'
import { AppDataProvider, useAppData } from './AppData'
import { PocketGainsDB } from './db'
import { saveProfile } from './repo'

function Probe() {
  const { ready, profile } = useAppData()
  return <p>{ready ? `ready:${profile?.petName}` : 'loading'}</p>
}

describe('startup recovery', () => {
  it('still finishes loading when session recovery fails', async () => {
    const db = new PocketGainsDB(`test-${crypto.randomUUID()}`)
    await saveProfile(db, makeProfile({ petName: 'Mochi' }))
    vi.spyOn(db.kv, 'get').mockRejectedValueOnce(new Error('closed'))
    render(<AppDataProvider database={db}><Probe /></AppDataProvider>)
    expect(await screen.findByText('ready:Mochi')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Run to verify failure** — `npx vitest run src/data/AppData.recovery.test.tsx` → FAIL (stays "loading").

- [ ] **Step 7: Update `src/data/AppData.tsx`**

Replace `recoverStaleSession` with `recoverSessions` in the `./repo` import, and replace the startup effect with:

```tsx
  // Finalize sessions older than 12 h, at startup and whenever the app comes back to the foreground.
  // Recovery failing must never keep the app on "Loading…".
  useEffect(() => {
    const run = () => {
      void recoverSessions(database)
        .catch((e: unknown) => console.warn('session recovery failed', e))
        .finally(() => void refresh())
    }
    run()
    const onVisible = () => {
      if (document.visibilityState === 'visible') run()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [database, refresh])
```

- [ ] **Step 8: Run all tests** — `npx vitest run && npm run typecheck` → PASS.

- [ ] **Step 9: Commit**

```bash
git add src/data/repo.ts src/data/repo.test.ts src/data/AppData.tsx src/data/AppData.recovery.test.tsx
git commit -m "fix(data): recover sessions on resume, finalize orphaned sessions, never hang on recovery errors"
```

---

### Task 3: Sync hardening: stable paging and last-write-wins pulls

**Files:**
- Modify: `src/data/remote.ts`, `src/data/sync.ts`, `src/data/sync.test.ts`
- Create: `src/data/remote.test.ts`

**Interfaces:**
- Produces: `supabaseRemote(...).fetchAll` orders by the table's key; `pullAll` overwrites a clean local row only when the remote row is at least as new (`updatedAt`).

- [ ] **Step 1: Write the failing paging test `src/data/remote.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { supabaseRemote } from './remote'

function fakeClient(pages: number[]) {
  const calls: string[] = []
  let i = 0
  const client = {
    from: (table: string) => ({
      select: () => ({
        order: (col: string) => {
          calls.push(`${table}:order:${col}`)
          return {
            range: async (a: number, b: number) => {
              calls.push(`range:${a}-${b}`)
              return { data: Array.from({ length: pages[i++] }, (_, k) => ({ id: `${a + k}` })), error: null }
            },
          }
        },
      }),
    }),
  }
  return { client, calls }
}

describe('supabaseRemote.fetchAll', () => {
  it('pages in a stable order by primary key', async () => {
    const { client, calls } = fakeClient([1000, 3])
    const rows = await supabaseRemote(client as never).fetchAll('set_log')
    expect(rows).toHaveLength(1003)
    expect(calls).toEqual(['set_log:order:id', 'range:0-999', 'set_log:order:id', 'range:1000-1999'])
  })

  it('orders the profile table by user_id', async () => {
    const { client, calls } = fakeClient([1])
    await supabaseRemote(client as never).fetchAll('profile')
    expect(calls[0]).toBe('profile:order:user_id')
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/data/remote.test.ts` → FAIL (`order` is never called).

- [ ] **Step 3: Update `fetchAll` in `src/data/remote.ts`**

```ts
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
```

- [ ] **Step 4: Write the failing last-write-wins test** (append to the `pullAll` describe in `src/data/sync.test.ts`):

```ts
  it('does not overwrite a newer local row with an older remote copy (push/pull race)', async () => {
    await pushDirty(db, remote)
    // A concurrent push already sent this newer local version and cleared its dirty flag,
    // but the pull fetched the remote table just before that push landed.
    const id = '11111111-1111-4111-8111-111111111111'
    await updateSession(db, id, { status: 'partial', endReason: 'tired' })
    const local = (await db.sessions.get(id))!
    await db.sessions.put({ ...local, dirty: 0 })
    await pullAll(db, remote)
    expect((await db.sessions.get(id))?.status).toBe('partial')
  })
```

- [ ] **Step 5: Run to verify failure** — `npx vitest run src/data/sync.test.ts` → FAIL (status reverted to `complete`).

- [ ] **Step 6: Update `pullTable` in `src/data/sync.ts`**

```ts
      const local = await table.get(row.id)
      // Never overwrite unsynced edits, and never replace a newer local row with an older remote copy.
      if (!local || (local.dirty === 0 && row.updatedAt >= local.updatedAt)) await table.put(row)
```

- [ ] **Step 7: Run all tests** — `npx vitest run && npm run typecheck` → PASS.

- [ ] **Step 8: Commit**

```bash
git add src/data/remote.ts src/data/remote.test.ts src/data/sync.ts src/data/sync.test.ts
git commit -m "fix(sync): stable paging order and last-write-wins pulls"
```

---

### Task 4: "Sign in to sync" when the session has expired

**Files:**
- Modify: `src/screens/ProgressScreen.tsx`, `src/screens/ProgressScreen.test.tsx`

**Interfaces:**
- Produces: `syncStatusText(mode: 'local' | 'cloud', dirtyCount: number, needsSignIn?: boolean): string`.

- [ ] **Step 1: Write the failing test** (add to the `syncStatusText` describe):

```ts
  it('asks to sign in again when cloud sync has no live session', () => {
    expect(syncStatusText('cloud', 3, true)).toBe('● Not syncing: sign in again to back up your training')
  })
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/screens/ProgressScreen.test.tsx` → FAIL.

- [ ] **Step 3: Update `src/screens/ProgressScreen.tsx`**

```ts
export function syncStatusText(mode: 'local' | 'cloud', dirtyCount: number, needsSignIn = false): string {
  if (mode === 'local') return 'Local mode: your data stays on this device.'
  if (needsSignIn) return '● Not syncing: sign in again to back up your training'
  if (dirtyCount > 0) return `● Not synced yet (${dirtyCount} change${dirtyCount === 1 ? '' : 's'})`
  return '✓ All changes synced'
}
```

In `ProgressScreen`, read `authChecked` and `signedIn` from `useAppData()`, compute `const needsSignIn = mode === 'cloud' && authChecked && !signedIn`, pass it to `syncStatusText`, and render the link under the status line:

```tsx
      {needsSignIn && <Link className="btn btn-primary center-text" to="/login">Sign in to sync</Link>}
```

(Import `Link` from `react-router`. `LoginScreen` redirects home only when a live session exists, so it is reachable here.)

- [ ] **Step 4: Run** `npx vitest run && npm run typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/screens/ProgressScreen.tsx src/screens/ProgressScreen.test.tsx
git commit -m "feat(progress): prompt to sign in again when sync has no live session"
```

---

### Task 5: Custom service worker (push-ready) and an "Update" prompt instead of auto-reload

**Files:**
- Create: `src/sw.ts`, `tsconfig.sw.json`, `src/ui/UpdateBanner.tsx`, `src/ui/UpdateBanner.test.tsx`
- Modify: `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `src/router.tsx`, `src/theme.css`, `package.json`

**Interfaces:**
- Produces: a service worker that precaches the app and handles `push` (payload `{ title, body, tag?, url? }`) and `notificationclick`; `UpdateBanner` on the tab screens.

- [ ] **Step 1: Install**

```bash
npm install -D workbox-precaching workbox-core
```

- [ ] **Step 2: Create `src/sw.ts`**

```ts
/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// The page asks the waiting worker to take over when the user taps "Update".
self.addEventListener('message', (event) => {
  if ((event.data as { type?: string } | undefined)?.type === 'SKIP_WAITING') void self.skipWaiting()
})

interface PushPayload {
  title?: string
  body?: string
  tag?: string
  url?: string
}

self.addEventListener('push', (event) => {
  const data = (event.data?.json() ?? {}) as PushPayload
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Pocket Gains', {
      body: data.body,
      icon: 'pwa-192x192.png',
      badge: 'pwa-64x64.png',
      tag: data.tag ?? 'reminder',
      data: { url: data.url ?? self.registration.scope },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      if (windows[0]) {
        await windows[0].focus()
        return
      }
      await self.clients.openWindow((event.notification.data as { url: string }).url)
    })(),
  )
})
```

- [ ] **Step 3: Give the worker its own TypeScript project**

Create `tsconfig.sw.json`:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.sw.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023", "WebWorker"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "types": ["vite-plugin-pwa/info"],
    "skipLibCheck": true,
    "noEmit": true,
    "strict": true
  },
  "include": ["src/sw.ts"]
}
```

In `tsconfig.json`, add `{ "path": "./tsconfig.sw.json" }` to `references`. In `tsconfig.app.json`, add `"exclude": ["src/sw.ts"]` next to `"include"`, and add `"vite-plugin-pwa/react"` to `compilerOptions.types`. If `vite-plugin-pwa/info` doesn't declare `self.__WB_MANIFEST` in this version, add `declare global { interface ServiceWorkerGlobalScope { __WB_MANIFEST: Array<string | { url: string; revision: string | null }> } }` at the top of `sw.ts` instead of using that `types` entry. Check the vite-plugin-pwa docs (context7) for "injectManifest TypeScript".

- [ ] **Step 4: Switch the PWA plugin to `injectManifest` + `prompt`**

In `vite.config.ts`, replace the `VitePWA({...})` options head and `workbox` block:

```ts
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'exercises/*.jpg'],
      manifest: { /* unchanged */ },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,woff2}'],
      },
    }),
```

(Keep the existing `manifest` object exactly as it is.)

- [ ] **Step 5: Write the failing banner test `src/ui/UpdateBanner.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

const update = vi.fn(async () => undefined)
const dismiss = vi.fn()
let needRefresh = true
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({ needRefresh: [needRefresh, dismiss], offlineReady: [false, vi.fn()], updateServiceWorker: update }),
}))

const { UpdateBanner } = await import('./UpdateBanner')

describe('UpdateBanner', () => {
  it('offers the update and applies it only when asked', async () => {
    render(<UpdateBanner />)
    expect(screen.getByRole('status')).toHaveTextContent(/new version/)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Update' }))
    expect(update).toHaveBeenCalledWith(true)
  })

  it('can be postponed, and renders nothing when there is no update', async () => {
    const { unmount } = render(<UpdateBanner />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Later' }))
    expect(dismiss).toHaveBeenCalledWith(false)
    unmount()
    needRefresh = false
    const { container } = render(<UpdateBanner />)
    expect(container).toBeEmptyDOMElement()
  })
})
```

- [ ] **Step 6: Run to verify failure** — `npx vitest run src/ui/UpdateBanner.test.tsx` → FAIL (cannot resolve `./UpdateBanner`).

- [ ] **Step 7: Create `src/ui/UpdateBanner.tsx`**

```tsx
import { useRegisterSW } from 'virtual:pwa-register/react'

/** Shown only on the tab screens, so an update never reloads the app in the middle of a workout. */
export function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()
  if (!needRefresh) return null
  return (
    <div className="update-banner" role="status">
      <span>A new version of Pocket Gains is ready.</span>
      <div className="row">
        <button className="btn btn-primary" onClick={() => void updateServiceWorker(true)}>Update</button>
        <button className="btn btn-ghost" onClick={() => setNeedRefresh(false)}>Later</button>
      </div>
    </div>
  )
}
```

Append to `src/theme.css`:

```css
.update-banner { position: fixed; left: 12px; right: 12px; bottom: calc(76px + env(safe-area-inset-bottom)); z-index: 5; background: var(--surface); border: 1px solid var(--accent); border-radius: var(--radius); padding: 12px; display: flex; flex-direction: column; gap: 8px; max-width: 496px; margin: 0 auto; }
```

In `src/router.tsx`, import `UpdateBanner` and render it inside `TabLayout`, after `<Outlet />`.

- [ ] **Step 8: Run tests, typecheck, build**

Run: `npx vitest run && npm run typecheck && npm run lint && npm run build`
Expected: all PASS. `dist/sw.js` exists, and `grep -c "showNotification" dist/sw.js` prints ≥ 1.

- [ ] **Step 9: E2E still passes** — `npm run e2e` → 3 passed.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(pwa): custom service worker with push handling; prompt before applying updates"
```

---

### Task 6: Local-day helpers and the weekly plan

**Files:**
- Create: `src/domain/dates.ts`, `src/domain/dates.test.ts`, `src/domain/plan.ts`, `src/domain/plan.test.ts`

**Interfaces:**
- Consumes: `recommendDefaults` (M1 `defaults.ts`); `Deck`, `History`, `Profile` (M1 types); test fixtures.
- Produces:
  - `type Weekday = 'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun'`, `WEEKDAYS`, `WEEKDAY_LABELS: Record<Weekday, string>`
  - `startOfDay(d: Date): Date`, `addDays(d: Date, n: number): Date` (local midnight, DST-safe), `dateKey(d: Date): string` (`YYYY-MM-DD`, local), `fromKey(k: string): Date`, `weekdayOf(d: Date): Weekday`, `weekKey(d: Date): string` (dateKey of that week's Monday)
  - `type PlanDays = Record<Weekday, string | null>` (deck id or rest)
  - `interface PlanSnapshot { id: string; effectiveFrom: string; savedAt: string; days: PlanDays; isCustom: boolean }`
  - `REST_WEEK: PlanDays`, `recommendedDays(daysPerWeek: number): PlanDays`
  - `interface PlanContext { profile: Profile; history: History; plans: PlanSnapshot[] }`
  - `planFor(date: Date, ctx: PlanContext): { days: PlanDays; isCustom: boolean }`
  - `plannedDeckId(date: Date, ctx: PlanContext): string | null`
  - `trainingDays(days: PlanDays): Weekday[]`
  - `coverageWarnings(days: PlanDays, decks: Deck[]): string[]`

- [ ] **Step 1: Write the failing tests `src/domain/dates.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { addDays, dateKey, fromKey, weekKey, weekdayOf } from './dates'

describe('dates', () => {
  it('formats and parses local calendar days', () => {
    const d = new Date(2026, 0, 5, 23, 50)
    expect(dateKey(d)).toBe('2026-01-05')
    expect(dateKey(fromKey('2026-01-05'))).toBe('2026-01-05')
  })

  it('addDays walks calendar days with no gaps or repeats, including across DST changes', () => {
    let d = new Date(2026, 0, 1, 12)
    const seen = new Set<string>()
    for (let i = 0; i < 400; i++) {
      const next = addDays(d, 1)
      expect(next.getHours()).toBe(0)
      seen.add(dateKey(next))
      expect(fromKey(dateKey(next)).getTime() - fromKey(dateKey(d)).getTime()).toBeGreaterThan(20 * 3_600_000)
      d = next
    }
    expect(seen.size).toBe(400)
  })

  it('weekdays and ISO weeks start on Monday', () => {
    expect(weekdayOf(new Date(2026, 0, 5))).toBe('mon')
    expect(weekdayOf(new Date(2026, 0, 11))).toBe('sun')
    expect(weekKey(new Date(2026, 0, 11, 22))).toBe('2026-01-05')
    expect(weekKey(new Date(2026, 0, 12))).toBe('2026-01-12')
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/domain/dates.test.ts` → FAIL (cannot resolve).

- [ ] **Step 3: Implement `src/domain/dates.ts`**

```ts
export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export const WEEKDAYS: readonly Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
}

const pad = (n: number) => String(n).padStart(2, '0')

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Calendar arithmetic (never +24 h), so DST changes can't skip or repeat a day. */
export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromKey(k: string): Date {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function weekdayOf(d: Date): Weekday {
  return WEEKDAYS[(d.getDay() + 6) % 7]
}

/** dateKey of the Monday that starts d's ISO week. */
export function weekKey(d: Date): string {
  return dateKey(addDays(d, -((d.getDay() + 6) % 7)))
}
```

- [ ] **Step 4: Run** `npx vitest run src/domain/dates.test.ts` → PASS.

- [ ] **Step 5: Write the failing tests `src/domain/plan.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { content } from '../content'
import { coverageWarnings, planFor, plannedDeckId, recommendedDays, REST_WEEK, trainingDays, type PlanSnapshot } from './plan'
import { makeHistory, makeProfile } from './testFixtures'

const snap = (o: Partial<PlanSnapshot>): PlanSnapshot => ({
  id: crypto.randomUUID(), effectiveFrom: '2026-01-12', savedAt: '2026-01-12T10:00:00.000Z',
  days: { ...REST_WEEK, wed: 'push', sat: 'pull' }, isCustom: true, ...o,
})

describe('recommended plans', () => {
  it('3 days on the on-ramp, 4 at target, using real deck ids', () => {
    expect(trainingDays(recommendedDays(3))).toEqual(['mon', 'wed', 'fri'])
    expect(recommendedDays(4)).toMatchObject({ mon: 'push', tue: 'lower', thu: 'pull', sat: 'lower' })
    const ids = new Set(content.decks.map((d) => d.id))
    for (const n of [3, 4]) for (const id of Object.values(recommendedDays(n))) if (id) expect(ids.has(id)).toBe(true)
  })
})

describe('planFor', () => {
  const ctx = (plans: PlanSnapshot[] = [], experience: 'new' | 'consistent' = 'consistent') => ({
    profile: makeProfile({ experience }), history: makeHistory(), plans,
  })

  it('follows the on-ramp: 3 days for a new user in week 1, 4 days at target', () => {
    expect(trainingDays(planFor(new Date(2026, 0, 6), ctx([], 'new')).days)).toHaveLength(3)
    expect(trainingDays(planFor(new Date(2026, 0, 6), ctx()).days)).toHaveLength(4)
  })

  it('a custom plan applies from its date; earlier days keep the plan in effect then', () => {
    const c = ctx([snap({})])
    expect(plannedDeckId(new Date(2026, 0, 5), c)).toBe('push') // Mon before the change: recommended
    expect(plannedDeckId(new Date(2026, 0, 12), c)).toBeNull() // Mon after: custom rest
    expect(plannedDeckId(new Date(2026, 0, 14), c)).toBe('push') // Wed after: custom
    expect(planFor(new Date(2026, 0, 14), c).isCustom).toBe(true)
  })

  it('"use recommended" reverts from its own date, and the latest save on a day wins', () => {
    const c = ctx([
      snap({}),
      snap({ effectiveFrom: '2026-01-19', savedAt: '2026-01-19T08:00:00.000Z', days: { ...REST_WEEK, fri: 'lower' } }),
      snap({ effectiveFrom: '2026-01-19', savedAt: '2026-01-19T09:00:00.000Z', isCustom: false }),
    ])
    expect(plannedDeckId(new Date(2026, 0, 14), c)).toBe('push')
    expect(planFor(new Date(2026, 0, 19), c).isCustom).toBe(false)
    expect(plannedDeckId(new Date(2026, 0, 19), c)).toBe('push')
  })
})

describe('coverageWarnings', () => {
  it('flags missing decks and too few days, and is quiet for the recommended plan', () => {
    expect(coverageWarnings(recommendedDays(4), content.decks)).toEqual([])
    const w = coverageWarnings({ ...REST_WEEK, mon: 'push' }, content.decks)
    expect(w.some((x) => /2\+ days/.test(x))).toBe(true)
    expect(w.some((x) => x.startsWith('Upper Body: Pull + Arms'))).toBe(true)
    expect(coverageWarnings(REST_WEEK, content.decks)[0]).toMatch(/No training days/)
  })
})
```

- [ ] **Step 6: Run to verify failure** — `npx vitest run src/domain/plan.test.ts` → FAIL.

- [ ] **Step 7: Implement `src/domain/plan.ts`**

```ts
import { WEEKDAYS, dateKey, weekdayOf, type Weekday } from './dates'
import { recommendDefaults } from './defaults'
import type { Deck, History, Profile } from './types'

export type PlanDays = Record<Weekday, string | null>

export interface PlanSnapshot {
  id: string
  /** local dateKey the plan applies from */
  effectiveFrom: string
  savedAt: string
  days: PlanDays
  /** false = "use the recommended plan from effectiveFrom" (days are ignored) */
  isCustom: boolean
}

export const REST_WEEK: PlanDays = { mon: null, tue: null, wed: null, thu: null, fri: null, sat: null, sun: null }

/** Each muscle ~2×/week at 4 days (Schoenfeld et al., 2016); a gentler 3-day rotation on the on-ramp. */
export function recommendedDays(daysPerWeek: number): PlanDays {
  if (daysPerWeek <= 3) return { ...REST_WEEK, mon: 'push', wed: 'lower', fri: 'pull' }
  return { ...REST_WEEK, mon: 'push', tue: 'lower', thu: 'pull', sat: 'lower' }
}

export interface PlanContext {
  profile: Profile
  history: History
  plans: PlanSnapshot[]
}

export function planFor(date: Date, ctx: PlanContext): { days: PlanDays; isCustom: boolean } {
  const key = dateKey(date)
  const snap = ctx.plans
    .filter((p) => p.effectiveFrom <= key)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || b.savedAt.localeCompare(a.savedAt))[0]
  if (snap?.isCustom) return { days: snap.days, isCustom: true }
  return { days: recommendedDays(recommendDefaults(ctx.profile, ctx.history, date).daysPerWeek), isCustom: false }
}

export function plannedDeckId(date: Date, ctx: PlanContext): string | null {
  return planFor(date, ctx).days[weekdayOf(date)]
}

export function trainingDays(days: PlanDays): Weekday[] {
  return WEEKDAYS.filter((w) => days[w] !== null)
}

export function coverageWarnings(days: PlanDays, decks: Deck[]): string[] {
  const n = trainingDays(days).length
  if (n === 0) return ['No training days yet. Pick at least 2.']
  const warnings: string[] = []
  if (n < 2) warnings.push('One day a week is a start, but 2+ days trains each muscle often enough to grow.')
  for (const deck of decks) {
    if (!WEEKDAYS.some((w) => days[w] === deck.id)) warnings.push(`${deck.name} isn't in your week, so those muscles won't get trained.`)
  }
  return warnings
}
```

- [ ] **Step 8: Run** `npx vitest run src/domain && npm run typecheck` → PASS.

- [ ] **Step 9: Commit**

```bash
git add src/domain/dates.ts src/domain/dates.test.ts src/domain/plan.ts src/domain/plan.test.ts
git commit -m "feat(domain): local-day helpers and dated weekly plans with recommended defaults"
```

---

### Task 7: Streaks with a weekly shield, and the month calendar grid

**Files:**
- Create: `src/domain/streak.ts`, `src/domain/streak.test.ts`, `src/domain/calendar.ts`, `src/domain/calendar.test.ts`

**Interfaces:**
- Consumes: Task 6; `countsForXp` (M1 `pet.ts`).
- Produces:
  - `type DayStatus = 'done' | 'shielded' | 'missed' | 'rest' | 'bonus' | 'pending'`
  - `interface DayInfo { key: string; status: DayStatus; deckId: string | null }`
  - `interface StreakInfo { current: number; best: number; shieldAvailable: boolean; days: Map<string, DayInfo> }`
  - `countedDays(history: History): Set<string>` (local dateKeys)
  - `streakInfo(ctx: PlanContext, today: Date): StreakInfo`
  - `interface CalendarCell { key: string; day: number; inMonth: boolean; status: DayStatus | 'future' | 'none'; deckId: string | null }`
  - `monthGrid(year: number, month: number, info: StreakInfo, today: Date, plannedAt: (d: Date) => string | null): CalendarCell[][]` (`month` is 0-based; weeks start Monday)

- [ ] **Step 1: Write the failing tests `src/domain/streak.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { dateKey } from './dates'
import { REST_WEEK, type PlanSnapshot } from './plan'
import { countedDays, streakInfo } from './streak'
import { makeHistory, makeProfile, makeSession, makeSet } from './testFixtures'
import type { History } from './types'

// "consistent" user onboarded Mon 2026-01-05 -> recommended 4-day plan: Mon push, Tue lower, Thu pull, Sat lower
const profile = makeProfile({ experience: 'consistent', onboardedAt: new Date(2026, 0, 5, 8).toISOString() })
const day = (d: number) => new Date(2026, 0, d, 12)

function trained(days: number[], o: { sets?: number; setsNeeded?: number; status?: 'complete' | 'partial' } = {}): History {
  const sessions = days.map((d) => makeSession({
    id: `s${d}`, startedAt: day(d).toISOString(), status: o.status ?? 'complete',
    settings: { sets: o.setsNeeded ?? 1, cards: 1, rir: [1, 3], restSec: null, repRange: null },
  }))
  const sets = days.flatMap((d) => Array.from({ length: o.sets ?? 1 }, (_, i) => makeSet({ sessionId: `s${d}`, setNo: i + 1 })))
  return makeHistory({ sessions, sets })
}
const run = (history: History, today: number, plans: PlanSnapshot[] = []) => streakInfo({ profile, history, plans }, day(today))
const status = (info: ReturnType<typeof run>, d: number) => info.days.get(dateKey(day(d)))?.status

describe('countedDays', () => {
  it('needs at least one completed card; warm-up-only or unfinished cards do not count', () => {
    expect(countedDays(trained([5]))).toEqual(new Set(['2026-01-05']))
    expect(countedDays(trained([5], { sets: 1, setsNeeded: 3, status: 'partial' })).size).toBe(0)
    expect(countedDays(makeHistory({ sessions: [makeSession({ id: 'w', startedAt: day(5).toISOString(), status: 'partial' })] })).size).toBe(0)
  })
})

describe('streakInfo', () => {
  it('a brand-new user has no streak and nothing missed', () => {
    const info = run(makeHistory(), 5)
    expect(info).toMatchObject({ current: 0, best: 0, shieldAvailable: true })
    expect(status(info, 5)).toBe('pending')
    expect(info.days.has(dateKey(day(4)))).toBe(false)
  })

  it('counts consecutive scheduled days; rest days are neutral', () => {
    const info = run(trained([5, 6, 8, 10]), 11)
    expect(info.current).toBe(4)
    expect(status(info, 7)).toBe('rest')
  })

  it('one missed scheduled day per week is covered by the shield', () => {
    const info = run(trained([5, 8, 10]), 11)
    expect(info.current).toBe(3)
    expect(status(info, 6)).toBe('shielded')
    expect(info.shieldAvailable).toBe(false)
  })

  it('a second miss in the same week resets the streak', () => {
    const info = run(trained([5, 10]), 11)
    expect(status(info, 6)).toBe('shielded')
    expect(status(info, 8)).toBe('missed')
    expect(info.current).toBe(1)
    expect(info.best).toBe(1)
  })

  it('each week gets a fresh shield', () => {
    const info = run(trained([5, 8, 10, 12, 15, 17]), 18)
    expect(status(info, 6)).toBe('shielded')
    expect(status(info, 13)).toBe('shielded')
    expect(info.current).toBe(6)
  })

  it('today never breaks the streak before it is over', () => {
    const info = run(trained([5]), 6)
    expect(status(info, 6)).toBe('pending')
    expect(info.current).toBe(1)
  })

  it('training on a rest day is a bonus, not a streak day', () => {
    const info = run(trained([5, 7]), 7)
    expect(status(info, 7)).toBe('bonus')
    expect(info.current).toBe(1)
  })

  it('changing the plan later does not rewrite past days', () => {
    const later: PlanSnapshot = {
      id: 'p', effectiveFrom: '2026-01-12', savedAt: '2026-01-12T09:00:00.000Z', days: { ...REST_WEEK, wed: 'push' }, isCustom: true,
    }
    const before = run(trained([5, 6, 8, 10]), 11)
    const after = run(trained([5, 6, 8, 10]), 11, [later])
    expect(after.current).toBe(before.current)
    expect([...after.days.values()]).toEqual([...before.days.values()])
  })
})
```

- [ ] **Step 2: Write the failing tests `src/domain/calendar.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { monthGrid } from './calendar'
import type { StreakInfo } from './streak'

const info: StreakInfo = {
  current: 1, best: 1, shieldAvailable: true,
  days: new Map([
    ['2026-01-05', { key: '2026-01-05', status: 'done', deckId: 'push' }],
    ['2026-01-06', { key: '2026-01-06', status: 'pending', deckId: 'lower' }],
  ]),
}

describe('monthGrid', () => {
  it('builds Monday-first weeks covering the whole month', () => {
    const grid = monthGrid(2026, 0, info, new Date(2026, 0, 6, 9), (d) => (d.getDay() === 4 ? 'pull' : null))
    expect(grid).toHaveLength(5)
    expect(grid[0][0]).toMatchObject({ key: '2025-12-29', inMonth: false, status: 'none' })
    expect(grid[4][6].key).toBe('2026-02-01')
    const cells = grid.flat()
    expect(cells.find((c) => c.key === '2026-01-05')).toMatchObject({ status: 'done', deckId: 'push', day: 5, inMonth: true })
    expect(cells.find((c) => c.key === '2026-01-08')).toMatchObject({ status: 'future', deckId: 'pull' })
    expect(cells.find((c) => c.key === '2026-01-07')).toMatchObject({ status: 'future', deckId: null })
  })
})
```

- [ ] **Step 3: Run to verify failure** — `npx vitest run src/domain/streak.test.ts src/domain/calendar.test.ts` → FAIL.

- [ ] **Step 4: Implement `src/domain/streak.ts`**

```ts
import { addDays, dateKey, startOfDay, weekKey } from './dates'
import { countsForXp } from './pet'
import { plannedDeckId, type PlanContext } from './plan'
import type { History } from './types'

export type DayStatus = 'done' | 'shielded' | 'missed' | 'rest' | 'bonus' | 'pending'

export interface DayInfo {
  key: string
  status: DayStatus
  deckId: string | null
}

export interface StreakInfo {
  current: number
  best: number
  shieldAvailable: boolean
  days: Map<string, DayInfo>
}

/** Local days with a finished session that completed at least one card (all its sets, no pain stop). */
export function countedDays(history: History): Set<string> {
  const out = new Set<string>()
  for (const s of history.sessions) {
    if (s.status !== 'complete' && s.status !== 'partial') continue
    const perExercise = new Map<string, number>()
    for (const set of history.sets) {
      if (set.sessionId === s.id && countsForXp(set)) perExercise.set(set.exerciseId, (perExercise.get(set.exerciseId) ?? 0) + 1)
    }
    if ([...perExercise.values()].some((n) => n >= s.settings.sets)) out.add(dateKey(new Date(s.startedAt)))
  }
  return out
}

export function streakInfo(ctx: PlanContext, today: Date): StreakInfo {
  const counted = countedDays(ctx.history)
  const todayKey = dateKey(today)
  const shieldWeeks = new Set<string>()
  const days = new Map<string, DayInfo>()
  let current = 0
  let best = 0
  for (let d = startOfDay(new Date(ctx.profile.onboardedAt)); dateKey(d) <= todayKey; d = addDays(d, 1)) {
    const key = dateKey(d)
    const deckId = plannedDeckId(d, ctx)
    const done = counted.has(key)
    let status: DayStatus
    if (deckId === null) status = done ? 'bonus' : 'rest'
    else if (done) {
      status = 'done'
      current++
    } else if (key === todayKey) status = 'pending'
    else if (!shieldWeeks.has(weekKey(d))) {
      shieldWeeks.add(weekKey(d))
      status = 'shielded'
    } else {
      status = 'missed'
      current = 0
    }
    best = Math.max(best, current)
    days.set(key, { key, status, deckId })
  }
  return { current, best, shieldAvailable: !shieldWeeks.has(weekKey(today)), days }
}
```

- [ ] **Step 5: Implement `src/domain/calendar.ts`**

```ts
import { addDays, dateKey } from './dates'
import type { DayStatus, StreakInfo } from './streak'

export interface CalendarCell {
  key: string
  day: number
  inMonth: boolean
  status: DayStatus | 'future' | 'none'
  deckId: string | null
}

export function monthGrid(
  year: number, month: number, info: StreakInfo, today: Date, plannedAt: (d: Date) => string | null,
): CalendarCell[][] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const start = addDays(first, -((first.getDay() + 6) % 7))
  const end = addDays(last, 6 - ((last.getDay() + 6) % 7))
  const todayKey = dateKey(today)
  const cells: CalendarCell[] = []
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const key = dateKey(d)
    const known = info.days.get(key)
    const inMonth = d.getMonth() === month
    if (known) cells.push({ key, day: d.getDate(), inMonth, status: known.status, deckId: known.deckId })
    else if (key > todayKey) cells.push({ key, day: d.getDate(), inMonth, status: 'future', deckId: plannedAt(d) })
    else cells.push({ key, day: d.getDate(), inMonth, status: 'none', deckId: null })
  }
  const weeks: CalendarCell[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}
```

- [ ] **Step 6: Run** `npx vitest run src/domain && npm run typecheck` → PASS.

- [ ] **Step 7: Commit**

```bash
git add src/domain/streak.ts src/domain/streak.test.ts src/domain/calendar.ts src/domain/calendar.test.ts
git commit -m "feat(domain): streaks with a weekly shield and a Monday-first month grid"
```

---

### Task 8: Per-exercise history and rest-day pet lines

**Files:**
- Create: `src/domain/exerciseHistory.ts`, `src/domain/exerciseHistory.test.ts`
- Modify: `src/domain/pet.ts`, `src/domain/pet.test.ts`

**Interfaces:**
- Produces:
  - `interface ExerciseEntry { sessionId: string; startedAt: string; sets: { reps: number; weightKg: number | null }[]; bestReps: number; bestWeight: number | null }`
  - `exerciseHistory(exerciseId: string, history: History): ExerciseEntry[]` (newest first; finished, non-abandoned sessions; XP-counting sets only)
  - `interface TrainedExercise { exerciseId: string; sessions: number; lastAt: string }`
  - `trainedExercises(history: History): TrainedExercise[]` (most recent first)
  - `PetMoment` gains `'home_rest'`

- [ ] **Step 1: Write the failing tests `src/domain/exerciseHistory.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { exerciseHistory, trainedExercises } from './exerciseHistory'
import { makeHistory, makeSession, makeSet } from './testFixtures'

const h = makeHistory({
  sessions: [
    makeSession({ id: 'a', startedAt: '2026-01-05T09:00:00.000Z' }),
    makeSession({ id: 'b', startedAt: '2026-01-08T09:00:00.000Z', status: 'partial', endReason: 'tired' }),
    makeSession({ id: 'c', startedAt: '2026-01-09T09:00:00.000Z', status: 'abandoned' }),
    makeSession({ id: 'd', startedAt: '2026-01-10T09:00:00.000Z', status: 'in_progress' }),
  ],
  sets: [
    makeSet({ sessionId: 'a', exerciseId: 'db-curl', setNo: 2, reps: 9, weightKg: 8 }),
    makeSet({ sessionId: 'a', exerciseId: 'db-curl', setNo: 1, reps: 10, weightKg: 8 }),
    makeSet({ sessionId: 'b', exerciseId: 'db-curl', setNo: 1, reps: 8, weightKg: 10 }),
    makeSet({ sessionId: 'b', exerciseId: 'db-curl', setNo: 2, reps: 3, weightKg: 10, stoppedForPain: true }),
    makeSet({ sessionId: 'b', exerciseId: 'pushup', setNo: 1, reps: 12 }),
    makeSet({ sessionId: 'c', exerciseId: 'db-curl', setNo: 1, reps: 20, weightKg: 12 }),
    makeSet({ sessionId: 'd', exerciseId: 'db-curl', setNo: 1, reps: 20, weightKg: 12 }),
  ],
})

describe('exerciseHistory', () => {
  it('lists finished sessions newest first with ordered sets and bests, ignoring pain stops', () => {
    expect(exerciseHistory('db-curl', h)).toEqual([
      { sessionId: 'b', startedAt: '2026-01-08T09:00:00.000Z', sets: [{ reps: 8, weightKg: 10 }], bestReps: 8, bestWeight: 10 },
      { sessionId: 'a', startedAt: '2026-01-05T09:00:00.000Z', sets: [{ reps: 10, weightKg: 8 }, { reps: 9, weightKg: 8 }], bestReps: 10, bestWeight: 8 },
    ])
  })

  it('bodyweight exercises have no best weight', () => {
    expect(exerciseHistory('pushup', h)[0].bestWeight).toBeNull()
  })
})

describe('trainedExercises', () => {
  it('summarizes each trained exercise, most recent first', () => {
    expect(trainedExercises(h)).toEqual([
      { exerciseId: 'db-curl', sessions: 2, lastAt: '2026-01-08T09:00:00.000Z' },
      { exerciseId: 'pushup', sessions: 1, lastAt: '2026-01-08T09:00:00.000Z' },
    ])
  })
})
```

Append to `src/domain/pet.test.ts`, inside `describe('petLine', ...)`:

```ts
  it('has rest-day lines', () => {
    expect(petLine('home_rest', 'x')).toMatch(/rest|recover/i)
  })
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/domain/exerciseHistory.test.ts src/domain/pet.test.ts` → FAIL.

- [ ] **Step 3: Implement `src/domain/exerciseHistory.ts`**

```ts
import { countsForXp } from './pet'
import type { History } from './types'

export interface ExerciseEntry {
  sessionId: string
  startedAt: string
  sets: { reps: number; weightKg: number | null }[]
  bestReps: number
  bestWeight: number | null
}

export interface TrainedExercise {
  exerciseId: string
  sessions: number
  lastAt: string
}

function finished(history: History) {
  return history.sessions
    .filter((s) => s.status === 'complete' || s.status === 'partial')
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

export function exerciseHistory(exerciseId: string, history: History): ExerciseEntry[] {
  const out: ExerciseEntry[] = []
  for (const s of finished(history)) {
    const sets = history.sets
      .filter((x) => x.sessionId === s.id && x.exerciseId === exerciseId && countsForXp(x))
      .sort((a, b) => a.setNo - b.setNo)
    if (sets.length === 0) continue
    const weights = sets.map((x) => x.weightKg).filter((w): w is number => w !== null)
    out.push({
      sessionId: s.id,
      startedAt: s.startedAt,
      sets: sets.map((x) => ({ reps: x.reps, weightKg: x.weightKg })),
      bestReps: Math.max(...sets.map((x) => x.reps)),
      bestWeight: weights.length > 0 ? Math.max(...weights) : null,
    })
  }
  return out
}

export function trainedExercises(history: History): TrainedExercise[] {
  const byId = new Map<string, TrainedExercise>()
  for (const s of finished(history)) {
    const ids = new Set(history.sets.filter((x) => x.sessionId === s.id && countsForXp(x)).map((x) => x.exerciseId))
    for (const id of ids) {
      const cur = byId.get(id)
      if (cur) cur.sessions++
      else byId.set(id, { exerciseId: id, sessions: 1, lastAt: s.startedAt })
    }
  }
  return [...byId.values()].sort((a, b) => b.lastAt.localeCompare(a.lastAt))
}
```

(`finished()` is newest-first, so the first session seen for an exercise sets `lastAt`.)

- [ ] **Step 4: Add rest-day lines in `src/domain/pet.ts`**

Change the union to `export type PetMoment = 'home_fresh' | 'home_trained_today' | 'home_rest' | 'summary_complete' | 'summary_partial' | 'level_up'` and add to `LINES`:

```ts
  home_rest: [
    'Rest day! Muscles grow while we chill 😌',
    'Recovery is part of the plan. See you next session!',
    'Rest day: stretch, drink water, sleep well 💤',
  ],
```

- [ ] **Step 5: Run** `npx vitest run src/domain && npm run typecheck` → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/domain/exerciseHistory.ts src/domain/exerciseHistory.test.ts src/domain/pet.ts src/domain/pet.test.ts
git commit -m "feat(domain): per-exercise history and rest-day pet lines"
```

---

### Task 9: Data layer: plans table, reminder settings, sync, and the M2 migration

**Files:**
- Create: `supabase/migrations/20261001000000_m2.sql`
- Modify: `src/domain/types.ts`, `src/domain/testFixtures.ts`, `src/data/db.ts`, `src/data/repo.ts`, `src/data/repo.test.ts`, `src/data/remote.ts`, `src/data/sync.ts`, `src/data/sync.test.ts`, `src/screens/OnboardingScreen.tsx`

**Interfaces:**
- Consumes: `PlanDays`, `PlanSnapshot` (Task 6); `Weekday`, `dateKey` (Task 6).
- Produces:
  - `Profile` gains `reminderEnabled: boolean`, `reminderTime: string` (`HH:MM`), `nudgeEnabled: boolean`, `reminderDays: Weekday[]`
  - `LocalPlan = PlanSnapshot & SyncMeta`; Dexie table `plans`
  - `loadPlans(db): Promise<PlanSnapshot[]>`, `savePlan(db, days: PlanDays, isCustom: boolean, today?: Date): Promise<PlanSnapshot>`
  - `RemoteTable` gains `'weekly_plan'`; sync pushes and pulls plans after soreness

- [ ] **Step 1: Write the migration `supabase/migrations/20261001000000_m2.sql`**

```sql
-- M2: weekly plans, reminder settings, push subscriptions, reminder bookkeeping, scheduler extensions.

alter table public.profile
  add column reminder_enabled boolean not null default false,
  add column reminder_time time not null default '18:00',
  add column nudge_enabled boolean not null default false,
  add column reminder_days text[] not null default '{}';

create table public.weekly_plan (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  effective_from date not null,
  saved_at timestamptz not null,
  days jsonb not null,
  is_custom boolean not null,
  updated_at timestamptz not null default now()
);
alter table public.weekly_plan enable row level security;
create policy "owner only" on public.weekly_plan
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table public.push_subscription (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscription enable row level security;
create policy "owner only" on public.push_subscription
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Written only by the send-reminders Edge Function (secret key); no client policies on purpose.
create table public.reminder_state (
  user_id uuid primary key references auth.users on delete cascade,
  last_reminded_on date,
  last_nudged_on date
);
alter table public.reminder_state enable row level security;

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
```

- [ ] **Step 2: Extend the types and fixtures**

In `src/domain/types.ts`, add `import type { Weekday } from './dates'` at the top, and add to `Profile` (after `petColor`):

```ts
  reminderEnabled: boolean
  /** local time, HH:MM */
  reminderTime: string
  nudgeEnabled: boolean
  /** weekdays scheduled in the plan in effect today; kept current by the app for the reminder server */
  reminderDays: Weekday[]
```

In `makeProfile` (`src/domain/testFixtures.ts`), add `reminderEnabled: false, reminderTime: '18:00', nudgeEnabled: false, reminderDays: [],`. In `OnboardingScreen.finish()`, add the same four defaults to the saved profile.

- [ ] **Step 3: Write the failing tests**

Append to `src/data/repo.test.ts`:

```ts
describe('plans', () => {
  it('saves dated plan snapshots and loads them back', async () => {
    const snap = await savePlan(db, { ...REST_WEEK, mon: 'push', thu: 'pull' }, true, new Date(2026, 0, 12, 20))
    expect(snap).toMatchObject({ effectiveFrom: '2026-01-12', isCustom: true })
    expect(await loadPlans(db)).toEqual([snap])
    expect(await countDirty(db)).toBe(1)
  })

  it('reads profiles saved before reminders existed with reminders off', async () => {
    const { reminderEnabled: _a, reminderTime: _b, nudgeEnabled: _c, reminderDays: _d, ...old } = makeProfile()
    await db.profile.put({ ...old, id: 'me', dirty: 0, updatedAt: '2026-01-01T00:00:00.000Z' } as unknown as LocalProfile)
    expect(await getProfile(db)).toMatchObject({ reminderEnabled: false, reminderTime: '18:00', nudgeEnabled: false, reminderDays: [] })
  })
})
```

(Import `savePlan`, `loadPlans` from `./repo` and `REST_WEEK` from `../domain/plan`.)

Append to the `pullAll` describe in `src/data/sync.test.ts`:

```ts
  it('round-trips plans and reminder settings, normalizing Postgres time values', async () => {
    await saveProfile(db, makeProfile({ reminderEnabled: true, reminderTime: '07:30', nudgeEnabled: true, reminderDays: ['mon', 'thu'] }))
    await savePlan(db, { ...REST_WEEK, wed: 'lower' }, true, new Date(2026, 0, 14))
    await pushDirty(db, remote)
    expect(remote.tables.profile.get('me')).toMatchObject({ reminder_time: '07:30', reminder_days: ['mon', 'thu'] })
    remote.tables.profile.set('me', { ...remote.tables.profile.get('me')!, reminder_time: '07:30:00' })

    const fresh = new PocketGainsDB(`test-${crypto.randomUUID()}`)
    await pullAll(fresh, remote)
    expect(await getProfile(fresh)).toMatchObject({ reminderEnabled: true, reminderTime: '07:30', nudgeEnabled: true, reminderDays: ['mon', 'thu'] })
    expect(await loadPlans(fresh)).toEqual(await loadPlans(db))
  })
```

(Import `savePlan`, `loadPlans` from `./repo` and `REST_WEEK` from `../domain/plan`. Add `weekly_plan: new Map()` to `FakeRemote.tables`, and change the test *pushes in foreign-key order* only if it breaks. It shouldn't, because that test has no plans.)

- [ ] **Step 4: Run to verify failure** — `npx vitest run src/data` → FAIL (missing exports/fields).

- [ ] **Step 5: Implement the data changes**

`src/data/db.ts`: import `PlanSnapshot`, add `export type LocalPlan = PlanSnapshot & SyncMeta`, declare `plans: Table<LocalPlan, string>`, and add a second schema version after version 1:

```ts
    this.version(2).stores({
      profile: 'id, dirty',
      sessions: 'id, startedAt, deckId, status, dirty',
      sets: 'id, sessionId, exerciseId, dirty',
      soreness: 'id, sessionId, dirty',
      kv: 'key',
      plans: 'id, effectiveFrom, dirty',
    })
```

`src/data/repo.ts`:
- In `toProfile`, add:

  ```ts
      reminderEnabled: row.reminderEnabled ?? false,
      reminderTime: row.reminderTime ?? '18:00',
      nudgeEnabled: row.nudgeEnabled ?? false,
      reminderDays: row.reminderDays ?? [],
  ```

- Add:

  ```ts
  export async function loadPlans(db: PocketGainsDB): Promise<PlanSnapshot[]> {
    return (await db.plans.toArray()).map(strip)
  }

  export async function savePlan(db: PocketGainsDB, days: PlanDays, isCustom: boolean, today = new Date()): Promise<PlanSnapshot> {
    const snap: PlanSnapshot = { id: crypto.randomUUID(), effectiveFrom: dateKey(today), savedAt: new Date().toISOString(), days, isCustom }
    await db.plans.put({ ...snap, dirty: 1, updatedAt: stamp() })
    return snap
  }
  ```

- Add `db.plans` to the tables in `countDirty` and in `clearAll` (both the transaction table list and the `clear()` calls).

`src/data/remote.ts`: `export type RemoteTable = 'profile' | 'session' | 'set_log' | 'soreness_checkin' | 'weekly_plan'`.

`src/data/sync.ts`:
- Profile mapping: `profileToRow` adds `reminder_enabled: p.reminderEnabled, reminder_time: p.reminderTime, nudge_enabled: p.nudgeEnabled, reminder_days: p.reminderDays`. `profileFromRow` adds:

  ```ts
    reminderEnabled: Boolean(r.reminder_enabled ?? false),
    reminderTime: typeof r.reminder_time === 'string' ? r.reminder_time.slice(0, 5) : '18:00',
    nudgeEnabled: Boolean(r.nudge_enabled ?? false),
    reminderDays: (r.reminder_days as Weekday[] | undefined) ?? [],
  ```

- Plan mapping:

  ```ts
  const planToRow = (p: LocalPlan): Row => ({
    id: p.id, effective_from: p.effectiveFrom, saved_at: p.savedAt, days: p.days, is_custom: p.isCustom, updated_at: p.updatedAt,
  })
  const planFromRow = (r: Row): LocalPlan => ({
    id: r.id as string, effectiveFrom: String(r.effective_from).slice(0, 10), savedAt: iso(r.saved_at),
    days: r.days as PlanDays, isCustom: Boolean(r.is_custom), dirty: 0, updatedAt: iso(r.updated_at),
  })
  ```

- `pushDirty`: after soreness, `n += await pushTable(db.plans, 'weekly_plan', planToRow, remote)`. `pullAll`: after soreness, `await pullTable(db.plans, 'weekly_plan', planFromRow, remote)`.

- [ ] **Step 6: Run** `npx vitest run && npm run typecheck && npm run lint` → PASS (the whole suite, since `Profile` changed).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(data): synced weekly plan snapshots and reminder settings; M2 migration"
```

---

### Task 10: Plans in app state, and keeping `reminderDays` current

**Files:**
- Modify: `src/data/AppData.tsx`
- Create: `src/data/AppData.plans.test.tsx`

**Interfaces:**
- Produces: `AppData.plans: PlanSnapshot[]`; after every load, if the weekdays in today's plan differ from `profile.reminderDays`, the profile is updated (and synced).

- [ ] **Step 1: Write the failing test `src/data/AppData.plans.test.tsx`**

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { REST_WEEK } from '../domain/plan'
import { makeProfile } from '../domain/testFixtures'
import { AppDataProvider, useAppData } from './AppData'
import { PocketGainsDB } from './db'
import { getProfile, savePlan, saveProfile } from './repo'

function Probe() {
  const { ready, plans } = useAppData()
  return <p>{ready ? `plans:${plans.length}` : 'loading'}</p>
}

describe('plans in app state', () => {
  it('exposes saved plans and keeps reminderDays matching the plan in effect today', async () => {
    const db = new PocketGainsDB(`test-${crypto.randomUUID()}`)
    await saveProfile(db, makeProfile({ experience: 'consistent', onboardedAt: '2025-01-01T00:00:00.000Z', reminderDays: [] }))
    await savePlan(db, { ...REST_WEEK, tue: 'push', fri: 'pull' }, true, new Date(2025, 5, 1))
    render(<AppDataProvider database={db}><Probe /></AppDataProvider>)
    expect(await screen.findByText('plans:1')).toBeInTheDocument()
    await waitFor(async () => expect((await getProfile(db))?.reminderDays).toEqual(['tue', 'fri']))
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/data/AppData.plans.test.tsx` → FAIL (`plans` undefined).

- [ ] **Step 3: Update `src/data/AppData.tsx`**

- Add `plans: PlanSnapshot[]` to the `AppData` interface and to `Loaded` (initial `[]`).
- In `refresh`, load `loadPlans(database)` in the `Promise.all` and put it in state.
- Add, after `afterWrite` is defined:

```tsx
  // The reminder server only knows profile.reminderDays; keep it matching the plan in effect today.
  useEffect(() => {
    const { profile, history, plans } = loaded
    if (!profile) return
    const days = trainingDays(planFor(new Date(), { profile, history, plans }).days)
    if (days.join() === profile.reminderDays.join()) return
    void saveProfile(database, { ...profile, reminderDays: days }).then(afterWrite)
  }, [loaded, database, afterWrite])
```

(Imports: `loadPlans`, `saveProfile` from `./repo`; `planFor`, `trainingDays`, `type PlanSnapshot` from `../domain/plan`.)

- [ ] **Step 4: Stop the Profile form from overwriting `reminderDays`**

`ProfileForm` keeps a draft copied when the screen opens. Saving that whole draft could write back a stale `reminderDays` that the effect above just corrected. In `src/screens/ProfileScreen.tsx`, change `ProfileForm` to read `profile` from `useAppData()`, and save only the fields the form edits, on top of the latest profile:

```tsx
  async function save() {
    const latest = profile ?? initial
    await saveProfile(db, {
      ...latest,
      experience: draft.experience,
      equipment: draft.equipment,
      petName: draft.petName.trim() || initial.petName,
      petColor: draft.petColor,
    })
    await afterWrite()
    setSaved(true)
  }
```

In `src/screens/ProfileScreen.test.tsx`, change the edit test's final assertion from `toEqual({...})` to `toMatchObject({ experience: 'returning', equipment: ['bodyweight', 'band'], petName: 'Tank', petColor: 'sky', onboardedAt: original.onboardedAt })`, since `reminderDays` is now maintained automatically.

- [ ] **Step 5: Run** `npx vitest run && npm run typecheck && npm run lint` → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/AppData.tsx src/data/AppData.plans.test.tsx src/screens/ProfileScreen.tsx src/screens/ProfileScreen.test.tsx
git commit -m "feat(data): plans in app state; keep reminder days in step with today's plan"
```

---

<!-- CONTINUE -->

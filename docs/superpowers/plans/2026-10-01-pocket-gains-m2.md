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

<!-- CONTINUE -->

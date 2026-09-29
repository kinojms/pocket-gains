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

1. **Midnight, DST and time-zone boundaries** → a session started 23:50 counts for that day; days are counted with calendar arithmetic (`setDate`), never by adding 24 h. Pinned in Task 6 (dates tests across a DST change) and Task 15 (`localParts` for a non-UTC zone).
2. **Changing the plan mid-week** → past days keep the plan that was in effect then; the new plan applies from today. Pinned in Task 6 (`planFor` snapshot tests) and Task 7 (streak unaffected by a later plan change).
3. **Brand-new user / onboarding mid-week** → no "missed" days before onboarding; streak 0 without errors; the calendar shows pre-onboarding days as blank. Pinned in Task 7.
4. **Push subscription expired or revoked (HTTP 404/410)** → the server deletes it and keeps going; one bad subscription never blocks other users. Pinned in Task 15 (handled in `index.ts`) and Task 16 (on-device delivery check).
5. **Notifications blocked or unsupported** → the reminder toggle stays off and explains how to fix it; nothing crashes. Pinned in Task 14 (`RemindersSection` tests).
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

import { UpdateBanner } from './UpdateBanner'

const h = vi.hoisted(() => ({ update: vi.fn(async () => undefined), dismiss: vi.fn(), needRefresh: true }))
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({ needRefresh: [h.needRefresh, h.dismiss], offlineReady: [false, () => undefined], updateServiceWorker: h.update }),
}))

describe('UpdateBanner', () => {
  it('offers the update and applies it only when asked', async () => {
    render(<UpdateBanner />)
    expect(screen.getByRole('status')).toHaveTextContent(/new version/)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Update' }))
    expect(h.update).toHaveBeenCalledWith(true)
  })

  it('can be postponed, and renders nothing when there is no update', async () => {
    const { unmount } = render(<UpdateBanner />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Later' }))
    expect(h.dismiss).toHaveBeenCalledWith(false)
    unmount()
    h.needRefresh = false
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

### Task 11: Home shows your streak, shield and today's planned deck (or a rest day)

**Files:**
- Modify: `src/screens/HomeScreen.tsx`, `src/screens/HomeScreen.test.tsx`, `e2e/session.spec.ts`, `src/theme.css`

**Interfaces:**
- Consumes: `streakInfo`, `countedDays` (Task 7); `plannedDeckId` (Task 6); `dateKey`, `addDays`, `weekdayOf`, `WEEKDAY_LABELS` (Task 6); `AppData.plans` (Task 10); `petLine('home_rest')` (Task 8).
- Produces: Home links: "Deal my hand ▶" → today's planned deck; on a rest day, "Train anyway ▶" → the next planned deck; "Edit my week" → `/plan`.

- [ ] **Step 1: Pin the clock in the Home tests and add the new cases**

At the top of `describe('HomeScreen', ...)` in `src/screens/HomeScreen.test.tsx`, add:

```ts
  // Home depends on the weekday: pin Date only (timers stay real so Testing Library can wait).
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 5, 10)) // Monday
  })
  afterEach(() => vi.useRealTimers())
```

(Import `afterEach`, `beforeEach`, `vi` from `vitest`.) The existing "deal button" test keeps expecting `/session/new/push`, because Monday is Push in the recommended plan. Add:

```tsx
  it('shows the streak and shield in the header', async () => {
    const db = await makeTestDb((d) => saveProfile(d, makeProfile()))
    renderRoutes(db, routes, ['/'])
    expect(await screen.findByLabelText('0-day streak')).toBeInTheDocument()
    expect(screen.getByText(/Shield ready/)).toBeInTheDocument()
  })

  it('on a rest day, offers the next planned deck instead', async () => {
    vi.setSystemTime(new Date(2026, 9, 7, 10)) // Wednesday: rest in the 4-day plan; Thursday is Pull
    const db = await makeTestDb((d) => saveProfile(d, makeProfile()))
    renderRoutes(db, routes, ['/'])
    expect(await screen.findByText('Rest day')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Train anyway/ })).toHaveAttribute('href', '/session/new/pull')
    expect(screen.queryByRole('link', { name: /Deal my hand/ })).toBeNull()
    expect(screen.getByRole('link', { name: /Edit my week/ })).toHaveAttribute('href', '/plan')
  })
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/screens/HomeScreen.test.tsx` → the two new tests FAIL.

- [ ] **Step 3: Update `src/screens/HomeScreen.tsx`**

Replace the body after `if (!profile) return null` down to the `return`, and the `panel` section, with:

```tsx
  const now = new Date(nowMs)
  const ctx = { profile, history, plans }
  const streak = streakInfo(ctx, now)
  const { level, xpIntoLevel, xpForNext } = levelFromXp(totalXp(history))
  const rec = recommendDefaults(profile, history, now)
  const todayDeck = content.decks.find((d) => d.id === plannedDeckId(now, ctx))
  const doneToday = countedDays(history).has(dateKey(now))
  // Next scheduled day within a week, for rest days.
  let next: { deck: Deck; date: Date } | undefined
  for (let i = 1; i <= 7 && !next; i++) {
    const d = addDays(now, i)
    const deck = content.decks.find((x) => x.id === plannedDeckId(d, ctx))
    if (deck) next = { deck, date: d }
  }
  const primary = todayDeck ?? next?.deck ?? suggestNextDeck(content.decks, history)
  const line = active
    ? 'We were mid-session! Ready to jump back in?'
    : petLine(doneToday ? 'home_trained_today' : todayDeck ? 'home_fresh' : 'home_rest', now.toDateString())
  const activeDeck = active ? content.decks.find((d) => d.id === active.deckId) : undefined
```

Take `plans` from `useAppData()` as well. Insert a streak row as the first child of `<main>`:

```tsx
      <div className="row spread streak-row">
        <span className="streak" aria-label={`${streak.current}-day streak`}>🔥 {streak.current}</span>
        <span className="muted">{streak.shieldAvailable ? '🛡️ Shield ready' : '🛡️ Shield used this week'}</span>
      </div>
```

Replace the non-active branch of the panel with:

```tsx
          <>
            {todayDeck ? (
              <>
                <span className="label">
                  {doneToday ? 'Done for today ✓' : `Today · ${WEEKDAY_LABELS[weekdayOf(now)]}`}
                </span>
                <strong>{todayDeck.name}</strong>
                <span className="muted">{rec.settings.cards} cards · ~{estimateMinutes(rec.settings)} min</span>
                <Link className="btn btn-primary btn-block center-text" to={`/session/new/${todayDeck.id}`}>Deal my hand ▶</Link>
              </>
            ) : (
              <>
                <span className="label">Rest day</span>
                {next && <strong>Next up: {next.deck.name} on {WEEKDAY_LABELS[weekdayOf(next.date)]}</strong>}
                <Link className="btn btn-ghost btn-block center-text" to={`/session/new/${primary.id}`}>Train anyway ▶</Link>
              </>
            )}
            <button className="btn btn-ghost" onClick={() => setPicking((p) => !p)} aria-expanded={picking}>
              Pick a different deck
            </button>
            {picking &&
              content.decks
                .filter((d) => d.id !== primary.id)
                .map((d) => (
                  <Link key={d.id} className="choice" to={`/session/new/${d.id}`}>
                    <span className="stack" style={{ gap: 2 }}>
                      <strong>{d.name}</strong>
                      <span className="muted">{d.tagline}</span>
                    </span>
                  </Link>
                ))}
            <Link className="muted center-text" to="/plan">Edit my week</Link>
          </>
```

Imports to add: `countedDays`, `streakInfo` from `../domain/streak`; `plannedDeckId` from `../domain/plan`; `addDays`, `dateKey`, `weekdayOf`, `WEEKDAY_LABELS` from `../domain/dates`; `type Deck` from `../domain/types`.

Append to `src/theme.css`:

```css
.streak-row { padding: 0 4px; }
.streak { font-size: 20px; font-weight: 800; }
```

- [ ] **Step 4: Pin the E2E clock to a Monday**

In `e2e/session.spec.ts`, add at the top level:

```ts
test.beforeEach(async ({ page }) => {
  // Home offers the day's planned deck; Monday is always a training day in the recommended plan.
  await page.clock.setFixedTime(new Date('2026-10-05T10:00:00'))
})
```

(`setFixedTime` freezes `Date` but keeps timers running, which the rest timer needs.)

- [ ] **Step 5: Run everything** — `npx vitest run && npm run typecheck && npm run lint && npm run e2e` → all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/screens/HomeScreen.tsx src/screens/HomeScreen.test.tsx src/theme.css e2e/session.spec.ts
git commit -m "feat(home): streak and shield header; today's planned deck or a rest day"
```

---

### Task 12: Edit my week

**Files:**
- Create: `src/screens/PlanScreen.tsx`, `src/screens/PlanScreen.test.tsx`
- Modify: `src/router.tsx`, `src/screens/ProfileScreen.tsx`

**Interfaces:**
- Consumes: `planFor`, `recommendedDays`, `coverageWarnings`, `type PlanDays` (Task 6); `WEEKDAYS`, `WEEKDAY_LABELS` (Task 6); `savePlan` (Task 9); `recommendDefaults`, `DEFAULT_SOURCES` (M1); `InfoSources` (M1); `useNow` (M1).
- Produces: route `/plan` (inside the tab layout). "Save my week" stores a custom snapshot from today; "Use recommended" stores a recommended snapshot from today.

- [ ] **Step 1: Write the failing test `src/screens/PlanScreen.test.tsx`**

```tsx
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { loadPlans, saveProfile } from '../data/repo'
import { makeProfile } from '../domain/testFixtures'
import { makeTestDb, renderRoutes } from '../test/renderApp'
import { PlanScreen } from './PlanScreen'

const routes = [{ path: '/plan', element: <PlanScreen /> }]
const consistent = makeProfile({ experience: 'consistent', onboardedAt: '2025-01-01T00:00:00.000Z' })

describe('PlanScreen', () => {
  it('starts from the recommended week and saves a custom one', async () => {
    const db = await makeTestDb((d) => saveProfile(d, consistent))
    const user = userEvent.setup()
    renderRoutes(db, routes, ['/plan'])
    const monday = await screen.findByRole('combobox', { name: 'Monday' })
    expect(monday).toHaveValue('push')
    expect(screen.getByText(/Using the recommended week/)).toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: 'Thursday' }), '')
    expect(await screen.findByText(/Upper Body: Pull \+ Arms isn't in your week/)).toBeInTheDocument()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Friday' }), 'pull')
    expect(screen.queryByText(/isn't in your week/)).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Save my week' }))
    await waitFor(async () => {
      const [p] = await loadPlans(db)
      expect(p).toMatchObject({ isCustom: true, days: { mon: 'push', tue: 'lower', thu: null, fri: 'pull', sat: 'lower' } })
    })
    expect(await screen.findByText('Saved ✓')).toBeInTheDocument()
  })

  it('can switch back to the recommended week', async () => {
    const db = await makeTestDb((d) => saveProfile(d, consistent))
    const user = userEvent.setup()
    renderRoutes(db, routes, ['/plan'])
    await user.click(await screen.findByRole('button', { name: 'Use recommended' }))
    await waitFor(async () => expect((await loadPlans(db))[0]?.isCustom).toBe(false))
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/screens/PlanScreen.test.tsx` → FAIL.

- [ ] **Step 3: Implement `src/screens/PlanScreen.tsx`**

```tsx
import { useState } from 'react'
import { content } from '../content'
import { useAppData } from '../data/AppData'
import { savePlan } from '../data/repo'
import { WEEKDAYS, WEEKDAY_LABELS } from '../domain/dates'
import { DEFAULT_SOURCES, recommendDefaults } from '../domain/defaults'
import { coverageWarnings, planFor, recommendedDays, type PlanDays } from '../domain/plan'
import { useNow } from '../hooks/useNow'
import { InfoSources } from '../ui/InfoSources'

export function PlanScreen() {
  const { profile, history, plans } = useAppData()
  const nowMs = useNow(60_000)
  if (!profile) return null
  const now = new Date(nowMs)
  const current = planFor(now, { profile, history, plans })
  const recommendedCount = recommendDefaults(profile, history, now).daysPerWeek
  return <PlanEditor initialDays={current.days} isCustom={current.isCustom} recommendedCount={recommendedCount} />
}

function PlanEditor({ initialDays, isCustom, recommendedCount }: { initialDays: PlanDays; isCustom: boolean; recommendedCount: number }) {
  const { db, afterWrite } = useAppData()
  const [days, setDays] = useState(initialDays)
  const [saved, setSaved] = useState(false)
  const warnings = coverageWarnings(days, content.decks)

  async function save(nextDays: PlanDays, custom: boolean) {
    await savePlan(db, nextDays, custom)
    await afterWrite()
    setDays(nextDays)
    setSaved(true)
  }

  return (
    <main className="screen">
      <h1>My week</h1>
      <p className="muted">
        {isCustom ? 'Your custom week.' : 'Using the recommended week. It adjusts as your on-ramp progresses.'}
      </p>
      <div className="panel stack">
        <span>Recommended right now: {recommendedCount} days a week, rotating decks so each muscle is trained about twice.</span>
        <InfoSources keys={DEFAULT_SOURCES.days} />
      </div>
      <section className="stack">
        {WEEKDAYS.map((w) => (
          <label key={w} className="row spread">
            <span>{WEEKDAY_LABELS[w]}</span>
            <select
              aria-label={WEEKDAY_LABELS[w]}
              value={days[w] ?? ''}
              onChange={(e) => {
                setDays({ ...days, [w]: e.target.value || null })
                setSaved(false)
              }}
            >
              <option value="">Rest</option>
              {content.decks.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
        ))}
      </section>
      {warnings.map((w) => <p key={w} className="panel">⚠️ {w}</p>)}
      <button className="btn btn-primary btn-block" onClick={() => void save(days, true)}>Save my week</button>
      <button className="btn btn-ghost" onClick={() => void save(recommendedDays(recommendedCount), false)}>Use recommended</button>
      {saved && <p role="status">Saved ✓</p>}
      <p className="muted">Changes apply from today. Past days keep the plan they had, so your streak history never changes.</p>
    </main>
  )
}
```

In `src/router.tsx`, add `{ path: 'plan', element: <PlanScreen /> }` to the tab layout's children (and import it). In `ProfileScreen`, add `<Link className="btn btn-ghost center-text" to="/plan">Edit my week</Link>` above the "About the science" block (import `Link`).

- [ ] **Step 4: Run** `npx vitest run && npm run typecheck && npm run lint` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/screens/PlanScreen.tsx src/screens/PlanScreen.test.tsx src/router.tsx src/screens/ProfileScreen.tsx
git commit -m "feat(plan): edit my week, with coverage warnings and a way back to recommended"
```

---

### Task 13: Progress calendar, streak stats and per-exercise history

**Files:**
- Create: `src/ui/MonthCalendar.tsx`, `src/ui/Sparkline.tsx`, `src/screens/ExerciseHistoryScreen.tsx`, `src/screens/ExerciseHistoryScreen.test.tsx`
- Modify: `src/screens/ProgressScreen.tsx`, `src/screens/ProgressScreen.test.tsx`, `src/router.tsx`, `src/theme.css`

**Interfaces:**
- Consumes: `streakInfo` (Task 7), `monthGrid`, `CalendarCell` (Task 7), `plannedDeckId` (Task 6), `exerciseHistory`, `trainedExercises` (Task 8), `useNow`.
- Produces: route `/progress/exercise/:exerciseId`; `MonthCalendar({ weeks, title, onPrev, onNext })`; `Sparkline({ values, label })`.

- [ ] **Step 1: Write the failing tests**

Add to `src/screens/ProgressScreen.test.tsx` (inside the existing `describe('ProgressScreen', ...)`, and add a `beforeEach`/`afterEach` pinning `Date` to `new Date(2026, 0, 11, 20)` as in Task 11):

```tsx
  it('shows streak stats, a calendar with trained days, and links to exercise history', async () => {
    const db = await makeTestDb(async (d) => {
      await saveProfile(d, makeProfile({ experience: 'consistent', onboardedAt: new Date(2026, 0, 5, 8).toISOString() }))
      await createSession(d, makeSession({
        id: 'm', startedAt: new Date(2026, 0, 5, 12).toISOString(),
        settings: { sets: 1, cards: 1, rir: [1, 3], restSec: null, repRange: null },
      }))
      await addSetLogs(d, 'm', [{ exerciseId: 'pushup', setNo: 1, reps: 11, weightKg: null, stoppedForPain: false }])
    })
    renderRoutes(db, [{ path: '/progress', element: <ProgressScreen /> }], ['/progress'])
    expect(await screen.findByLabelText('Current streak: 0 days')).toBeInTheDocument()
    expect(screen.getByLabelText('Best streak: 1 day')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'January 2026' })).toBeInTheDocument()
    expect(screen.getByLabelText('January 5: trained')).toBeInTheDocument()
    expect(screen.getByLabelText('January 6: covered by shield')).toBeInTheDocument()
    expect(screen.getByLabelText('January 8: missed')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Push-up/ })).toHaveAttribute('href', '/progress/exercise/pushup')
  })
```

(Jan 5 done, Tue 6 shielded, Thu 8 missed, so current 0 and best 1. Import `createSession`, `addSetLogs`, `makeSession`, `vi`, `beforeEach`, `afterEach`.)

Create `src/screens/ExerciseHistoryScreen.test.tsx`:

```tsx
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { addSetLogs, createSession, saveProfile } from '../data/repo'
import { makeProfile, makeSession } from '../domain/testFixtures'
import { makeTestDb, renderRoutes } from '../test/renderApp'
import { ExerciseHistoryScreen } from './ExerciseHistoryScreen'

describe('ExerciseHistoryScreen', () => {
  it('lists each session with its sets and charts the best weight over time', async () => {
    const db = await makeTestDb(async (d) => {
      await saveProfile(d, makeProfile())
      await createSession(d, makeSession({ id: 'a', startedAt: '2026-01-05T09:00:00.000Z' }))
      await createSession(d, makeSession({ id: 'b', startedAt: '2026-01-08T09:00:00.000Z' }))
      await addSetLogs(d, 'a', [{ exerciseId: 'db-curl', setNo: 1, reps: 10, weightKg: 8, stoppedForPain: false }])
      await addSetLogs(d, 'b', [
        { exerciseId: 'db-curl', setNo: 1, reps: 9, weightKg: 10, stoppedForPain: false },
        { exerciseId: 'db-curl', setNo: 2, reps: 8, weightKg: 10, stoppedForPain: false },
      ])
    })
    renderRoutes(db, [{ path: '/progress/exercise/:exerciseId', element: <ExerciseHistoryScreen /> }], ['/progress/exercise/db-curl'])
    expect(await screen.findByRole('heading', { name: 'Dumbbell Biceps Curl' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Best weight: 8 kg → 10 kg' })).toBeInTheDocument()
    expect(screen.getByText('9×10 kg · 8×10 kg')).toBeInTheDocument()
    expect(screen.getByText('10×8 kg')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/screens/ProgressScreen.test.tsx src/screens/ExerciseHistoryScreen.test.tsx` → FAIL.

- [ ] **Step 3: Create `src/ui/Sparkline.tsx`**

```tsx
export function Sparkline({ values, label }: { values: number[]; label: string }) {
  if (values.length === 0) return null
  const w = 240
  const h = 56
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => {
    const x = values.length === 1 ? w / 2 : (i / (values.length - 1)) * (w - 8) + 4
    const y = h - 6 - ((v - min) / span) * (h - 12)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} className="sparkline">
      <polyline points={pts.join(' ')} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p) => {
        const [x, y] = p.split(',')
        return <circle key={p} cx={x} cy={y} r="3.5" fill="var(--accent-2)" />
      })}
    </svg>
  )
}
```

- [ ] **Step 4: Create `src/ui/MonthCalendar.tsx`**

```tsx
import type { CalendarCell } from '../domain/calendar'

const MARK: Record<CalendarCell['status'], { icon: string; label: string }> = {
  done: { icon: '✅', label: 'trained' },
  bonus: { icon: '⭐', label: 'bonus session' },
  shielded: { icon: '🛡️', label: 'covered by shield' },
  missed: { icon: '✗', label: 'missed' },
  pending: { icon: '•', label: 'today, not trained yet' },
  rest: { icon: '', label: 'rest day' },
  future: { icon: '', label: 'upcoming' },
  none: { icon: '', label: 'before you started' },
}

export function MonthCalendar({ weeks, title, onPrev, onNext }: {
  weeks: CalendarCell[][]; title: string; onPrev(): void; onNext(): void
}) {
  const monthName = title.split(' ')[0]
  return (
    <section className="panel stack">
      <div className="row spread">
        <button className="btn btn-ghost round" aria-label="Previous month" onClick={onPrev}>‹</button>
        <h2>{title}</h2>
        <button className="btn btn-ghost round" aria-label="Next month" onClick={onNext}>›</button>
      </div>
      <div className="cal-grid">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i} className="cal-head">{d}</span>)}
        {weeks.flat().map((c) => (
          <div
            key={c.key}
            className={`cal-cell cal-${c.status}${c.inMonth ? '' : ' cal-out'}${c.deckId && c.status === 'future' ? ' cal-planned' : ''}`}
            aria-label={c.inMonth ? `${monthName} ${c.day}: ${MARK[c.status].label}` : undefined}
          >
            <span className="cal-day">{c.day}</span>
            <span className="cal-icon" aria-hidden="true">{MARK[c.status].icon}</span>
          </div>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 12 }}>✅ trained · 🛡️ shield · ✗ missed · ⭐ bonus · dot = planned</p>
    </section>
  )
}
```

Append to `src/theme.css`:

```css
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; text-align: center; }
.cal-head { font-size: 11px; color: var(--muted); }
.cal-cell { aspect-ratio: 1; border-radius: 8px; background: var(--ink); display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 12px; position: relative; }
.cal-out { opacity: 0.3; }
.cal-done { background: color-mix(in srgb, var(--good) 35%, var(--ink)); }
.cal-missed { background: color-mix(in srgb, var(--danger) 30%, var(--ink)); }
.cal-pending { outline: 2px solid var(--accent); }
.cal-planned::after { content: ''; position: absolute; bottom: 5px; width: 5px; height: 5px; border-radius: 50%; background: var(--accent-2); }
.cal-icon { font-size: 11px; line-height: 1; min-height: 11px; }
.sparkline { display: block; margin: 0 auto; }
```

- [ ] **Step 5: Update `src/screens/ProgressScreen.tsx`**

Keep `syncStatusText`, the sign-in link and the sessions/sets stats. Add at the top of the component (after reading context):

```tsx
  const { profile, plans } = useAppData()   // merge into the existing destructuring
  const nowMs = useNow(60_000)
  const [cursor, setCursor] = useState(() => ({ y: new Date(nowMs).getFullYear(), m: new Date(nowMs).getMonth() }))
  if (!profile) return null
  const now = new Date(nowMs)
  const ctx = { profile, history, plans }
  const streak = streakInfo(ctx, now)
  const weeks = monthGrid(cursor.y, cursor.m, streak, now, (d) => plannedDeckId(d, ctx))
  const title = new Date(cursor.y, cursor.m, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const move = (delta: number) => setCursor(({ y, m }) => {
    const d = new Date(y, m + delta, 1)
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  const exercises = trainedExercises(history)
```

Render, before "Recent sessions":

```tsx
      <div className="row">
        <div className="panel stack" style={{ flex: 1 }} aria-label={`Current streak: ${streak.current} day${streak.current === 1 ? '' : 's'}`}>
          <span className="label">Streak</span>
          <strong className="stat">🔥 {streak.current}</strong>
        </div>
        <div className="panel stack" style={{ flex: 1 }} aria-label={`Best streak: ${streak.best} day${streak.best === 1 ? '' : 's'}`}>
          <span className="label">Best</span>
          <strong className="stat">{streak.best}</strong>
        </div>
      </div>
      <MonthCalendar weeks={weeks} title={title} onPrev={() => move(-1)} onNext={() => move(1)} />
      <section className="stack">
        <h2>Exercises</h2>
        {exercises.length === 0 && <p className="muted">Your exercise history will show up here after your first session.</p>}
        {exercises.map((e) => (
          <Link key={e.exerciseId} className="panel row spread" to={`/progress/exercise/${e.exerciseId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <strong>{content.exercises[e.exerciseId]?.name ?? e.exerciseId}</strong>
            <span className="muted">{e.sessions} session{e.sessions === 1 ? '' : 's'} ›</span>
          </Link>
        ))}
      </section>
```

Limit "Recent sessions" to `all.slice(0, 10)`. Imports: `useState`; `Link` (already there from Task 4); `useNow`; `streakInfo`; `monthGrid`; `plannedDeckId`; `trainedExercises`; `MonthCalendar`. Hooks must come before `if (!profile) return null`.

- [ ] **Step 6: Create `src/screens/ExerciseHistoryScreen.tsx`**

```tsx
import { Link, useParams } from 'react-router'
import { content } from '../content'
import { useAppData } from '../data/AppData'
import { exerciseHistory } from '../domain/exerciseHistory'
import { Sparkline } from '../ui/Sparkline'

export function ExerciseHistoryScreen() {
  const { exerciseId = '' } = useParams()
  const { history } = useAppData()
  const exercise = content.exercises[exerciseId]
  const entries = exerciseHistory(exerciseId, history)
  const chrono = [...entries].reverse().slice(-12)
  const byWeight = chrono.every((e) => e.bestWeight !== null) && chrono.length > 0
  const values = chrono.map((e) => (byWeight ? e.bestWeight! : e.bestReps))
  const unit = byWeight ? ' kg' : ' reps'
  const label = `${byWeight ? 'Best weight' : 'Best reps'}: ${values[0]}${unit} → ${values[values.length - 1]}${unit}`

  return (
    <main className="screen">
      <Link className="muted" to="/progress">‹ Progress</Link>
      <h1>{exercise?.name ?? exerciseId}</h1>
      {entries.length === 0 ? (
        <p className="muted">No sets logged for this exercise yet.</p>
      ) : (
        <>
          <section className="panel stack">
            <span className="label">{byWeight ? 'Best weight per session' : 'Best reps per session'}</span>
            <Sparkline values={values} label={label} />
          </section>
          <section className="stack">
            {entries.map((e) => (
              <div key={e.sessionId} className="panel row spread">
                <span className="muted">
                  {new Date(e.startedAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
                <span>{e.sets.map((s) => (s.weightKg !== null ? `${s.reps}×${s.weightKg} kg` : `${s.reps}`)).join(' · ')}</span>
              </div>
            ))}
          </section>
        </>
      )}
    </main>
  )
}
```

In `src/router.tsx`, add `{ path: 'progress/exercise/:exerciseId', element: <ExerciseHistoryScreen /> }` to the tab layout's children.

- [ ] **Step 7: Run** `npx vitest run && npm run typecheck && npm run lint` → PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(progress): streak stats, month calendar and per-exercise history"
```

---

### Task 14: Reminder settings and Web Push subscription (client)

**Files:**
- Create: `src/data/push.ts`, `src/data/push.test.ts`, `src/ui/RemindersSection.tsx`, `src/ui/RemindersSection.test.tsx`
- Modify: `src/screens/ProfileScreen.tsx`, `src/vite-env.d.ts` (or `src/env.d.ts`, whichever the template created), `.env.example`, `.github/workflows/deploy.yml`

**Interfaces:**
- Produces:
  - `type PushResult = 'ok' | 'denied' | 'unsupported'`
  - `urlBase64ToUint8Array(s: string): Uint8Array<ArrayBuffer>`, `pushSupported(): boolean`
  - `subscribePush(client: SupabaseClient, vapidPublicKey: string | undefined): Promise<PushResult>` (upserts `push_subscription`)
  - `unsubscribePush(client: SupabaseClient): Promise<void>`
  - `interface ReminderSettings { reminderEnabled: boolean; reminderTime: string; nudgeEnabled: boolean }`
  - `RemindersSection({ value, onChange, subscribe, unsubscribe })`

- [ ] **Step 1: Write the failing tests**

`src/data/push.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { subscribePush, urlBase64ToUint8Array } from './push'

describe('push helpers', () => {
  it('decodes URL-safe base64 VAPID keys', () => {
    expect([...urlBase64ToUint8Array('AQID')]).toEqual([1, 2, 3])
    expect([...urlBase64ToUint8Array('-_8')]).toEqual([251, 255])
  })

  it('reports unsupported where there is no Push API (or no key)', async () => {
    expect(await subscribePush({} as never, 'key')).toBe('unsupported')
    expect(await subscribePush({} as never, undefined)).toBe('unsupported')
  })
})
```

`src/ui/RemindersSection.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RemindersSection, type ReminderSettings } from './RemindersSection'

const off: ReminderSettings = { reminderEnabled: false, reminderTime: '18:00', nudgeEnabled: false }

describe('RemindersSection', () => {
  it('subscribes when reminders are switched on', async () => {
    const onChange = vi.fn()
    const subscribe = vi.fn(async () => 'ok' as const)
    render(<RemindersSection value={off} onChange={onChange} subscribe={subscribe} unsubscribe={vi.fn(async () => undefined)} />)
    await userEvent.setup().click(screen.getByRole('checkbox', { name: /Remind me on training days/ }))
    expect(subscribe).toHaveBeenCalled()
    expect(onChange).toHaveBeenCalledWith({ ...off, reminderEnabled: true })
  })

  it('explains how to fix blocked notifications and stays off', async () => {
    const onChange = vi.fn()
    render(<RemindersSection value={off} onChange={onChange} subscribe={async () => 'denied'} unsubscribe={vi.fn(async () => undefined)} />)
    await userEvent.setup().click(screen.getByRole('checkbox', { name: /Remind me on training days/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/blocked/)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('unsubscribes when the last reminder type is switched off, and updates the time', async () => {
    const onChange = vi.fn()
    const unsubscribe = vi.fn(async () => undefined)
    const on = { ...off, reminderEnabled: true }
    const user = userEvent.setup()
    render(<RemindersSection value={on} onChange={onChange} subscribe={vi.fn()} unsubscribe={unsubscribe} />)
    const time = screen.getByLabelText('Reminder time')
    await user.clear(time)
    await user.type(time, '07:30')
    expect(onChange).toHaveBeenLastCalledWith({ ...on, reminderTime: '07:30' })
    await user.click(screen.getByRole('checkbox', { name: /Remind me on training days/ }))
    expect(unsubscribe).toHaveBeenCalled()
    expect(onChange).toHaveBeenLastCalledWith({ ...on, reminderEnabled: false })
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/data/push.test.ts src/ui/RemindersSection.test.tsx` → FAIL.

- [ ] **Step 3: Implement `src/data/push.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'

export type PushResult = 'ok' | 'denied' | 'unsupported'

export function urlBase64ToUint8Array(s: string): Uint8Array<ArrayBuffer> {
  const padded = (s + '='.repeat((4 - (s.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
}

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export async function subscribePush(client: SupabaseClient, vapidPublicKey: string | undefined): Promise<PushResult> {
  if (!vapidPublicKey || !pushSupported()) return 'unsupported'
  if ((await Notification.requestPermission()) !== 'granted') return 'denied'
  const reg = await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) }))
  const json = sub.toJSON()
  const { error } = await client
    .from('push_subscription')
    .upsert({ endpoint: json.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth }, { onConflict: 'endpoint' })
  if (error) throw new Error(`could not save push subscription: ${error.message}`)
  return 'ok'
}

export async function unsubscribePush(client: SupabaseClient): Promise<void> {
  if (!pushSupported()) return
  const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription()
  if (!sub) return
  await client.from('push_subscription').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}
```

- [ ] **Step 4: Implement `src/ui/RemindersSection.tsx`**

```tsx
import { useState } from 'react'
import type { PushResult } from '../data/push'

export interface ReminderSettings {
  reminderEnabled: boolean
  reminderTime: string
  nudgeEnabled: boolean
}

const PROBLEM: Record<Exclude<PushResult, 'ok'> | 'error', string> = {
  denied: 'Notifications are blocked for Pocket Gains. Allow them in Chrome ⋮ → Settings → Site settings → Notifications, then try again.',
  unsupported: "This browser can't receive reminders. Install Pocket Gains to your home screen and open it from there.",
  error: "Couldn't turn on reminders. Check your connection and try again.",
}

export function RemindersSection({ value, onChange, subscribe, unsubscribe }: {
  value: ReminderSettings
  onChange(v: ReminderSettings): void
  subscribe(): Promise<PushResult>
  unsubscribe(): Promise<void>
}) {
  const [problem, setProblem] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function toggle(kind: 'reminderEnabled' | 'nudgeEnabled', on: boolean) {
    setProblem(null)
    const next = { ...value, [kind]: on }
    const wasOff = !value.reminderEnabled && !value.nudgeEnabled
    if (on && wasOff) {
      setBusy(true)
      let result: PushResult | 'error'
      try {
        result = await subscribe()
      } catch {
        result = 'error'
      } finally {
        setBusy(false)
      }
      if (result !== 'ok') {
        setProblem(PROBLEM[result])
        return
      }
    }
    if (!next.reminderEnabled && !next.nudgeEnabled) await unsubscribe().catch(() => undefined)
    onChange(next)
  }

  return (
    <section className="stack">
      <h2>Reminders</h2>
      <label className="choice" aria-checked={value.reminderEnabled}>
        <input type="checkbox" checked={value.reminderEnabled} disabled={busy} onChange={(e) => void toggle('reminderEnabled', e.target.checked)} />
        Remind me on training days
      </label>
      <label className="row spread">
        <span>Reminder time</span>
        <input
          type="time" aria-label="Reminder time" value={value.reminderTime} disabled={!value.reminderEnabled}
          onChange={(e) => e.target.value && onChange({ ...value, reminderTime: e.target.value })}
        />
      </label>
      <label className="choice" aria-checked={value.nudgeEnabled}>
        <input type="checkbox" checked={value.nudgeEnabled} disabled={busy} onChange={(e) => void toggle('nudgeEnabled', e.target.checked)} />
        Morning nudge after a missed training day
      </label>
      {problem && <p role="alert" className="panel">{problem}</p>}
      <p className="muted" style={{ fontSize: 13 }}>
        At most one reminder a day, only on days in your week, and never after you've trained.
      </p>
    </section>
  )
}
```

(If the time `<input>` doesn't accept `user.type` in jsdom, change the test to `fireEvent.change(time, { target: { value: '07:30' } })`. Keep the assertion.)

- [ ] **Step 5: Wire it into `ProfileScreen` (cloud mode only)**

In `ProfileForm`, add (import `supabase` from `../data/supabase`, `subscribePush`/`unsubscribePush` from `../data/push`, `RemindersSection` from `../ui/RemindersSection`):

```tsx
  async function saveReminders(v: ReminderSettings) {
    const latest = profile ?? initial
    await saveProfile(db, { ...latest, ...v })
    await afterWrite()
  }
```

and render before "About the science":

```tsx
      {mode === 'cloud' && supabase && profile && (
        <RemindersSection
          value={{ reminderEnabled: profile.reminderEnabled, reminderTime: profile.reminderTime, nudgeEnabled: profile.nudgeEnabled }}
          onChange={(v) => void saveReminders(v)}
          subscribe={() => subscribePush(supabase!, import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined)}
          unsubscribe={() => unsubscribePush(supabase!)}
        />
      )}
```

(Reminders save immediately, because turning them on also creates the push subscription. They are not part of "Save changes".)

- [ ] **Step 6: Public VAPID key plumbing**

Add to `.env.example`:

```bash
# Web Push public key (safe to share). Set by scripts/setup-vapid.mjs.
VITE_VAPID_PUBLIC_KEY=
```

In `.github/workflows/deploy.yml`, add `VITE_VAPID_PUBLIC_KEY: ${{ vars.VITE_VAPID_PUBLIC_KEY }}` to the build step's `env`.

- [ ] **Step 7: Run** `npx vitest run && npm run typecheck && npm run lint` → PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(reminders): reminder settings and Web Push subscription"
```

---

### Task 15: `send-reminders` Edge Function

**Files:**
- Create: `supabase/functions/send-reminders/due.ts`, `supabase/functions/send-reminders/due.test.ts`, `supabase/functions/send-reminders/index.ts`
- Modify: `vite.config.ts` (test include), `.oxlintrc.json` (only if needed)

**Interfaces:**
- Produces:
  - `localParts(at: Date, timeZone: string): { date: string; time: string; weekday: string }`
  - `previousDay(key: string): string`, `weekdayOfKey(key: string): string`
  - `dueNotifications(input: { now: Date; profiles: DueProfile[]; states: DueState[]; sessions: DueSession[] }): DueNotification[]`
  - HTTP function: POST → `{ due: number, sent: number }`, authenticated with the project's **secret** key

- [ ] **Step 1: Include function tests in Vitest**

In `vite.config.ts`, change `test.include` to `['src/**/*.test.{ts,tsx}', 'supabase/functions/**/*.test.ts']`.

- [ ] **Step 2: Write the failing tests `supabase/functions/send-reminders/due.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { dueNotifications, localParts, previousDay, weekdayOfKey, type DueProfile } from './due'

const TZ = 'Asia/Manila' // UTC+8, no DST
const base: DueProfile = {
  user_id: 'u1', pet_name: 'Mochi', timezone: TZ, reminder_enabled: true, reminder_time: '18:00:00',
  nudge_enabled: false, reminder_days: ['mon', 'thu'],
}
// 2026-10-05 is a Monday
const at = (utc: string) => new Date(utc)
const due = (now: string, o: Partial<{ profile: Partial<DueProfile>; reminded: string; nudged: string; sessions: string[] }> = {}) =>
  dueNotifications({
    now: at(now),
    profiles: [{ ...base, ...o.profile }],
    states: o.reminded || o.nudged ? [{ user_id: 'u1', last_reminded_on: o.reminded ?? null, last_nudged_on: o.nudged ?? null }] : [],
    sessions: (o.sessions ?? []).map((s) => ({ user_id: 'u1', started_at: s })),
  })

describe('localParts', () => {
  it('converts to the user time zone, including across the date line', () => {
    expect(localParts(at('2026-10-05T10:15:00Z'), TZ)).toEqual({ date: '2026-10-05', time: '18:15', weekday: 'mon' })
    expect(localParts(at('2026-10-05T20:00:00Z'), TZ)).toEqual({ date: '2026-10-06', time: '04:00', weekday: 'tue' })
  })

  it('date helpers', () => {
    expect(previousDay('2026-03-01')).toBe('2026-02-28')
    expect(weekdayOfKey('2026-10-05')).toBe('mon')
  })
})

describe('dueNotifications: reminders', () => {
  it('is due after the reminder time on a reminder day', () => {
    const [n] = due('2026-10-05T10:15:00Z')
    expect(n).toMatchObject({ userId: 'u1', kind: 'reminder', localDate: '2026-10-05' })
    expect(n.title).toContain('Mochi')
  })

  it('is not due before the time, after 23:00, on other days, when disabled, or when already sent today', () => {
    expect(due('2026-10-05T09:59:00Z')).toEqual([])
    expect(due('2026-10-05T15:05:00Z')).toEqual([])
    expect(due('2026-10-06T10:15:00Z')).toEqual([])
    expect(due('2026-10-05T10:15:00Z', { profile: { reminder_enabled: false } })).toEqual([])
    expect(due('2026-10-05T10:15:00Z', { reminded: '2026-10-05' })).toEqual([])
  })

  it('is skipped once a session started that local day', () => {
    expect(due('2026-10-05T10:15:00Z', { sessions: ['2026-10-05T01:00:00Z'] })).toEqual([])
    // 2026-10-04T20:00Z is 04:00 on Oct 5 local, so it counts as today
    expect(due('2026-10-05T10:15:00Z', { sessions: ['2026-10-04T20:00:00Z'] })).toEqual([])
  })
})

describe('dueNotifications: morning nudge', () => {
  const nudgeOn = { profile: { nudge_enabled: true, reminder_enabled: false } }

  it('nudges the morning after a missed reminder day', () => {
    const out = due('2026-10-06T02:00:00Z', nudgeOn) // Tue 10:00 local; Monday had no session
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ kind: 'nudge', localDate: '2026-10-06' })
  })

  it('does not nudge if yesterday was trained, outside 09:00-12:00, or twice', () => {
    expect(due('2026-10-06T02:00:00Z', { ...nudgeOn, sessions: ['2026-10-05T11:00:00Z'] })).toEqual([])
    expect(due('2026-10-06T04:30:00Z', nudgeOn)).toEqual([])
    expect(due('2026-10-06T02:00:00Z', { ...nudgeOn, nudged: '2026-10-06' })).toEqual([])
  })
})

it('skips a profile with an invalid time zone without failing the others', () => {
  const out = dueNotifications({
    now: at('2026-10-05T10:15:00Z'),
    profiles: [{ ...base, user_id: 'bad', timezone: 'Not/AZone' }, base],
    states: [],
    sessions: [],
  })
  expect(out.map((n) => n.userId)).toEqual(['u1'])
})
```

- [ ] **Step 3: Run to verify failure** — `npx vitest run supabase/functions` → FAIL (cannot resolve `./due`).

- [ ] **Step 4: Implement `supabase/functions/send-reminders/due.ts`** (no Deno APIs, so it runs in both Deno and Vitest)

```ts
export interface DueProfile {
  user_id: string
  pet_name: string
  timezone: string
  reminder_enabled: boolean
  /** Postgres time, e.g. "18:00:00" */
  reminder_time: string
  nudge_enabled: boolean
  reminder_days: string[]
}

export interface DueState {
  user_id: string
  last_reminded_on: string | null
  last_nudged_on: string | null
}

export interface DueSession {
  user_id: string
  started_at: string
}

export interface DueNotification {
  userId: string
  kind: 'reminder' | 'nudge'
  localDate: string
  title: string
  body: string
}

const REMIND_UNTIL = '23:00'
const NUDGE_FROM = '09:00'
const NUDGE_UNTIL = '12:00'
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export function localParts(at: Date, timeZone: string): { date: string; time: string; weekday: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short',
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  )
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    weekday: String(parts.weekday).toLowerCase().slice(0, 3),
  }
}

function utcFromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function previousDay(key: string): string {
  const d = utcFromKey(key)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

export function weekdayOfKey(key: string): string {
  return DAYS[utcFromKey(key).getUTCDay()]
}

export function dueNotifications(input: {
  now: Date
  profiles: DueProfile[]
  states: DueState[]
  sessions: DueSession[]
}): DueNotification[] {
  const out: DueNotification[] = []
  for (const p of input.profiles) {
    let local: ReturnType<typeof localParts>
    try {
      local = localParts(input.now, p.timezone)
    } catch {
      continue // invalid time zone: skip this user, keep the others
    }
    const trained = new Set(
      input.sessions.filter((s) => s.user_id === p.user_id).map((s) => localParts(new Date(s.started_at), p.timezone).date),
    )
    if (trained.has(local.date)) continue
    const state = input.states.find((s) => s.user_id === p.user_id)

    const remindAt = p.reminder_time.slice(0, 5)
    if (
      p.reminder_enabled && p.reminder_days.includes(local.weekday) &&
      local.time >= remindAt && local.time < REMIND_UNTIL && state?.last_reminded_on !== local.date
    ) {
      out.push({
        userId: p.user_id, kind: 'reminder', localDate: local.date,
        title: `${p.pet_name} is ready to train 💪`,
        body: "Today's hand is waiting. Even a short session keeps your streak alive.",
      })
    }

    const yesterday = previousDay(local.date)
    if (
      p.nudge_enabled && p.reminder_days.includes(weekdayOfKey(yesterday)) && !trained.has(yesterday) &&
      local.time >= NUDGE_FROM && local.time < NUDGE_UNTIL && state?.last_nudged_on !== local.date
    ) {
      out.push({
        userId: p.user_id, kind: 'nudge', localDate: local.date,
        title: `${p.pet_name} missed you yesterday`,
        body: 'A quick session today keeps your streak going 🛡️',
      })
    }
  }
  return out
}
```

- [ ] **Step 5: Run** `npx vitest run supabase/functions` → PASS.

- [ ] **Step 6: Write the function entry `supabase/functions/send-reminders/index.ts`**

```ts
// Called every 15 minutes by pg_cron with the project's secret key (see README).
// Deploy with --no-verify-jwt; @supabase/server checks the secret key instead.
import { withSupabase } from 'npm:@supabase/server@^1'
import webpush from 'npm:web-push@^3.6.7'
import { dueNotifications, type DueProfile, type DueSession, type DueState } from './due.ts'

webpush.setVapidDetails(
  `mailto:${Deno.env.get('VAPID_CONTACT_EMAIL')}`,
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

export default {
  fetch: withSupabase({ auth: 'secret' }, async (_req, ctx) => {
    const admin = ctx.supabaseAdmin
    const since = new Date(Date.now() - 3 * 86_400_000).toISOString()
    const [profiles, states, sessions, subs] = await Promise.all([
      admin.from('profile')
        .select('user_id, pet_name, timezone, reminder_enabled, reminder_time, nudge_enabled, reminder_days')
        .or('reminder_enabled.eq.true,nudge_enabled.eq.true'),
      admin.from('reminder_state').select('user_id, last_reminded_on, last_nudged_on'),
      admin.from('session').select('user_id, started_at').gte('started_at', since),
      admin.from('push_subscription').select('endpoint, user_id, p256dh, auth'),
    ])
    const failed = profiles.error ?? states.error ?? sessions.error ?? subs.error
    if (failed) return Response.json({ error: failed.message }, { status: 500 })

    const due = dueNotifications({
      now: new Date(),
      profiles: profiles.data as DueProfile[],
      states: states.data as DueState[],
      sessions: sessions.data as DueSession[],
    })

    let sent = 0
    for (const n of due) {
      for (const s of subs.data.filter((x) => x.user_id === n.userId)) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify({ title: n.title, body: n.body, tag: n.kind }),
          )
          sent++
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode
          // Expired or revoked subscription: remove it and carry on with everyone else.
          if (status === 404 || status === 410) await admin.from('push_subscription').delete().eq('endpoint', s.endpoint)
          else console.error('push failed', status, e)
        }
      }
      await admin.from('reminder_state').upsert(
        { user_id: n.userId, ...(n.kind === 'reminder' ? { last_reminded_on: n.localDate } : { last_nudged_on: n.localDate }) },
        { onConflict: 'user_id' },
      )
    }
    return Response.json({ due: due.length, sent })
  }),
}
```

Before relying on it, confirm the `withSupabase` import and signature against the current Supabase docs (context7: "@supabase/server withSupabase auth secret"). If `npm:web-push` fails at runtime in the Edge runtime (for example missing Node crypto APIs), switch to `jsr:@negrel/webpush` with the same VAPID keys; `due.ts` does not change.

- [ ] **Step 7: Keep repo checks green**

Run: `npx vitest run && npm run typecheck && npm run lint`.
`index.ts` is outside `tsconfig` (Deno file). If oxlint reports errors in it (e.g. the `Deno` global or `npm:` specifiers), add `"ignorePatterns": ["supabase/functions/**/index.ts"]` to `.oxlintrc.json`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(reminders): send-reminders Edge Function with tested due-time logic"
```

---

### Task 16: Keys, scheduling, deploy and on-device acceptance

**Files:**
- Create: `scripts/setup-vapid.mjs`
- Modify: `package.json` (devDependency `web-push`), `README.md`

**Interfaces:**
- Produces: live reminders on the user's phone.

- [ ] **Step 1: Create `scripts/setup-vapid.mjs`**

```js
// Generates Web Push (VAPID) keys and stores them where they belong, without printing the private key.
//   usage: node scripts/setup-vapid.mjs <supabase-project-ref> <contact-email>
// Needs: `npx supabase login` and `gh auth login` done first.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import webpush from 'web-push'

const [ref, email] = process.argv.slice(2)
if (!ref || !email) {
  console.error('usage: node scripts/setup-vapid.mjs <supabase-project-ref> <contact-email>')
  process.exit(1)
}
const { publicKey, privateKey } = webpush.generateVAPIDKeys()
const shell = process.platform === 'win32'

execFileSync(
  'npx',
  ['supabase', 'secrets', 'set', `VAPID_PUBLIC_KEY=${publicKey}`, `VAPID_PRIVATE_KEY=${privateKey}`, `VAPID_CONTACT_EMAIL=${email}`, '--project-ref', ref],
  { stdio: ['ignore', 'inherit', 'inherit'], shell },
)
execFileSync('gh', ['variable', 'set', 'VITE_VAPID_PUBLIC_KEY', '--body', publicKey], { stdio: 'inherit', shell })

const envFile = '.env.local'
const lines = existsSync(envFile) ? readFileSync(envFile, 'utf8').split(/\r?\n/).filter((l) => l && !l.startsWith('VITE_VAPID_PUBLIC_KEY=')) : []
writeFileSync(envFile, [...lines, `VITE_VAPID_PUBLIC_KEY=${publicKey}`].join('\n') + '\n')
console.log(`VAPID keys set (Supabase secrets, GitHub variable, ${envFile}). Public key: ${publicKey}`)
```

Run `npm install -D web-push`.

- [ ] **Step 2: Document setup in `README.md`**

Add a "Reminders (one-time setup)" section:

```markdown
## Reminders (one-time setup)

1. Run the new migration `supabase/migrations/20261001000000_m2.sql` in the SQL Editor.
2. Log in to the CLIs: `npx supabase login` (and `gh auth login` if needed).
3. Keys: `node scripts/setup-vapid.mjs <project-ref> <your-email>`.
   This stores the private key only in Supabase secrets.
4. Deploy the function:
   `npx supabase functions deploy send-reminders --project-ref <project-ref> --no-verify-jwt --use-api`
5. Schedule it. In the SQL Editor, replace the two values and run:

       select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
       select vault.create_secret('<your SECRET key, sb_secret_…>', 'secret_key');
       select cron.schedule('send-reminders', '*/15 * * * *', $$
         select net.http_post(
           url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/send-reminders',
           headers := jsonb_build_object(
             'Content-Type', 'application/json',
             'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'secret_key'),
             'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'secret_key')
           ),
           body := '{}'::jsonb
         );
       $$);

   The secret key is under Project Settings → API keys. Never put it in the repo.
6. Push to `main` so the app rebuilds with the public VAPID key.
```

- [ ] **Step 3: Verify, commit and hand over the setup steps**

Run: `npx vitest run && npm run typecheck && npm run lint && npm run build && npm run e2e` → all PASS.

```bash
git add -A
git commit -m "chore(reminders): VAPID setup script and reminder setup docs"
```

README steps 1–5 create secrets and change the user's Supabase project, which are outward-facing and security-sensitive actions. Ask the user to run them, or to explicitly approve each one. Step 3 is safe for an agent to run once the user has logged in to the CLIs, because it never prints the private key. Push to `main` only with the user's go-ahead.

- [ ] **Step 4: Check the function by hand**

With the user's permission, run a manual call using the secret key (the user can run it with `!` so the key stays out of the transcript):

```bash
curl -s -X POST "https://<project-ref>.supabase.co/functions/v1/send-reminders" -H "apikey: <secret key>" -H "Authorization: Bearer <secret key>"
```

Expected: `{"due":0,"sent":0}` (or `due: 1` if a reminder is due). A 401 means the auth header or deploy flag is wrong.

- [ ] **Step 5: On-device acceptance (with the user)**

1. Profile → Reminders → turn on "Remind me on training days" and set the time a few minutes ahead, on a day in your week. Accept the notification permission. Within 15 minutes after that time, a notification arrives in the pet's voice. Tapping it opens the app.
2. Train that day before the reminder time on another day: no reminder that day.
3. Home shows 🔥 and the shield; "Edit my week" changes Home's deck for that weekday from today on.
4. Progress shows the calendar with today marked and your trained days ✅; tapping an exercise shows its history.
5. Turn reminders off. The subscription row disappears from `push_subscription` in the Supabase Table Editor.
6. A new deploy shows the "A new version…" banner on a tab screen, never during a workout.

---

## Spec coverage (M2)

| Spec | Requirement | Task |
|---|---|---|
| §2 M2 | Weekly plan (recommended, editable) | 6, 9, 10, 12 |
| §2 M2, §8 | Streaks: scheduled days only; warm-up + ≥ 1 completed card; 1 shield per ISO week; second miss resets | 7, 11 |
| §2 M2, §9 | Web Push reminders; cron every 15 min; ≤ 1/day; pet voice; next-morning nudge; install/permission guidance | 5, 14–16 |
| §2 M2 | Progress tab: calendar and per-exercise history | 13 |
| §10 | Resume/finalize robustness; sync retry correctness; update without interrupting workouts | 1–3, 5 |
| M1 review | 8 deferred minors: write-chain catch (1), startup recovery (2), paging order (3), pull/push race (3), sign-in-to-sync (4), atomic set+resume (1), 12 h finalize on resume + orphans (2), update prompt (5) | 1–5 |


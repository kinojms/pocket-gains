# Pocket Gains — Progress

Personal home-workout PWA: exercises are trading cards, sessions are dealt "hands", and a kawaii blob pet grows as you train. Built to fix inconsistent training with research-backed defaults, forgiving streaks and a pet to keep you coming back.

- **Live app:** https://kinojms.github.io/pocket-gains/
- **Repo:** https://github.com/kinojms/pocket-gains (deploys on every push to `main`)
- **Backend:** Supabase (auth, Postgres with row-level security)
- **Design spec:** [`docs/superpowers/specs/2026-09-29-lock-in-design.md`](docs/superpowers/specs/2026-09-29-lock-in-design.md)

_Last updated: 2026-10-12_

## Status at a glance

| Milestone | What it covers | Status |
|---|---|---|
| **M1: Playable loop + basic pet** | Onboarding, decks, dealt hands, workout player, summary, XP/levels, sync | ✅ Done, deployed, checked on-device |
| **M2: Consistency** | Weekly plan, streaks + shield, reminders, progress calendar and exercise history, plus 8 robustness fixes | ✅ Done, deployed, reminders set up, checked on-device |
| **M3: Progression** | Card levels, upgrade/step-down prompts, unlockable variations, placement test | ⏳ Not started |
| **M4: Pet as mirror** | Pet body changes with the muscles you train; text milestones | ⏳ Not started |
| **Design pass** | Overall UI/visual polish | ✅ Deployed 2026-10-13; waiting for your on-device check |
| **Diet / nutrition** | Separate sub-project | ⏳ Later, own spec |

## Next session

M2 is done: merged, deployed, reminders running (cron every 15 minutes), and checked on-device on 2026-10-12.

**Up next:** M3 (Progression): card levels, upgrade/step-down prompts, unlockable variations, placement test. It starts with brainstorming and a plan.

**How reminders behave:**
- A reminder arrives at the first 15-minute check at or after your time, so up to 15 minutes late.
- You get at most one reminder a day.

**Deferred to later:**
- The time zone can't be edited after onboarding (reminders fire at the old local time if you move).
- Seven minor review items, listed under Known limitations.

## What exists today (M1)

- **Onboarding:** safety note, experience level (new / returning / consistent), equipment, pet name and colour.
- **Home:** pet-first screen with level/XP, today's suggested deck (rotation Push → Lower → Pull → Lower), and resume for unfinished sessions.
- **Decks:** 3 starter decks (Upper Push, Upper Pull + Arms, Lower + Core), 38 exercises in 26 variation chains, each with form cues, common mistakes and cited sources. Images come from free-exercise-db (public domain); the rest show a pet fallback.
- **Session setup:** research-based defaults with an on-ramp for new or returning trainees, a "Why this number?" source for each value, a soreness check-in that holds the ramp, and "too hard" easing the next session.
- **Hand:** balanced deal by movement type and equipment, 2 swaps + 1 reroll, avoids repeating your last hand.
- **Workout player:** warm-up → tutorial (becomes a skippable refresher after 3 sessions) → set (rep counter, weight for dumbbells) ⇄ rest (wall-clock ring timer, +15 s, skip). "This hurts" stops a card and eases that exercise next time; "End early" keeps your work, with a reason. Screen stays awake; resumes after the app is closed (within 12 h).
- **Summary:** XP gained, per-exercise results, supportive pet line, soreness check-in, suggestions after 3 same-reason early ends.
- **Progress / Profile:** recent sessions and sync status; edit experience, equipment, pet name and colour; the research list.
- **Data:** saved on the phone first (works offline), synced to Supabase; sign-in with email and password; public sign-ups disabled.
- **Quality:** 116 unit/component tests + 3 end-to-end browser tests run in CI on every push.

## Changelog

### 2026-10-13: Design pass built
- **Look:** "Sky meadow" theme with a day/night cycle (morning, day, sunset, night), Fredoka + Nunito fonts, chunky press-in buttons and panels, hand-drawn icons instead of emoji.
- **Pet:** lives in a meadow scene; moods (happy, excited, proud, relaxed, sleepy, missed you), blinking, looking around, jumps when tapped.
- **Cards:** rarity colours (blue common, purple rare, gold epic with a shine).
- **Workout:** focus mode in the card's rarity colour with rep and rest rings and set pips.
- **Celebrations:** confetti, count-ups, streak pop and a level-up overlay.
- **Feedback:** tap sounds and vibration, with per-device switches in Profile.
- **Size:** adds about 110 KB to the download (about 64 KB of it is the two fonts).

### 2026-10-12: M2 built
- **Shipped:** merged to `main` and deployed; reminders set up and every on-device check passed.
- **Robustness:**
  - A failed save never stalls a workout.
  - Recovery can't hang startup.
  - Orphaned sessions are finalized.
  - Sync pages in a stable order and keeps the newest copy.
  - "Sign in to sync" shows when your login has expired.
- **App updates:** an "Update" banner (only on tab screens) instead of an automatic reload. A custom service worker handles push notifications.
- **Weekly plan:** recommended week (3 days on the on-ramp, 4 at target) and "Edit my week". Plans are dated, so changes never rewrite past days.
- **Streaks:** scheduled days only, one shield per week, today never breaks the streak. Home shows 🔥 and 🛡️.
- **Progress:** streak stats, month calendar, and a history page for each exercise with a chart.
- **Reminders:** Profile → Reminders (once a day max, morning nudge, latest time 22:45), Web Push, and the `send-reminders` Edge Function (pg_cron every 15 min).
- **Review fixes:**
  - Editing Experience no longer resets past streak days.
  - Sign-out removes push.
  - Each phone can set up its own reminders.
  - Startup writes wait for the first download.
  - Notification taps open Pocket Gains, not another app on the same site.

### 2026-09-30
- Added this progress file. M2 build scheduled for the next session.

### 2026-09-29: Project start → M1 shipped
**Planning**
- Brainstormed the idea; wrote and approved the design spec (deckbuilder + pet + research-based defaults; diet deferred to its own project).
- Hosting switched from Vercel to GitHub Pages; wrote the M1 implementation plan (18 tasks).

**Build (M1)**
- Scaffolded React + Vite + TypeScript PWA; exercise content with verified citations; images.
- Domain logic: defaults and on-ramp, hand dealing, session state machine, XP/levels, history helpers.
- Local-first data (IndexedDB) with Supabase sync and row-level security; cloud/offline startup gate.
- Screens: onboarding, Home, session setup and hand, workout player, summary, Decks, Progress, Profile.
- End-to-end tests; CI and GitHub Pages deploy.

**Review fixes**
- Resuming from Home no longer rewinds the workout (was duplicating sets and XP).
- Signing out and back in no longer shows onboarding mid-download.

**Changes after M1**
- Renamed the app **Lock In → Pocket Gains** (web path `/pocket-gains/`).
- Pet changed from pixel art to a **kawaii blob** with **6 selectable colours** (new `pet_color` column).
- Created the GitHub repo (public, you as the only contributor; commit history cleaned of AI attribution).
- Connected Supabase (URL and publishable key as repo variables); live app switched to cloud mode.
- PWA fixes: stable app `id` (resolved an install conflict with the `tsukino-prescript` app on the same domain, which also got an `id`), and app icons now fill Samsung/Android adaptive shapes with no white border.

**M2 planning**
- Wrote and reviewed the M2 plan (16 tasks), including the 8 deferred robustness fixes from the M1 review.

## Known limitations / deferred

- **Tutorial videos:** cards link to a YouTube search until you add curated `videoUrl`s in `src/content/exercises.json`.
- **Leg raise and a few others:** no photo (the pet fallback shows instead).
- **Time zone** is set at onboarding and can't be edited yet.
- **Minor review items (M2):**
  - The nudge can fire for the day before you joined.
  - Edge-function bookkeeping isn't hardened (unchecked state write, unpaged reads).
  - Re-running the VAPID script orphans old subscriptions.
  - A failed workout save drops that step's sets.
  - Onboarding day counts as a scheduled day.
  - Reminder days go stale if the app isn't opened.
  - Streak maths isn't cached.
- **UI/visual design:** functional but plain; the design pass comes after the feature milestones.

## Setup notes

- **Supabase migrations:** run in order in the SQL Editor: `20260929000000_init.sql` ✅, `20260930000000_pet_color.sql` ✅, `20261001000000_m2.sql` ✅, `20261002000000_m2_plan_experience.sql` ✅.
- **Reminders:** VAPID keys set (don't re-run `scripts/setup-vapid.mjs`), `send-reminders` deployed, Vault secrets + cron job `send-reminders` created.
- **Local development:** `npm install`, `npm run dev`. `.env.local` holds the public Supabase URL and key (git-ignored).
- **Details:** full setup steps are in [`README.md`](README.md).

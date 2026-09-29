# Pocket Gains — Progress

Personal home-workout PWA: exercises are trading cards, sessions are dealt "hands", and a kawaii blob pet grows as you train. Built to fix inconsistent training with research-backed defaults, forgiving streaks and a pet to keep you coming back.

- **Live app:** https://kinojms.github.io/pocket-gains/
- **Repo:** https://github.com/kinojms/pocket-gains (deploys on every push to `main`)
- **Backend:** Supabase (auth, Postgres with row-level security)
- **Design spec:** [`docs/superpowers/specs/2026-09-29-lock-in-design.md`](docs/superpowers/specs/2026-09-29-lock-in-design.md)

_Last updated: 2026-09-30_

## Status at a glance

| Milestone | What it covers | Status |
|---|---|---|
| **M1: Playable loop + basic pet** | Onboarding, decks, dealt hands, workout player, summary, XP/levels, sync | ✅ Done, deployed, checked on-device |
| **M2: Consistency** | Weekly plan, streaks + shield, reminders, progress calendar and exercise history, plus 8 robustness fixes | 📝 Planned; build starts next session |
| **M3: Progression** | Card levels, upgrade/step-down prompts, unlockable variations, placement test | ⏳ Not started |
| **M4: Pet as mirror** | Pet body changes with the muscles you train; text milestones | ⏳ Not started |
| **Design pass** | Overall UI/visual polish | ⏳ After the feature milestones (your call: features first) |
| **Diet / nutrition** | Separate sub-project | ⏳ Later, own spec |

## Next session

1. **Build M2** from [`docs/superpowers/plans/2026-10-01-pocket-gains-m2.md`](docs/superpowers/plans/2026-10-01-pocket-gains-m2.md) (plan approved). Still to decide: build **Native** (recommended) or **Subagent-driven**.
2. **Your part:**
   - **At Task 9:** run `supabase/migrations/20261001000000_m2.sql` in the Supabase SQL Editor **before** anything M2 is pushed to `main`.
   - **Near the end:** run `npx supabase login`, then create the Vault secrets and the 15-minute cron job in the SQL Editor with your **secret** key. Never paste that key into chat.
   - **At the end:** an on-device check: a reminder arriving, the streak and calendar, offline launch, and the update banner.

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
- **8 minor robustness items:** scheduled as M2 Tasks 1–5.
- **UI/visual design:** functional but plain; the design pass comes after the feature milestones.

## Setup notes

- **Supabase migrations:** run in order in the SQL Editor: `20260929000000_init.sql` ✅, `20260930000000_pet_color.sql` ✅, `20261001000000_m2.sql` (next session).
- **Local development:** `npm install`, `npm run dev`. `.env.local` holds the public Supabase URL and key (git-ignored).
- **Details:** full setup steps are in [`README.md`](README.md).

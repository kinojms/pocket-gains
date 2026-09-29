# Pocket Gains — Design Spec

**Date:** 2026-09-29
**Status:** Draft, awaiting review
**Scope:** Workout sub-project (diet/nutrition is a separate, later spec)

## 1. Purpose

A personal home-workout app that fixes one problem: **inconsistency**. The user trains "whenever they feel like it", doubts whether they're doing things right, gets discouraged (e.g. told "pushups won't change anything"), and stops.

Pocket Gains addresses this with:

- **Confidence** — every exercise shows correct form, fits the user's goal, and progresses over time instead of repeating the same thing forever. Defaults are grounded in published training research, with sources visible.
- **Motivation** — a deckbuilder game layer (exercise cards, unlockable variations) and a pixel-art pet that grows with the user's real training.
- **Consistency** — a recommended weekly plan, forgiving streaks, and daily reminders.

**User:** the author, a beginner / returning trainee. Goal: build muscle + general strength. Equipment: bodyweight, dumbbells, resistance bands. Device: Android phone.

**Success criteria:**
- The user trains on ≥ 80% of scheduled days over 8 weeks.
- The user never has to wonder "am I doing this right / is this what I need?" — the app answers both.
- Measurable strength progress (reps / variation / weight) visible in the app within 4 weeks.

## 2. Scope and build order

| Milestone | Delivers |
|---|---|
| **M1 — Playable loop + basic pet** | Login; onboarding (goal, experience level, equipment, pet name, safety note); 3 starter decks; deal recommended hand with swaps; session setup with on-ramp defaults; tutorial → set ⇄ rest flow; end-early / "this hurts"; session summary; full set logging; basic pet (starter sprite, XP, level). |
| **M2 — Consistency** | Weekly plan (recommended default, editable); streaks with weekly shield; Web Push reminders; Progress tab (calendar, per-exercise history). |
| **M3 — Progression** | Card levels; double-progression upgrade/step-down prompts; locked variations with unlock bars; TCG rarity; placement test. |
| **M4 — Pet as mirror** | Body traits per region derived from training volume; text milestones ("Week 8: expect…"). |
| **Later (separate specs)** | Diet/nutrition, more decks, animated demos. |

**Retroactive progress:** `set_log` is recorded in full from M1. Everything added later (streaks, card levels, unlocks, pet body traits) is *derived* from the log, so work done before a feature ships still counts.

**Out of scope:** diet, social features, camera-based form checking, generated images of the user's future body, medical/personalized coaching claims.

### Starter decks (M1)

1. **Upper Body — Push** (chest, shoulders, triceps)
2. **Upper Body — Pull + Arms** (back, biceps, rear delts)
3. **Lower Body + Core** (quads, glutes, hamstrings, calves, abs)

Each deck also includes secondary muscles. The **recommended weekly plan rotates decks so each muscle is trained ~2×/week** (e.g. Mon Push · Tue Lower · Thu Pull · Sat Lower+Core). The user may pick any deck on any day; only the default is optimized.

## 3. Architecture

- **Frontend:** React + Vite + TypeScript PWA (`vite-plugin-pwa`), installable to the Android home screen.
- **Backend:** Supabase — Auth (single user), Postgres with Row Level Security, Edge Function + `pg_cron` for Web Push reminders.
- **Hosting:** frontend on **GitHub Pages**, deployed by a GitHub Actions workflow on push to `main`. Supabase hosts itself. HTTPS is required for PWA install, service workers and push, so the app must be hosted rather than run only locally.
  - **Public repo** (free-tier Pages). Only public-safe config is committed (Supabase URL + anon key, VAPID public key). The Supabase service-role key and VAPID private key live only in Supabase / GitHub Actions secrets. Data protection relies on RLS.
  - **Subpath:** site is served at `https://<user>.github.io/pocket-gains/` — Vite `base`, PWA manifest `start_url` and `scope` are set to `/pocket-gains/`.
  - **Routing:** hash routing (`/#/progress`) so deep links and refreshes work without server rewrites.
  - **No preview deploys:** branches are tested locally (Vite dev server, reachable from the phone on the home network). Plain-HTTP LAN access is not a secure context, so install/offline/push features are tested on the deployed Pages site (or via an HTTPS tunnel) rather than over the LAN.

```
Phone (PWA)
 ├─ UI: Home · Decks · Progress · Profile  +  Session flow
 ├─ Domain logic (pure TS, no UI imports)
 │   recommender · defaults/on-ramp · progression · pet · streaks
 ├─ Content (static JSON in repo)
 ├─ Data layer: IndexedDB (local-first) ⇄ Supabase sync
 └─ Service worker: offline shell + push receiver
Supabase
 ├─ Auth · Postgres + RLS
 └─ Edge Function + cron → Web Push
```

**Principles**
- Domain logic is pure, deterministic TypeScript, separated from UI and storage, and unit-tested.
- Local-first: every write goes to IndexedDB first, then syncs. Workouts work fully offline.
- Static exercise content is separate from user data; content changes are code changes (reviewed, versioned), not migrations.

## 4. Visual design

- **Pet:** original pixel-art creature (Pokémon-*style*, not Pokémon IP). Cute and lovable; its body mirrors the user's training.
- **Cards:** trading-card (TCG) style — gold frame, name, rarity stars, pixel image, type line (movement · muscles · level), "Power" (sets × reps), "Recover" (rest), and evolution line (🔒 next variation + unlock condition).
- **Home:** pet-first. Pet fills the screen with a speech bubble reacting to the day; streak in the header; "Today" panel with deck, card count, estimated time and a **Deal my hand** button.
- **Navigation:** always-visible bottom tab bar with icon + text labels: 🏠 Home · 🃏 Decks · 📊 Progress · ⚙ Profile.
- **Workout mode:** clean, non-TCG, readable from 1–2 m away (see §6).

Mockups from brainstorming are kept locally in `.superpowers/brainstorm/` (git-ignored).

## 5. Data model

### Content (static JSON)

```ts
type Movement = "push" | "pull" | "squat" | "hinge" | "core" | "isolation" | "warmup";
type Equipment = "bodyweight" | "dumbbell" | "band";
type Region = "arms" | "chest" | "back" | "shoulders" | "core" | "legs";

interface Exercise {
  id: string;                    // "pushup-decline"
  name: string;
  muscles: { primary: string[]; secondary: string[] };
  regions: Region[];             // for pet body traits
  movement: Movement;
  equipment: Equipment;
  rarity: 1 | 2 | 3;             // difficulty tier, shown as stars
  repRange: [number, number];    // default for the goal, e.g. [8, 12]
  restSec: number;               // 120 compound / 60–90 isolation
  media: { image: string; videoUrl?: string };
  cues: string[];                // numbered how-to steps
  mistakes: string[];
  sources: string[];             // citations for cues/defaults
}

interface VariationChain {
  id: string;                    // "pushup"
  steps: string[];               // easiest → hardest exercise ids
  unlockRule: { sets: number; reps: number }; // e.g. 3 × 12
}

interface Deck {
  id: string;
  name: string;
  slots: { movement: Movement; count: number }[]; // balanced hand template
  chainIds: string[];
}
```

Images come from an open, permissively licensed exercise dataset (e.g. free-exercise-db, public domain; or wger, CC-BY-SA with attribution). Cues and mistakes are written by us from recognized guidance. Videos are curated YouTube embeds from reputable coaches.

### User data (Supabase Postgres, RLS: owner only)

| Table | Columns (key) |
|---|---|
| `profile` | goal, experience (`new` / `returning` / `consistent`), onboarded_at, equipment[], reminder_time, timezone, pet_name |
| `weekly_plan` | weekday → deck_id, is_custom |
| `session` | id, started_at, ended_at, deck_id, settings (sets, rep range, rest, cards, rir), status (`complete` / `partial` / `abandoned`), end_reason |
| `set_log` | session_id, exercise_id, set_no, reps, weight_kg (nullable), stopped_for_pain (bool), logged_at |
| `soreness_checkin` | session_id, rating (1–3) |
| `card_state` | chain_id, current_exercise_id, unlocked_ids[], placement_done — **cache**, recomputable |
| `push_subscription` | endpoint, keys |

`set_log` is the source of truth. Streaks, card levels, XP and pet traits are pure functions of `set_log` + `session` + `profile`.

## 6. Session flow

1. **Home → Deal my hand** (today's planned deck, or pick another).
2. **Setup** — sets, rep range, rest, cards; pre-filled from §7 with an ⓘ showing each value's source. Editable.
3. **Hand** — fixed warm-up card (~3 min) + N dealt TCG cards. Up to 2 swaps and 1 full reroll.
4. **Per card:**
   - **Tutorial page** — name, large looping image, "Watch full tutorial" (YouTube), numbered cues, mistakes, **I'm ready**. Shown every time for new cards; after 3 completed sessions with a card it becomes a one-tap-skippable refresher; shown again whenever the card changes variation.
   - **Timer page — set:** small reference image + one key cue (tap → tutorial), target range, large rep counter with −/+, **Log set**, **This hurts**.
   - **Timer page — rest:** small reference image, last set result ("10 reps · in range ✓"), large ring timer, **+15s**, **Skip rest**.
5. **Summary** — sets completed, XP gained, progress notes, pet reaction; soreness check-in during the on-ramp.

**Placement test (M3):** the first time a chain is used, set 1 is "as many good-form reps as you can". The app picks the variation whose range the user would land in (e.g. incline pushups if regular pushups cap at 5).

**Resume:** an unfinished session can be resumed for 12 hours.

### Stopping mid-session

| | This hurts | End early |
|---|---|---|
| Scope | Current card | Whole session |
| Placement | Visible on set screen | Behind ✕, with confirm |
| Prompt | None | Optional reason: 😴 Tired · ⏰ No time · 💪 Too hard · 🤷 Other |
| Effect | Card logged as stopped (`stopped_for_pain`); easier variation suggested next time; never counts against progression | Session saved as `partial` |

Anti-guilt rules for ending early:
- All completed sets are saved and earn XP / count toward unlocks.
- **Warm-up + ≥ 1 completed card keeps the streak.**
- Pet reaction is supportive ("We still showed up today 💪").
- Same reason 3 sessions in a row → suggestion, not nagging: ⏰ fewer cards; 💪 repeat an on-ramp week; 😴 move reminder time.
- "Too hard" makes the next session's recommendation slightly easier (e.g. one fewer set).

## 7. Recommended defaults and on-ramp

### Target defaults (goal: muscle + strength)

| Setting | Default | Basis |
|---|---|---|
| Sets / exercise | 3 | Weekly volume ~10+ sets/muscle (Schoenfeld et al., 2017 dose-response meta-analysis) |
| Reps | 8–12; bodyweight up to 15–20 | ACSM 2009 progression position stand; similar hypertrophy across loads when near failure (Schoenfeld et al., 2017) |
| Effort | 1–3 reps in reserve (RIR) | Common RIR guidance |
| Rest | 120 s compound; 60–90 s isolation | Schoenfeld et al., 2016 (rest interval study) |
| Cards / session | 5 (~35–45 min) | Fits weekly volume on 3–4 days |
| Days / week | 4, rotating so each muscle ~2×/week | Schoenfeld et al., 2016 (frequency meta-analysis) |

### On-ramp by experience level

| Level | Weeks 1–2 | Weeks 3–4 | Week 5+ |
|---|---|---|---|
| New | 2 sets · 3 days · 4 cards · 3–4 RIR | 3 sets · 3 days · 5 cards · 2–3 RIR | Target defaults |
| Returning | 2 sets · 3 days · 4 cards · 3–4 RIR | Target defaults | — |
| Consistent | Target defaults | — | — |

Basis: ACSM 2009 novice guidance (1–3 sets, 2–3 days/week); DOMS management for new trainees; faster regain in previously trained individuals (Staron et al., 1991; Seaborne et al., 2018).

A **soreness check-in** (😀 / 😐 / 😣) follows each on-ramp session; a 😣 holds the current on-ramp stage for another week. Weeks are counted from `profile.onboarded_at`.

Exact citations are stored in content `sources` and shown in the ⓘ popovers. All guidance is framed as general fitness information, not medical advice.

## 8. Domain rules

### Recommender
- Fills the deck's `slots` by movement, using the user's **current variation** for each chain.
- Filters by owned equipment.
- Avoids repeating the exact exercise set used in the previous session of the same deck where alternatives exist.
- Swaps offer same-movement alternatives only (keeps the hand balanced). Limits: 2 swaps + 1 reroll per session.

### Progression (double progression, M3)
- **Upgrade offered** when every working set of a card hits the top of its rep range in one session → next variation in the chain (bodyweight) or +1–2 kg (dumbbell). The user can accept or decline.
- **Step-down suggested** when the bottom of the range is missed in 2 consecutive sessions. Presented neutrally ("re-grip").
- Sets flagged `stopped_for_pain` are ignored by both rules.
- A variation **unlocks** when the previous one meets `unlockRule`. Locked cards show a progress bar.

### Streaks (M2)
- Only scheduled days count; rest days never break a streak.
- A scheduled day counts if a session on that day has warm-up + ≥ 1 completed card.
- **1 shield per ISO week** automatically covers one missed scheduled day. Unused shields don't accumulate.
- Missing a second scheduled day in the same week resets the streak.

### Pet
- **XP** per completed working set (warm-up excluded), plus a small bonus per completed session. The level curve is steep early so the first levels come within the first week.
- **Body traits (M4):** rolling 4-week set volume per `Region` maps to 4 size tiers per body part. Tiers never drop by more than one step per week.
- **No death, no punishment states.** Reactions are encouraging.
- **Milestones (M4):** text-only, evidence-based expectations by week (e.g. "Weeks 1–4: strength rises first, mostly from your nervous system learning the movement").

## 9. Reminders (M2)

- Profile sets the reminder time and timezone. A `pg_cron` job every 15 minutes invokes an Edge Function that sends Web Push to users whose reminder is due on a scheduled day with no session yet.
- **At most 1 reminder/day**, plus an optional next-morning nudge after a shield is used.
- Messages are in the pet's voice.
- Requires the PWA installed to the home screen; onboarding guides installation and permission.

## 10. Offline and error handling

- All writes go to IndexedDB first; a sync queue pushes to Supabase with retry and backoff. Unsynced data shows a small indicator on the Progress tab. Sync is idempotent (client-generated UUIDs).
- The timer uses wall-clock timestamps, so it stays accurate across screen lock or backgrounding. Screen Wake Lock keeps the screen on during a session where supported.
- If a video fails to load, the tutorial falls back to image + text cues.
- An interrupted session can be resumed within 12 hours; after that it is saved as `partial`.

## 11. Safety

- One-time onboarding note: general fitness information, not medical advice; stop on sharp pain; consult a professional for injuries or conditions.
- **This hurts** button on every set screen (see §6).

## 12. Testing

- **Domain logic** (recommender, defaults/on-ramp, progression, streaks/shields, pet XP/traits): unit tests with Vitest, written test-first. Highest priority.
- **Content validation:** schema check in CI — every exercise has cues, mistakes and sources; every chain references valid ids; every deck can deal a full hand for each equipment subset that includes bodyweight.
- **Critical flows:** Playwright — deal → complete session → saved; end early → partial saved and streak rules applied; offline session → syncs when back online.
- **Real-world check:** the user runs each milestone on their Android phone before the next begins.

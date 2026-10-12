# Pocket Gains — Design Pass Spec

Date: 2026-10-13. Status: approved in brainstorming, awaiting spec review.

## 1. Goal

The app works but looks "cheap and barebones". This pass gives it a finished, playful-game look inspired by workout apps (Duolingo-style chunky UI, Pokémon Sleep / Finch pet games, Pokémon TCG Pocket cards) **without adding or removing features**. Success: on the user's phone every screen feels like one designed game, the pet feels alive, and finishing a workout feels rewarding.

**Decisions made with the user:**

| Topic | Choice |
|---|---|
| Overall direction | Playful game |
| Look | **Sky meadow**: pet lives in a sky + grassy hill scene; clean white panels; orange primary buttons |
| Exercise cards | **Rarity colours**: frame colour = rarity (common blue, rare purple, epic gold with shine), big photo, stat badges |
| Workout screen | **Focus mode**: whole screen in the card's rarity colour, giant number in a ring, set pips |
| Pet | **Bring it to life**: same blob, moods and motion |
| Extras (all in) | Celebrations · day & night scene · custom icons · sounds & vibration |
| Build approach | Own design system first (tokens + component kit), then restyle screens with it |

**Out of scope:** new features, M3 progression, M4 pet body traits, pet accessories, a light/dark toggle (night phase replaces it).

## 2. Visual system

### 2.1 Tokens (`src/design/tokens.css`)
All colours are CSS custom properties on `:root`, re-valued per **phase** via `:root[data-phase="…"]`. Components use tokens only — no hex values in components.

Core tokens: `--sky-top`, `--sky-bottom`, `--grass`, `--grass-dark`, `--bg`, `--panel`, `--panel-border`, `--text`, `--text-muted`, `--primary` (#ff8a1f) + `--primary-base` (#d4680a), `--success` (#2fbf71) + `--success-base` (#1f9555), `--danger` (#d9534f), `--gold` (#ffb020), rarity `--rarity-1` blue (#4da3ff / base #2a78d1), `--rarity-2` purple (#7b5cff / base #5438c9), `--rarity-3` gold (#ffc93c → #f2a33a / base #c47a1c). Also `--radius` (16px), `--radius-sm` (12px), `--press` (4px base shadow depth).

| Phase | Local time | Sky | Panels / text |
|---|---|---|---|
| `morning` | 05:00–09:59 | peach → pale blue | white / dark ink |
| `day` | 10:00–16:59 | #8fd3ff → #c9ecff | white / dark ink (#1f3550) |
| `sunset` | 17:00–19:59 | orange → pink | white / dark ink |
| `night` | 20:00–04:59 | navy (#1a2350 → #2a3570), stars | dark panels (#252e5a), light text |

Rarity and action colours stay the same in every phase. Text/background contrast ≥ 4.5:1 in every phase. `color-scheme` is `dark` in night, `light` otherwise. The theme-color meta follows the phase.

### 2.2 Phase (`src/design/phase.ts`)
- `phaseFor(date: Date): Phase` — pure, boundaries as in the table (start inclusive).
- `usePhase()` — computes the phase, sets `document.documentElement.dataset.phase`, re-checks every 5 minutes and on `visibilitychange`.

### 2.3 Type
Fredoka (600/700) for headings, big numbers and buttons; Nunito (600/800) for body. Self-hosted via `@fontsource/fredoka` and `@fontsource/nunito`, Latin subset only, precached by the service worker (works offline). Numbers use tabular figures.

### 2.4 Component kit (`src/ui/`)
- **Button** — variants `primary`, `success`, `danger`, `quiet`, `round`; press-in look (coloured base shadow `--press`, translates down on `:active`); min 48px tall (round: 44px). Fires `feedback('tap')` on press. Accepts `icon`.
- **Panel** — white (night: dark), 2.5px `--panel-border`, 4px base shadow, `--radius`.
- **RarityCard** — sizes `full` and `mini`. Frame gradient + base shadow by `rarity` (1/2/3); epic adds a periodic shine sweep (motion-gated). Contents: photo (pet fallback), name, rarity label (COMMON / RARE / EPIC) + primary muscles, stat badges (sets × reps, rest). Replaces `TcgCard`; same props.
- **Icon** — inline SVG components, rounded 2px-stroke style with fills, `currentColor`. Set: home, decks, progress, profile, flame, shield, timer, muscle, check, plus, minus, close, bell, calendar, lock, star, sound, vibrate, settings, chevron. Decorative by default (`aria-hidden`); `label` prop makes it `role="img"`. All UI emoji are replaced; emoji inside pet speech lines stay.
- **Pill** — small rounded chip with optional icon (streak, shield, sync status).
- **XpBar** — chunky 12px bar; animates fill with an overshoot when the value grows.
- **Ring** — SVG progress ring (`value` 0–1, size, thickness, children in the centre). Used by set counter, warm-up and rest.
- **TabBar** — white (night: dark) bar with Icon + label; active tab gets a tinted pill behind the icon.
- **MeadowScene**, **Pet**, **Celebration** — see §3 and §4.

## 3. Pet and meadow

### 3.1 MeadowScene
Sky gradient by phase; morning/day: sun + 2–3 slowly drifting clouds; sunset: low sun, pink clouds; night: moon + twinkling stars. Rounded grassy hill at the bottom with a few tufts/flowers; pet stands on the hill. Props: `height`, `children` (overlay content such as pills and the speech bubble). Used full-size on Home, Login and Onboarding and as a strip on Summary.

### 3.2 Pet (replaces `PetSprite`)
Same blob body and the 6 colour palettes. New props: `mood`, `size`, `onTap`.

**Moods** (`src/domain/petMood.ts`, pure):

```
petMood({ phase: Phase, plannedToday: boolean, trainedToday: boolean, missedYesterday: boolean }): PetMood
```

`missedYesterday` = yesterday was a planned training day with no session. Priority order:
1. `trainedToday` → `proud` (sparkle)
2. phase `night` → `sleepy` (half-closed eyes, floating "z")
3. `missedYesterday` → `missed` (hopeful face — never sad or guilt-tripping)
4. `plannedToday` → `excited`
5. not planned → `relaxed`
6. fallback `happy`

Tapping the pet temporarily overrides the mood with `excited` for ~3 s (wakes a sleepy pet).

**Motion:** idle breathing squish; blink every 3–6 s (random); occasional look left/right. Tap: jump + giggle sound + next speech line. With `prefers-reduced-motion`, only the blink remains.

**Speech:** existing lines from `src/domain/pet.ts`, new bubble styling.

## 4. Celebrations, sounds, vibration

### 4.1 Celebrations (`src/ui/Celebration.tsx`)
- **Workout finished** (Summary): confetti (`canvas-confetti`), pet proud jump, stats count up, XP bar fills.
- **Level up**: full-screen overlay "Level up!" with the pet scaling up, star burst and fanfare; tap to dismiss.
- **Streak extended**: flame pill pops and flickers + chime.
- **Hand dealt**: cards flip in one by one.

With reduced motion: no confetti, no bounce/flip; overlays fade in; numbers appear without counting.

### 4.2 Feedback (`src/feedback/`)
- `feedback(kind)` where `kind` ∈ `tap` | `log` | `restDone` | `celebrate` | `levelUp` | `petTap`. Plays the sound and vibration for that kind, each only if enabled.
- `sound.ts` — Web Audio synthesis, no audio files: `tap` soft pop, `log` bright tick, `restDone` rising chime, `celebrate`/`levelUp` short fanfare, `petTap` giggle. Low gain. AudioContext is created lazily on the first user gesture; failures are silent.
- `haptics.ts` — wraps `navigator.vibrate` (no-op where unsupported): `tap` 10 ms, `log` [20, 40, 20], `restDone` 300 ms (replaces the direct call in PlayScreen).
- Settings: `sound` and `vibration` booleans, default on, **per device** in `localStorage` (try/catch; missing → defaults). Toggled in Profile → "Sounds & vibration". Not synced.

## 5. Screens

No feature changes; presentation only (plus the new Sounds & vibration switches).

- **Home** — MeadowScene top half with Pet (mood from `petMood`), streak + shield Pills over the sky, name · level + XpBar under the hill. "Today" Panel: deck name, card count, time, big primary "Deal my hand"; or a "Rest day" Panel. "Edit my week" quiet link.
- **Decks** — deck grid, each with fanned mini RarityCards; deck detail is a collection grid of mini cards.
- **New session (deal hand)** — cards flip into a horizontal swipe row; swap button under each; settings in a Panel; big Start.
- **Play (focus mode)** — background = current card's rarity colour (warm-up uses primary), set pips at the top, close button.
  - Warm-up: Ring countdown.
  - Tutorial: full RarityCard + cues; big Ready button.
  - Set: giant rep number in a Ring (fill = reps / top of range, capped), round −/+ Buttons, weight stepper, success "Log set" (`feedback('log')`), quiet danger "This hurts" link.
  - Rest: draining Ring, next card name, +15s and Skip; `feedback('restDone')` when it ends.
  - End-early sheet: chunky choice rows.
- **Summary** — MeadowScene strip with proud Pet, confetti, count-up stats, XpBar, soreness check as three large face buttons, Done.
- **Progress** — three stat tiles (current streak, best streak, shields); MonthCalendar: trained = filled sun circle, shielded = shield icon, today ringed; exercise rows with mini card thumbnail + Sparkline; recent sessions as Panels; sync status as a Pill.
- **Exercise history** — header card, larger Sparkline, session list.
- **Plan** — seven day tiles (Mon–Sun) showing a deck chip or "Rest"; tap to choose; "Use recommended" at the bottom.
- **Profile** — Pet + name + colour swatches at the top; Panels for goal/experience, equipment, Reminders, Sounds & vibration; sign out as a quiet danger link.
- **Onboarding** — step progress bar, Pet on its hill reacting to answers, icon choice tiles, big Next.
- **Login** — MeadowScene + Pet greeting, sign-in Panel.
- **UpdateBanner** — pill sliding down from the top.

## 6. Build order

1. Tokens, phase, fonts (app still looks mostly like today but recoloured).
2. Component kit + feedback module.
3. Pet + MeadowScene.
4. Screens, one at a time (Home → Play → Summary → Decks/New session → Progress/History → Plan → Profile → Onboarding/Login).
5. Celebrations.

The app stays working and deployable after every step.

## 7. Testing and quality

- Test-first unit tests: `phaseFor` boundaries; `petMood` priority table; feedback settings (defaults, persistence, storage failure); `feedback()` respects switches; Button fires `tap`; RarityCard frame by rarity; Ring value clamping; Icon accessibility (decorative vs labelled).
- Existing screen tests: update selectors that relied on emoji to use roles/labels/text.
- Playwright e2e (3 tests) stay green; typecheck, lint, build pass.
- Bundle: expected ≈ +100 KB (mostly fonts); report actual size after build.
- Accessibility: contrast ≥ 4.5:1 per phase, labelled icons, tap targets ≥ 44px, `prefers-reduced-motion` respected everywhere.

**Acceptance (user, on device):** every screen in day and night phase; a full workout with sounds/vibration on and off; summary celebration; level-up overlay; offline launch still works.

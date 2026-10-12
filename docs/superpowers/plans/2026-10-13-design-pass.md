# Design Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Pocket Gains a finished "Sky meadow" playful-game look — design tokens with a day/night cycle, a component kit, a living pet in a meadow, rarity cards, focus-mode workouts, celebrations, sounds and vibration — without changing features.

**Architecture:** Colours live in one TypeScript palette (`src/design/palette.ts`) applied as CSS variables per day phase; a small kit in `src/ui/` (Icon, Pill, XpBar, Ring, Pips, RarityCard, Pet, MeadowScene, LevelUpOverlay) is built first, then every screen is restyled with it. Sound/vibration go through one `feedback(kind)` function, triggered for ordinary buttons by a single document-level click listener. Pure logic (day phase, pet mood, streak gain, contrast) lives in `src/domain/` / `src/design/` and is unit-tested.

**Tech Stack:** React 19 + Vite 8 + TypeScript, Vitest + Testing Library (jsdom), Playwright, vite-plugin-pwa. New: `@fontsource/fredoka`, `@fontsource/nunito`, `canvas-confetti` (+ `@types/canvas-confetti`).

**Spec:** `docs/superpowers/specs/2026-10-13-design-pass-design.md`

## Global Constraints

- Presentation only: no feature added or removed except the Profile "Sounds & vibration" switches.
- Existing accessible names stay (tests and e2e rely on them): `Deal my hand`, `Log set`, `Skip rest`, `Start first card`, `start set 1`, `End session`, `Done`, `Save changes`, `Save my week`, `Use recommended`, `Next`, `Hatch`, `Your pet` (img), `N-day streak`, `Current streak: …`, calendar cell labels, weekday comboboxes, `Sets`/`Cards` steppers.
- Colours come only from tokens defined in `src/design/palette.ts` (applied as CSS variables) or `src/theme.css`; no hex colours in `.tsx` files except pet art (`PET_PALETTES`, pet ink).
- Contrast: body text ≥ 4.5:1 against panel and background in every phase; white button labels (19px bold = large text) ≥ 3:1; white on focus-mode backgrounds ≥ 4.5:1 — enforced by `palette.test.ts`.
- Tap targets ≥ 44px; `prefers-reduced-motion: reduce` disables confetti, bounce, flips, drifting, count-ups (blink stays).
- No emoji in UI source (`src/screens/**`, `src/ui/**`, `src/router.tsx`, `.tsx` only); pet speech lines in `src/domain/pet.ts` keep theirs. Enforced in Task 12.
- Day phases (local time, start inclusive): morning 05:00–09:59, day 10:00–16:59, sunset 17:00–19:59, night 20:00–04:59.
- Sound & vibration settings: per device in `localStorage` key `pg.feedback`, default both on, never synced.
- New dependencies limited to the four packages above.
- Work on branch `design-pass`. Commits use conventional messages and **no AI attribution lines**. Every push to `main` deploys — never push without the user's go-ahead.
- Test commands: `npm test` (Vitest), `npm run typecheck`, `npm run lint` (4 pre-existing warnings are fine), `npm run build`, `npm run e2e`.

## Review Focus

1. **Phase flips while the app is open** (e.g. 19:59 → 20:00, or returning to the app next morning): the colours, `data-phase` and theme-color must update without a reload — Task 1 test advances the clock and fires `visibilitychange`.
2. **Storage blocked or corrupt** (private mode, quota, junk JSON in `pg.feedback`): settings fall back to defaults, toggling never throws — Task 2 tests.
3. **Devices without Web Audio or `navigator.vibrate`** (iOS Safari has no vibrate): every feedback call is a silent no-op — Task 2 tests.
4. **Reduced motion**: no confetti, count-ups show the final number at once, the level-up overlay still appears and dismisses — Task 8 test with `matchMedia` mocked to `reduce`.
5. **Label-wrapped checkboxes fire two clicks** (label + input): one tap must give one sound/vibration, not two — Task 2 debounce test.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/domain/dayPhase.ts` | `DayPhase` type, `dayPhaseFor(date)` (pure) |
| `src/design/palette.ts` | Phase palettes, static tokens, `contrast()`, `applyPhase()` |
| `src/design/phaseContext.ts` | `PhaseContext`, `usePhase()` |
| `src/design/PhaseProvider.tsx` | Recomputes phase every 5 min / on visibility, applies it |
| `src/design/fonts.ts` | Self-hosted font imports (Latin subset) |
| `src/Root.tsx` | App root: tap feedback + phase provider + data + router |
| `src/feedback/kinds.ts` | `FeedbackKind` type |
| `src/feedback/settings.ts` | Per-device sound/vibration settings |
| `src/feedback/sound.ts` | Web Audio synthesized sounds |
| `src/feedback/haptics.ts` | Vibration patterns |
| `src/feedback/feedback.ts` | `feedback(kind)` respecting settings |
| `src/feedback/useTapFeedback.ts` | Document click listener for buttons |
| `src/ui/Icon.tsx` | Hand-drawn SVG icon set |
| `src/ui/Pill.tsx`, `XpBar.tsx`, `Ring.tsx`, `ring.ts`, `Pips.tsx` | Small kit parts |
| `src/ui/RarityCard.tsx` | Exercise card (replaces `TcgCard.tsx`) |
| `src/domain/petMood.ts` | `petMood()`, `missedYesterday()` (pure) |
| `src/ui/Pet.tsx` | Animated pet with moods (replaces `PetSprite.tsx`) |
| `src/ui/MeadowScene.tsx` | Sky + hill scene |
| `src/ui/motion.ts`, `useCountUp.ts`, `celebrate.ts`, `LevelUpOverlay.tsx` | Celebrations |
| `src/ui/FeedbackSettingsSection.tsx` | Profile switches |
| `src/theme.css` | Base styles + kit + screen styles |

---

### Task 1: Day phase, palette, fonts and base theme

**Files:**
- Create: `src/domain/dayPhase.ts`, `src/domain/dayPhase.test.ts`, `src/design/palette.ts`, `src/design/palette.test.ts`, `src/design/phaseContext.ts`, `src/design/PhaseProvider.tsx`, `src/design/PhaseProvider.test.tsx`, `src/design/fonts.ts`, `src/Root.tsx`
- Modify: `src/main.tsx`, `src/theme.css` (full rewrite), `index.html:6`, `vite.config.ts:24-25`, `package.json` (deps)

**Interfaces:**
- Produces: `type DayPhase = 'morning' | 'day' | 'sunset' | 'night'`; `dayPhaseFor(d: Date): DayPhase`; `PHASE_PALETTES`, `STATIC_TOKENS`, `contrast(a: string, b: string): number`, `applyPhase(phase: DayPhase, root?: HTMLElement): void`; `PhaseContext`, `usePhase(): DayPhase`; `PhaseProvider`; `Root`. CSS variables: `--sky-top --sky-bottom --sun --grass --grass-dark --bg --panel --panel-border --panel-sunken --text --text-muted --danger --primary --primary-base --success --success-base --gold --gold-base --on-color --rarity-{1,2,3} --rarity-{1,2,3}-base --focus-{0,1,2,3}-top --focus-{0,1,2,3}`. Legacy aliases `--accent --accent-2 --good --muted --surface --surface-2 --ink` (removed in Task 12).

- [ ] **Step 1: Create the branch**

```bash
git checkout -b design-pass
```

- [ ] **Step 2: Write the failing tests**

`src/domain/dayPhase.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { dayPhaseFor } from './dayPhase'

const at = (h: number, m = 0) => new Date(2026, 9, 13, h, m)

describe('dayPhaseFor', () => {
  it('splits the day at 05:00, 10:00, 17:00 and 20:00 (start inclusive)', () => {
    expect(dayPhaseFor(at(4, 59))).toBe('night')
    expect(dayPhaseFor(at(5))).toBe('morning')
    expect(dayPhaseFor(at(9, 59))).toBe('morning')
    expect(dayPhaseFor(at(10))).toBe('day')
    expect(dayPhaseFor(at(16, 59))).toBe('day')
    expect(dayPhaseFor(at(17))).toBe('sunset')
    expect(dayPhaseFor(at(19, 59))).toBe('sunset')
    expect(dayPhaseFor(at(20))).toBe('night')
    expect(dayPhaseFor(at(0))).toBe('night')
  })
})
```

`src/design/palette.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { applyPhase, contrast, PHASE_PALETTES, STATIC_TOKENS } from './palette'
import type { DayPhase } from '../domain/dayPhase'

const PHASES: DayPhase[] = ['morning', 'day', 'sunset', 'night']

describe('contrast', () => {
  it('matches the WCAG formula', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 0)
    expect(contrast('#ffffff', '#ffffff')).toBeCloseTo(1, 5)
  })
})

describe('palette', () => {
  it.each(PHASES)('keeps body text readable in the %s phase', (phase) => {
    const p = PHASE_PALETTES[phase]
    for (const fg of [p.text, p['text-muted'], p.danger]) {
      expect(contrast(fg, p.panel)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(fg, p.bg)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('keeps white button labels (large text) and focus-mode text readable', () => {
    expect(contrast(STATIC_TOKENS['on-color'], STATIC_TOKENS.primary)).toBeGreaterThanOrEqual(3)
    expect(contrast(STATIC_TOKENS['on-color'], STATIC_TOKENS.success)).toBeGreaterThanOrEqual(3)
    for (const n of [0, 1, 2, 3] as const) {
      expect(contrast('#ffffff', STATIC_TOKENS[`focus-${n}`])).toBeGreaterThanOrEqual(4.5)
      expect(contrast('#ffffff', STATIC_TOKENS[`focus-${n}-top`])).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('applies a phase as CSS variables, data-phase, color-scheme and theme-color', () => {
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.append(meta)
    applyPhase('night')
    const root = document.documentElement
    expect(root.dataset.phase).toBe('night')
    expect(root.style.getPropertyValue('--panel')).toBe(PHASE_PALETTES.night.panel)
    expect(root.style.getPropertyValue('--primary')).toBe(STATIC_TOKENS.primary)
    expect(root.style.colorScheme).toBe('dark')
    expect(meta.content).toBe(PHASE_PALETTES.night['sky-top'])
    applyPhase('day')
    expect(root.style.colorScheme).toBe('light')
    meta.remove()
  })
})
```

`src/design/PhaseProvider.test.tsx`:

```tsx
import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PhaseProvider } from './PhaseProvider'
import { usePhase } from './phaseContext'

function Show() {
  return <p>{usePhase()}</p>
}

describe('PhaseProvider', () => {
  afterEach(() => vi.useRealTimers())

  it('follows the clock and updates when the app becomes visible again', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 13, 19, 59))
    render(<PhaseProvider><Show /></PhaseProvider>)
    expect(screen.getByText('sunset')).toBeInTheDocument()
    expect(document.documentElement.dataset.phase).toBe('sunset')

    vi.setSystemTime(new Date(2026, 9, 13, 20, 1))
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(screen.getByText('night')).toBeInTheDocument()
    expect(document.documentElement.dataset.phase).toBe('night')
  })
})
```

- [ ] **Step 3: Run them to verify they fail**

Run: `npx vitest run src/domain/dayPhase.test.ts src/design`
Expected: FAIL — cannot resolve `./dayPhase`, `./palette`, `./PhaseProvider`.

- [ ] **Step 4: Implement**

`src/domain/dayPhase.ts`:

```ts
export type DayPhase = 'morning' | 'day' | 'sunset' | 'night'

/** Local-time phase that drives the sky and the app's colours. */
export function dayPhaseFor(d: Date): DayPhase {
  const h = d.getHours()
  if (h >= 5 && h < 10) return 'morning'
  if (h >= 10 && h < 17) return 'day'
  if (h >= 17 && h < 20) return 'sunset'
  return 'night'
}
```

`src/design/palette.ts`:

```ts
import type { DayPhase } from '../domain/dayPhase'

export type PhaseToken =
  | 'sky-top' | 'sky-bottom' | 'sun' | 'grass' | 'grass-dark'
  | 'bg' | 'panel' | 'panel-border' | 'panel-sunken' | 'text' | 'text-muted' | 'danger'

export const PHASE_PALETTES: Record<DayPhase, Record<PhaseToken, string>> = {
  morning: {
    'sky-top': '#ffd6b8', 'sky-bottom': '#d8eeff', sun: '#ffb84d', grass: '#8ddc63', 'grass-dark': '#66bb44',
    bg: '#fff6ee', panel: '#ffffff', 'panel-border': '#f0e0d2', 'panel-sunken': '#fbf3ec',
    text: '#3b2f2a', 'text-muted': '#6b5a4f', danger: '#c93c37',
  },
  day: {
    'sky-top': '#8fd3ff', 'sky-bottom': '#c9ecff', sun: '#ffd34d', grass: '#7ed957', 'grass-dark': '#5cb83c',
    bg: '#eef7fd', panel: '#ffffff', 'panel-border': '#dbe8f3', 'panel-sunken': '#f2f7fb',
    text: '#1f3550', 'text-muted': '#4f6680', danger: '#c93c37',
  },
  sunset: {
    'sky-top': '#ff9a6b', 'sky-bottom': '#ffc9d9', sun: '#ff6b3d', grass: '#6cc25a', 'grass-dark': '#4d9a3f',
    bg: '#fff1ef', panel: '#ffffff', 'panel-border': '#f3d9d6', 'panel-sunken': '#fcf1f0',
    text: '#3a2433', 'text-muted': '#6e4f60', danger: '#c93c37',
  },
  night: {
    'sky-top': '#141b3f', 'sky-bottom': '#2a3570', sun: '#f4f1d0', grass: '#2f6b4a', 'grass-dark': '#214d35',
    bg: '#10153a', panel: '#252e5a', 'panel-border': '#36417a', 'panel-sunken': '#1b2249',
    text: '#eef1ff', 'text-muted': '#b4bce6', danger: '#ff8a85',
  },
}

/** Colours that are the same in every phase. */
export const STATIC_TOKENS = {
  primary: '#f26b00', 'primary-base': '#b84f00',
  success: '#1f9a57', 'success-base': '#147040',
  gold: '#ffc93c', 'gold-base': '#c98500',
  'on-color': '#ffffff',
  'rarity-1': '#4da3ff', 'rarity-1-base': '#2a78d1',
  'rarity-2': '#9b7bff', 'rarity-2-base': '#5438c9',
  'rarity-3': '#ffc93c', 'rarity-3-base': '#c47a1c',
  // Focus-mode (workout) backgrounds: 0 = warm-up, 1–3 = card rarity. White text must stay readable on both stops.
  'focus-0-top': '#bf5200', 'focus-0': '#8f3d00',
  'focus-1-top': '#2a6fc0', 'focus-1': '#1d4f8f',
  'focus-2-top': '#6a4fe0', 'focus-2': '#4a2fb0',
  'focus-3-top': '#a86000', 'focus-3': '#8a4b00',
} as const

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio between two #rrggbb colours. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

export function applyPhase(phase: DayPhase, root: HTMLElement = document.documentElement): void {
  for (const [name, value] of Object.entries({ ...STATIC_TOKENS, ...PHASE_PALETTES[phase] })) {
    root.style.setProperty(`--${name}`, value)
  }
  root.dataset.phase = phase
  root.style.colorScheme = phase === 'night' ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', PHASE_PALETTES[phase]['sky-top'])
}
```

`src/design/phaseContext.ts`:

```ts
import { createContext, useContext } from 'react'
import type { DayPhase } from '../domain/dayPhase'

export const PhaseContext = createContext<DayPhase>('day')

export function usePhase(): DayPhase {
  return useContext(PhaseContext)
}
```

`src/design/PhaseProvider.tsx`:

```tsx
import { useLayoutEffect, type ReactNode } from 'react'
import { dayPhaseFor } from '../domain/dayPhase'
import { useNow } from '../hooks/useNow'
import { applyPhase } from './palette'
import { PhaseContext } from './phaseContext'

/** Re-checks the phase every 5 minutes and whenever the app becomes visible again. */
export function PhaseProvider({ children }: { children: ReactNode }) {
  const now = useNow(5 * 60_000)
  const phase = dayPhaseFor(new Date(now))
  useLayoutEffect(() => applyPhase(phase), [phase])
  return <PhaseContext.Provider value={phase}>{children}</PhaseContext.Provider>
}
```

`src/design/fonts.ts`:

```ts
// Self-hosted (works offline; precached by the service worker). Latin subset only.
import '@fontsource/fredoka/latin-600.css'
import '@fontsource/fredoka/latin-700.css'
import '@fontsource/nunito/latin-600.css'
import '@fontsource/nunito/latin-800.css'
```

`src/Root.tsx`:

```tsx
import { RouterProvider } from 'react-router'
import { AppDataProvider } from './data/AppData'
import { PhaseProvider } from './design/PhaseProvider'
import { router } from './router'

export function Root() {
  return (
    <PhaseProvider>
      <AppDataProvider>
        <RouterProvider router={router} />
      </AppDataProvider>
    </PhaseProvider>
  )
}
```

`src/main.tsx` (replace whole file):

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './design/fonts'
import { applyPhase } from './design/palette'
import { dayPhaseFor } from './domain/dayPhase'
import { Root } from './Root'
import './theme.css'

// Colours exist before the first paint.
applyPhase(dayPhaseFor(new Date()))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
```

- [ ] **Step 5: Install fonts and check the subset files exist**

```bash
npm install @fontsource/fredoka @fontsource/nunito
ls node_modules/@fontsource/fredoka/latin-600.css node_modules/@fontsource/fredoka/latin-700.css node_modules/@fontsource/nunito/latin-600.css node_modules/@fontsource/nunito/latin-800.css
```

Expected: all four paths listed.

- [ ] **Step 6: Rewrite `src/theme.css`**

Replace the whole file with:

```css
/* Pocket Gains theme. Colours are CSS variables set from src/design/palette.ts. */
:root {
  --radius: 16px;
  --radius-sm: 12px;
  --press: 4px;
  --font-display: 'Fredoka', 'Nunito', system-ui, sans-serif;
  --font-body: 'Nunito', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  /* legacy names, removed in Task 12 */
  --accent: var(--primary);
  --accent-2: var(--gold);
  --good: var(--success);
  --muted: var(--text-muted);
  --surface: var(--panel);
  --surface-2: var(--panel-border);
  --ink: var(--panel-sunken);
  font-family: var(--font-body);
  font-weight: 600;
}

* { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; }
body { background: var(--bg); color: var(--text); -webkit-tap-highlight-color: transparent; transition: background-color .6s; }
button, input, select { font: inherit; }
h1, h2, h3 { margin: 0; font-family: var(--font-display); font-weight: 700; letter-spacing: 0.01em; }
h1 { font-size: 28px; }
h2 { font-size: 20px; }
h3 { font-size: 17px; }
a { color: inherit; }

.screen { min-height: 100%; padding: 16px 16px 104px; max-width: 520px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }
.screen.full { padding-bottom: 24px; }
.stack { display: flex; flex-direction: column; gap: 12px; }
.row { display: flex; gap: 8px; align-items: center; }
.row.spread { justify-content: space-between; }
.center { display: flex; flex-direction: column; align-items: center; }
.row.center { flex-direction: row; justify-content: center; gap: 20px; }
.center-text { text-align: center; text-decoration: none; display: block; }
.panel { background: var(--panel); border: 2.5px solid var(--panel-border); border-radius: var(--radius); padding: 16px; box-shadow: 0 var(--press) 0 var(--panel-border); }
.muted { color: var(--text-muted); }
.label { font-size: 12px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); }
.big-number { font-family: var(--font-display); font-size: 76px; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1; }
.chip { display: inline-block; background: var(--panel-sunken); border: 2px solid var(--panel-border); border-radius: 999px; padding: 2px 10px; font-size: 13px; font-weight: 800; }

.btn {
  --btn-bg: var(--panel); --btn-base: var(--panel-border); --btn-fg: var(--text);
  position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  border: 2.5px solid var(--btn-base); border-radius: var(--radius); padding: 12px 16px; min-height: 48px;
  background: var(--btn-bg); color: var(--btn-fg); box-shadow: 0 var(--press) 0 var(--btn-base);
  font-family: var(--font-display); font-weight: 700; font-size: 17px; letter-spacing: 0.02em;
  text-decoration: none; cursor: pointer; transition: transform 60ms, box-shadow 60ms;
}
.btn:active:not(:disabled) { transform: translateY(var(--press)); box-shadow: 0 0 0 var(--btn-base); }
.btn:disabled { opacity: 0.45; cursor: default; }
.btn-primary { --btn-bg: var(--primary); --btn-base: var(--primary-base); --btn-fg: var(--on-color); font-size: 19px; }
.btn-good { --btn-bg: var(--success); --btn-base: var(--success-base); --btn-fg: var(--on-color); font-size: 19px; }
.btn-ghost { --btn-bg: transparent; }
.btn-danger { --btn-bg: transparent; --btn-base: transparent; --btn-fg: var(--danger); box-shadow: none; font-family: var(--font-body); font-weight: 800; font-size: 15px; }
.btn-block { width: 100%; display: flex; }
.round { width: 48px; height: 48px; min-height: 48px; padding: 0; border-radius: 50%; font-size: 22px; }

.tabbar { position: fixed; bottom: 0; left: 0; right: 0; z-index: 4; display: flex; justify-content: space-around; background: var(--panel); border-top: 2.5px solid var(--panel-border); padding: 6px 0 calc(8px + env(safe-area-inset-bottom)); }
.tab { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 64px; padding: 2px 4px; color: var(--text-muted); text-decoration: none; font-size: 11px; font-weight: 800; }
.tab-icon { width: 52px; height: 30px; border-radius: 999px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
.tab[aria-current='page'] { color: var(--text); }
.tab[aria-current='page'] .tab-icon { background: color-mix(in srgb, var(--primary) 18%, transparent); color: var(--primary-base); }

input[type='text'], input[type='email'], input[type='password'], select {
  width: 100%; padding: 12px; border-radius: var(--radius-sm); border: 2.5px solid var(--panel-border);
  background: var(--panel-sunken); color: var(--text); font-weight: 700;
}
select { width: auto; padding: 10px; }
input[type='checkbox'] { width: 22px; height: 22px; accent-color: var(--primary); }
.choice {
  display: flex; gap: 12px; align-items: flex-start; width: 100%; padding: 14px; text-align: left; cursor: pointer;
  border-radius: var(--radius); background: var(--panel); color: var(--text);
  border: 2.5px solid var(--panel-border); box-shadow: 0 var(--press) 0 var(--panel-border);
}
a.choice { text-decoration: none; }
.choice[aria-pressed='true'], .choice[aria-checked='true'] { border-color: var(--primary); box-shadow: 0 var(--press) 0 var(--primary-base); }

.bubble {
  position: relative; max-width: 260px; padding: 8px 12px; border-radius: 16px; text-align: center;
  background: var(--panel); color: var(--text); border: 2.5px solid var(--panel-border); box-shadow: 0 3px 0 var(--panel-border);
  font-weight: 800; font-size: 14px;
}
.bubble::after {
  content: ''; position: absolute; left: 50%; bottom: -9px; width: 14px; height: 14px; background: var(--panel);
  border-right: 2.5px solid var(--panel-border); border-bottom: 2.5px solid var(--panel-border); transform: translateX(-50%) rotate(45deg);
}

.sheet-backdrop { position: fixed; inset: 0; z-index: 10; display: flex; align-items: flex-end; justify-content: center; background: rgba(10, 14, 40, 0.55); }
.sheet { width: 100%; max-width: 520px; display: flex; flex-direction: column; gap: 10px; padding: 20px 16px calc(20px + env(safe-area-inset-bottom)); background: var(--bg); color: var(--text); border-radius: 24px 24px 0 0; }
.stepper-value { min-width: 36px; text-align: center; font-family: var(--font-display); font-size: 22px; font-weight: 700; }
.sources summary { cursor: pointer; color: var(--text-muted); font-size: 13px; }
.sources ul { font-size: 12px; color: var(--text-muted); padding-left: 18px; }

/* legacy:pet */
.xpbar { height: 8px; background: var(--ink); border-radius: 4px; overflow: hidden; width: 160px; }
.xpbar > div { height: 100%; background: var(--accent-2); }
@keyframes pet-squish { 0%, 100% { transform: translateY(0) scale(1, 1); } 40% { transform: translateY(-6px) scale(0.96, 1.04); } 80% { transform: translateY(0) scale(1.06, 0.94); } }
.pet-squish { animation: pet-squish 1.8s ease-in-out infinite; transform-origin: 50% 90%; }
@media (prefers-reduced-motion: reduce) { .pet-squish { animation: none; } }
.pet-stage { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 24px 0 8px; background: radial-gradient(circle at 50% 60%, var(--surface-2), var(--bg) 70%); border-radius: var(--radius); }
/* end legacy:pet */

/* legacy:tcg */
.tcg { background: linear-gradient(160deg, #ffcf5a, #f28c38); border-radius: 12px; padding: 6px; box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25); }
.tcg-inner { background: #fff8e7; color: #2b1d0e; border-radius: 8px; overflow: hidden; }
.tcg-head { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; font-weight: 800; }
.tcg-stars { color: #c0392b; font-size: 13px; }
.tcg-art { margin: 0 8px; height: 140px; border: 3px solid #d9a441; background: var(--surface-2); display: flex; align-items: center; justify-content: center; overflow: hidden; }
.tcg-art img { width: 100%; height: 100%; object-fit: cover; }
.tcg-type { font-size: 11px; font-style: italic; color: #8a6d3b; text-align: center; padding: 4px 8px; }
.tcg-stats { padding: 6px 10px; font-size: 13px; border-top: 1px solid #ecd9a8; display: flex; justify-content: space-between; }
.tcg-foot { padding: 8px 10px; border-top: 1px solid #ecd9a8; }
.tcg-foot .btn { width: 100%; min-height: 40px; padding: 8px; }
/* end legacy:tcg */

/* legacy:play */
.play { flex: 1; }
.ref { display: flex; gap: 10px; align-items: center; background: var(--surface); border: 0; border-radius: var(--radius); padding: 8px; color: var(--text); text-align: left; }
.ref img { width: 72px; height: 48px; object-fit: cover; border-radius: 6px; }
.demo { height: 220px; background: var(--surface-2); border-radius: var(--radius); display: flex; align-items: center; justify-content: center; overflow: hidden; }
.demo img { width: 100%; height: 100%; object-fit: contain; background: #fff; }
.topbar { display: flex; justify-content: space-between; align-items: center; }
.end-btn { min-height: 40px; padding: 6px 12px; }
/* end legacy:play */

/* legacy:decks */
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
.card-grid .tcg-art { height: 96px; }
.card-grid .tcg-stats { flex-direction: column; font-size: 12px; }
.unavailable { opacity: 0.45; }
/* end legacy:decks */

/* legacy:home */
.streak-row { padding: 0 4px; }
.streak { font-size: 20px; font-weight: 800; }
/* end legacy:home */

/* legacy:progress */
.stat { font-size: 28px; }
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
/* end legacy:progress */

/* legacy:profile */
.swatches { display: flex; gap: 10px; flex-wrap: wrap; }
.swatch { width: 40px; height: 40px; border-radius: 50%; border: 3px solid transparent; cursor: pointer; padding: 0; }
.swatch[aria-checked='true'] { border-color: var(--accent); box-shadow: 0 0 0 2px var(--bg) inset; }
.update-banner { position: fixed; left: 12px; right: 12px; bottom: calc(76px + env(safe-area-inset-bottom)); z-index: 5; background: var(--surface); border: 1px solid var(--accent); border-radius: var(--radius); padding: 12px; display: flex; flex-direction: column; gap: 8px; max-width: 496px; margin: 0 auto; }
/* end legacy:profile */
```

- [ ] **Step 7: Update the static theme colours**

In `index.html` change `<meta name="theme-color" content="#1e2433" />` to `<meta name="theme-color" content="#8fd3ff" />`.
In `vite.config.ts` change `background_color: '#1e2433',` to `background_color: '#eef7fd',` and `theme_color: '#1e2433',` to `theme_color: '#8fd3ff',`.

- [ ] **Step 8: Run tests, typecheck and build**

Run: `npx vitest run src/domain/dayPhase.test.ts src/design && npm test && npm run typecheck && npm run build`
Expected: new tests PASS; full suite PASS (180 + new); typecheck and build OK. `dist/assets` contains `fredoka-latin-600-normal-*.woff2` and `nunito-latin-800-normal-*.woff2`.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(design): day-phase palette, self-hosted fonts and the new base theme"
```

---

### Task 2: Sound and vibration feedback

**Files:**
- Create: `src/feedback/kinds.ts`, `src/feedback/settings.ts`, `src/feedback/sound.ts`, `src/feedback/haptics.ts`, `src/feedback/feedback.ts`, `src/feedback/useTapFeedback.ts`, tests `src/feedback/settings.test.ts`, `src/feedback/feedback.test.ts`, `src/feedback/haptics.test.ts`, `src/feedback/sound.test.ts`, `src/feedback/useTapFeedback.test.tsx`
- Modify: `src/Root.tsx`, `src/screens/PlayScreen.tsx:88`

**Interfaces:**
- Consumes: nothing.
- Produces: `type FeedbackKind = 'tap' | 'log' | 'restDone' | 'celebrate' | 'levelUp' | 'petTap'`; `interface FeedbackSettings { sound: boolean; vibration: boolean }`; `loadFeedbackSettings(): FeedbackSettings`; `saveFeedbackSettings(s: FeedbackSettings): void`; `playSound(kind)`; `vibrate(kind)`; `feedback(kind: FeedbackKind): void`; `tapKindFor(target: EventTarget | null): FeedbackKind | null`; `useTapFeedback(): void`. Buttons opt into a kind with `data-feedback="log"` (or `"none"` to stay silent).

- [ ] **Step 1: Write the failing tests**

`src/feedback/settings.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_FEEDBACK, loadFeedbackSettings, saveFeedbackSettings } from './settings'

describe('feedback settings', () => {
  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('defaults to sound and vibration on', () => {
    expect(loadFeedbackSettings()).toEqual({ sound: true, vibration: true })
    expect(DEFAULT_FEEDBACK).toEqual({ sound: true, vibration: true })
  })

  it('remembers the choice on this device', () => {
    saveFeedbackSettings({ sound: false, vibration: true })
    expect(loadFeedbackSettings()).toEqual({ sound: false, vibration: true })
  })

  it('falls back to defaults for junk or missing fields', () => {
    localStorage.setItem('pg.feedback', '{not json')
    expect(loadFeedbackSettings()).toEqual({ sound: true, vibration: true })
    localStorage.setItem('pg.feedback', JSON.stringify({ sound: 'no' }))
    expect(loadFeedbackSettings()).toEqual({ sound: true, vibration: true })
  })

  it('never throws when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    expect(loadFeedbackSettings()).toEqual({ sound: true, vibration: true })
    expect(() => saveFeedbackSettings({ sound: false, vibration: false })).not.toThrow()
  })
})
```

`src/feedback/haptics.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { vibrate } from './haptics'

describe('vibrate', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'vibrate')
  })

  it('plays the pattern for each kind', () => {
    const spy = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: spy, configurable: true })
    vibrate('tap')
    vibrate('log')
    vibrate('restDone')
    expect(spy.mock.calls).toEqual([[10], [[20, 40, 20]], [300]])
  })

  it('does nothing on devices without vibration', () => {
    expect(() => vibrate('tap')).not.toThrow()
  })
})
```

`src/feedback/sound.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { playSound } from './sound'

describe('playSound', () => {
  it('is a silent no-op without Web Audio (jsdom has none)', () => {
    expect(() => playSound('celebrate')).not.toThrow()
  })
})
```

`src/feedback/feedback.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('./sound', () => ({ playSound: vi.fn() }))
vi.mock('./haptics', () => ({ vibrate: vi.fn() }))

const { feedback } = await import('./feedback')
const { playSound } = await import('./sound')
const { vibrate } = await import('./haptics')
const { saveFeedbackSettings } = await import('./settings')

describe('feedback', () => {
  afterEach(() => {
    localStorage.clear()
    vi.mocked(playSound).mockClear()
    vi.mocked(vibrate).mockClear()
  })

  it('plays sound and vibration by default', () => {
    feedback('log')
    expect(playSound).toHaveBeenCalledWith('log')
    expect(vibrate).toHaveBeenCalledWith('log')
  })

  it('respects each switch', () => {
    saveFeedbackSettings({ sound: false, vibration: true })
    feedback('tap')
    expect(playSound).not.toHaveBeenCalled()
    expect(vibrate).toHaveBeenCalledWith('tap')

    saveFeedbackSettings({ sound: true, vibration: false })
    feedback('tap')
    expect(playSound).toHaveBeenCalledWith('tap')
    expect(vibrate).toHaveBeenCalledTimes(1)
  })
})
```

`src/feedback/useTapFeedback.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('./feedback', () => ({ feedback: vi.fn() }))
const { feedback } = await import('./feedback')
const { tapKindFor, useTapFeedback } = await import('./useTapFeedback')

function Harness() {
  useTapFeedback()
  return (
    <div>
      <button className="btn">Plain</button>
      <button className="btn" data-feedback="log">Log</button>
      <button className="btn" data-feedback="none">Quiet</button>
      <label className="choice"><input type="checkbox" /> Dumbbells</label>
      <p>Text</p>
    </div>
  )
}

describe('tap feedback', () => {
  afterEach(() => vi.mocked(feedback).mockClear())

  it('picks the kind from the nearest button', () => {
    render(<Harness />)
    expect(tapKindFor(screen.getByText('Plain'))).toBe('tap')
    expect(tapKindFor(screen.getByText('Log'))).toBe('log')
    expect(tapKindFor(screen.getByText('Quiet'))).toBeNull()
    expect(tapKindFor(screen.getByText('Text'))).toBeNull()
    expect(tapKindFor(null)).toBeNull()
  })

  it('gives feedback when a button is tapped', () => {
    render(<Harness />)
    fireEvent.click(screen.getByText('Plain'))
    expect(feedback).toHaveBeenCalledWith('tap')
  })

  it('gives one feedback per tap, even for a label that also clicks its checkbox', () => {
    render(<Harness />)
    fireEvent.click(screen.getByText(/Dumbbells/)) // label click + synthetic input click
    expect(feedback).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/feedback`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

`src/feedback/kinds.ts`:

```ts
export type FeedbackKind = 'tap' | 'log' | 'restDone' | 'celebrate' | 'levelUp' | 'petTap'
```

`src/feedback/settings.ts`:

```ts
export interface FeedbackSettings {
  sound: boolean
  vibration: boolean
}

const KEY = 'pg.feedback'
export const DEFAULT_FEEDBACK: FeedbackSettings = { sound: true, vibration: true }

/** Per-device; storage may be blocked or hold junk, so every read falls back to the defaults. */
export function loadFeedbackSettings(): FeedbackSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_FEEDBACK }
    const parsed: unknown = JSON.parse(raw)
    const p = (parsed ?? {}) as Partial<Record<keyof FeedbackSettings, unknown>>
    return {
      sound: typeof p.sound === 'boolean' ? p.sound : DEFAULT_FEEDBACK.sound,
      vibration: typeof p.vibration === 'boolean' ? p.vibration : DEFAULT_FEEDBACK.vibration,
    }
  } catch {
    return { ...DEFAULT_FEEDBACK }
  }
}

export function saveFeedbackSettings(s: FeedbackSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // Private mode or full storage: the switch still works for this visit.
  }
}
```

`src/feedback/haptics.ts`:

```ts
import type { FeedbackKind } from './kinds'

const PATTERNS: Record<FeedbackKind, number | number[]> = {
  tap: 10,
  log: [20, 40, 20],
  restDone: 300,
  celebrate: [30, 60, 30],
  levelUp: [40, 60, 40, 60, 80],
  petTap: 15,
}

export function vibrate(kind: FeedbackKind): void {
  try {
    navigator.vibrate?.(PATTERNS[kind])
  } catch {
    // Some browsers throw when vibration is blocked; feedback is never essential.
  }
}
```

`src/feedback/sound.ts`:

```ts
import type { FeedbackKind } from './kinds'

/** freq (Hz), start offset and duration (s), optional glide target. */
interface Note { f: number; t: number; d: number; to?: number; type?: OscillatorType }

const SOUNDS: Record<FeedbackKind, Note[]> = {
  tap: [{ f: 520, t: 0, d: 0.05, to: 380 }],
  log: [{ f: 880, t: 0, d: 0.06, type: 'triangle' }, { f: 1320, t: 0.05, d: 0.09, type: 'triangle' }],
  restDone: [{ f: 523, t: 0, d: 0.12 }, { f: 659, t: 0.1, d: 0.12 }, { f: 784, t: 0.2, d: 0.22 }],
  celebrate: [{ f: 523, t: 0, d: 0.1 }, { f: 659, t: 0.1, d: 0.1 }, { f: 784, t: 0.2, d: 0.1 }, { f: 1047, t: 0.3, d: 0.32 }],
  levelUp: [
    { f: 392, t: 0, d: 0.1 }, { f: 523, t: 0.1, d: 0.1 }, { f: 659, t: 0.2, d: 0.1 },
    { f: 784, t: 0.3, d: 0.1 }, { f: 1047, t: 0.4, d: 0.45 },
  ],
  petTap: [{ f: 700, t: 0, d: 0.07, to: 950 }, { f: 760, t: 0.08, d: 0.07, to: 1050 }],
}
const GAIN = 0.08

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (ctx) return ctx
  const w = window as typeof window & { webkitAudioContext?: typeof AudioContext }
  const AC = w.AudioContext ?? w.webkitAudioContext
  if (!AC) return null
  ctx = new AC()
  return ctx
}

/** Short synthesized sounds; created lazily, so the first one always follows a user gesture. */
export function playSound(kind: FeedbackKind): void {
  try {
    const ac = audio()
    if (!ac) return
    if (ac.state === 'suspended') void ac.resume()
    const now = ac.currentTime
    for (const n of SOUNDS[kind]) {
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      const start = now + n.t
      osc.type = n.type ?? 'sine'
      osc.frequency.setValueAtTime(n.f, start)
      if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to, start + n.d)
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(GAIN, start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + n.d)
      osc.connect(gain).connect(ac.destination)
      osc.start(start)
      osc.stop(start + n.d + 0.02)
    }
  } catch {
    // Audio is a nicety; never let it break a tap.
  }
}
```

`src/feedback/feedback.ts`:

```ts
import { vibrate } from './haptics'
import type { FeedbackKind } from './kinds'
import { loadFeedbackSettings } from './settings'
import { playSound } from './sound'

export function feedback(kind: FeedbackKind): void {
  const s = loadFeedbackSettings()
  if (s.sound) playSound(kind)
  if (s.vibration) vibrate(kind)
}
```

`src/feedback/useTapFeedback.ts`:

```ts
import { useEffect } from 'react'
import { feedback } from './feedback'
import type { FeedbackKind } from './kinds'

const TAPPABLE = '[data-feedback], .btn, .choice, .tab, .swatch'
const KINDS: FeedbackKind[] = ['tap', 'log', 'restDone', 'celebrate', 'levelUp', 'petTap']
/** A label click also clicks its input; both arrive within a few ms. */
const SAME_TAP_MS = 60

export function tapKindFor(target: EventTarget | null): FeedbackKind | null {
  if (!(target instanceof Element)) return null
  const el = target.closest<HTMLElement>(TAPPABLE)
  if (!el || el.matches(':disabled') || el.getAttribute('aria-disabled') === 'true') return null
  const kind = el.dataset.feedback
  if (kind === 'none') return null
  return KINDS.find((k) => k === kind) ?? 'tap'
}

/** One listener gives every button its tap sound and vibration. */
export function useTapFeedback(): void {
  useEffect(() => {
    let last = 0
    const onClick = (e: MouseEvent) => {
      const kind = tapKindFor(e.target)
      if (!kind) return
      const now = performance.now()
      if (now - last < SAME_TAP_MS) return
      last = now
      feedback(kind)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])
}
```

`src/Root.tsx` — add the hook:

```tsx
import { RouterProvider } from 'react-router'
import { AppDataProvider } from './data/AppData'
import { PhaseProvider } from './design/PhaseProvider'
import { useTapFeedback } from './feedback/useTapFeedback'
import { router } from './router'

export function Root() {
  useTapFeedback()
  return (
    <PhaseProvider>
      <AppDataProvider>
        <RouterProvider router={router} />
      </AppDataProvider>
    </PhaseProvider>
  )
}
```

`src/screens/PlayScreen.tsx`: add `import { feedback } from '../feedback/feedback'` and replace `navigator.vibrate?.(300)` with `feedback('restDone')`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/feedback && npm test`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(feedback): tap sounds and vibration with per-device switches"
```

---

### Task 3: Icons, Pill, XpBar, Ring, Pips and the tab bar

**Files:**
- Create: `src/ui/Icon.tsx`, `src/ui/Icon.test.tsx`, `src/ui/Pill.tsx`, `src/ui/XpBar.tsx`, `src/ui/XpBar.test.tsx`, `src/ui/ring.ts`, `src/ui/ring.test.ts`, `src/ui/Ring.tsx`, `src/ui/Pips.tsx`
- Modify: `src/ui/TabBar.tsx`, `src/theme.css`

**Interfaces:**
- Produces: `type IconName` (list below); `Icon({ name, size = 22, label?, className? })`; `ICON_NAMES: IconName[]`; `Pill({ icon?, tone?: 'plain' | 'flame' | 'shield' | 'good', label?, className?, role?, children })`; `XpBar({ value, max, label })` (role `progressbar`); `ringOffset(value: number, circumference: number): number`; `Ring({ value, size = 220, thickness = 9, color = 'var(--primary)', track = 'var(--panel-border)', children? })`; `Pips({ done, total })`.

- [ ] **Step 1: Write the failing tests**

`src/ui/Icon.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Icon, ICON_NAMES } from './Icon'

describe('Icon', () => {
  it('is decorative unless labelled', () => {
    const { container } = render(<Icon name="flame" />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    render(<Icon name="shield" label="Shield" />)
    expect(screen.getByRole('img', { name: 'Shield' })).toBeInTheDocument()
  })

  it('draws every icon in the set', () => {
    for (const name of ICON_NAMES) {
      const { container, unmount } = render(<Icon name={name} />)
      expect(container.querySelector('svg')!.childElementCount).toBeGreaterThan(0)
      unmount()
    }
  })
})
```

`src/ui/ring.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { ringOffset } from './ring'

describe('ringOffset', () => {
  it('maps 0..1 to a full..empty dash offset and clamps the rest', () => {
    expect(ringOffset(0, 100)).toBe(100)
    expect(ringOffset(0.25, 100)).toBe(75)
    expect(ringOffset(1, 100)).toBe(0)
    expect(ringOffset(1.6, 100)).toBe(0)
    expect(ringOffset(-1, 100)).toBe(100)
    expect(ringOffset(Number.NaN, 100)).toBe(100)
  })
})
```

`src/ui/XpBar.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { XpBar } from './XpBar'

describe('XpBar', () => {
  it('reports progress and fills to the right width', async () => {
    const { container } = render(<XpBar value={30} max={60} label="30 of 60 XP to next level" />)
    const bar = screen.getByRole('progressbar', { name: '30 of 60 XP to next level' })
    expect(bar).toHaveAttribute('aria-valuenow', '30')
    expect(bar).toHaveAttribute('aria-valuemax', '60')
    await waitFor(() => expect(container.querySelector('.xpbar-fill')).toHaveStyle({ width: '50%' }))
  })

  it('never overflows', async () => {
    const { container } = render(<XpBar value={90} max={60} label="full" />)
    await waitFor(() => expect(container.querySelector('.xpbar-fill')).toHaveStyle({ width: '100%' }))
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/ui/Icon.test.tsx src/ui/ring.test.ts src/ui/XpBar.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

`src/ui/Icon.tsx`:

```tsx
import type { ReactNode } from 'react'

const F = { fill: 'currentColor', fillOpacity: 0.18 }

const PATHS = {
  home: <><path d="M4 11 12 4l8 7" /><path d="M6 10v9h12v-9" {...F} /><path d="M10 19v-5h4v5" /></>,
  decks: <><rect x="7" y="3" width="12" height="16" rx="2.5" {...F} /><path d="M5 7v12a2 2 0 0 0 2 2h9" /></>,
  progress: <><path d="M4 20h16" /><rect x="5.5" y="12" width="3" height="5" rx="1" /><rect x="10.5" y="8" width="3" height="9" rx="1" /><rect x="15.5" y="4" width="3" height="13" rx="1" /></>,
  profile: <><circle cx="12" cy="8" r="4" {...F} /><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
  flame: <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 2 1.2 3 2.2 3C11 8.5 11 6 12 3Z" fill="currentColor" fillOpacity={0.3} />,
  shield: <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z" {...F} />,
  timer: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M10 2h4" /></>,
  muscle: <path d="M4 15c2-1 3-4 4-7l2-3 3 1-1 3 2 1c3 0 6 2 6 6 0 3-3 4-6 4H8c-2 0-4-2-4-5Z" {...F} />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  bell: <><path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Z" {...F} /><path d="M10 20.5a2 2 0 0 0 4 0" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2.5" {...F} /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>,
  star: <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9L12 3.5Z" fill="currentColor" fillOpacity={0.3} />,
  sound: <><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4Z" {...F} /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></>,
  vibrate: <><rect x="8" y="4" width="8" height="16" rx="2" /><path d="M4.5 8v8M19.5 8v8" /></>,
  settings: <><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></>,
  'chevron-left': <path d="m15 5-7 7 7 7" />,
  'chevron-right': <path d="m9 5 7 7-7 7" />,
  play: <path d="M8 5.5v13l10-6.5-10-6.5Z" fill="currentColor" />,
  swap: <path d="M4 8h13l-3-3M20 16H7l3 3" />,
  dice: <><rect x="4" y="4" width="16" height="16" rx="4" /><circle cx="9" cy="9" r="1.2" fill="currentColor" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /><circle cx="15" cy="15" r="1.2" fill="currentColor" /></>,
  sparkle: <path d="M12 3c.6 4.5 2.5 6.4 7 7-4.5.6-6.4 2.5-7 7-.6-4.5-2.5-6.4-7-7 4.5-.6 6.4-2.5 7-7Z" fill="currentColor" fillOpacity={0.3} />,
  moon: <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z" {...F} />,
  sun: <><circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity={0.3} /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>,
  'face-happy': <><circle cx="12" cy="12" r="9" {...F} /><path d="M8.5 14c1.8 2 5.2 2 7 0M9 9.5v1M15 9.5v1" /></>,
  'face-meh': <><circle cx="12" cy="12" r="9" {...F} /><path d="M8.5 15h7M9 9.5v1M15 9.5v1" /></>,
  'face-sore': <><circle cx="12" cy="12" r="9" {...F} /><path d="M8.5 16c1.8-2 5.2-2 7 0M8 9l2 1.2M16 9l-2 1.2" /></>,
  bulb: <><path d="M9 17h6M10 20.5h4" /><path d="M12 3.5a6 6 0 0 0-3.5 10.9V17h7v-2.6A6 6 0 0 0 12 3.5Z" {...F} /></>,
  warning: <><path d="M12 4 2.8 19.5h18.4L12 4Z" {...F} /><path d="M12 10v4.5M12 17.2v.1" /></>,
  dots: <path d="M6 12h.01M12 12h.01M18 12h.01" strokeWidth={3.4} />,
  video: <><rect x="3" y="6" width="13" height="12" rx="3" {...F} /><path d="m16 10.5 5-3v9l-5-3" /></>,
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof PATHS
export const ICON_NAMES = Object.keys(PATHS) as IconName[]

/** Rounded hand-drawn icons in `currentColor`. Decorative unless `label` is given. */
export function Icon({ name, size = 22, label, className }: { name: IconName; size?: number; label?: string; className?: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}
      strokeLinecap="round" strokeLinejoin="round" className={className ? `icon ${className}` : 'icon'}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      {PATHS[name]}
    </svg>
  )
}
```

Note: `react/only-export-components` may warn about `ICON_NAMES`; it is a constant export, which the lint config allows.

`src/ui/Pill.tsx`:

```tsx
import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

export function Pill({ icon, tone = 'plain', label, className, role, children }: {
  icon?: IconName
  tone?: 'plain' | 'flame' | 'shield' | 'good'
  label?: string
  className?: string
  role?: string
  children: ReactNode
}) {
  return (
    <span className={`pill pill-${tone}${className ? ` ${className}` : ''}`} aria-label={label} role={role}>
      {icon && <Icon name={icon} size={18} />}
      <span>{children}</span>
    </span>
  )
}
```

`src/ui/XpBar.tsx`:

```tsx
import { useEffect, useState } from 'react'

/** Starts empty and fills (with a little overshoot, see theme.css) to the current value. */
export function XpBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  const [shown, setShown] = useState(0)
  useEffect(() => setShown(pct), [pct])
  return (
    <div className="xpbar" role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className="xpbar-fill" style={{ width: `${shown}%` }} />
    </div>
  )
}
```

`src/ui/ring.ts`:

```ts
/** Dash offset for a progress ring: 0 shows nothing, 1 the full circle. */
export function ringOffset(value: number, circumference: number): number {
  const v = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
  return circumference * (1 - v)
}
```

`src/ui/Ring.tsx`:

```tsx
import type { ReactNode } from 'react'
import { ringOffset } from './ring'

export function Ring({ value, size = 220, thickness = 9, color = 'var(--primary)', track = 'var(--panel-border)', children }: {
  value: number
  size?: number
  thickness?: number
  color?: string
  track?: string
  children?: ReactNode
}) {
  const r = 50 - thickness / 2
  const c = 2 * Math.PI * r
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" stroke={track} strokeWidth={thickness} />
        <circle
          className="ring-fill" cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth={thickness} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={ringOffset(value, c)} transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  )
}
```

`src/ui/Pips.tsx`:

```tsx
/** Set progress: done pips filled, the current one highlighted. */
export function Pips({ done, total }: { done: number; total: number }) {
  return (
    <span className="pips" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => <i key={i} className={i < done ? 'on' : i === done ? 'now' : undefined} />)}
    </span>
  )
}
```

`src/ui/TabBar.tsx` (replace whole file):

```tsx
import { NavLink } from 'react-router'
import { Icon, type IconName } from './Icon'

const TABS: { to: string; icon: IconName; label: string; end: boolean }[] = [
  { to: '/', icon: 'home', label: 'Home', end: true },
  { to: '/decks', icon: 'decks', label: 'Decks', end: false },
  { to: '/progress', icon: 'progress', label: 'Progress', end: false },
  { to: '/profile', icon: 'profile', label: 'Profile', end: false },
]

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end} className="tab">
          <span className="tab-icon"><Icon name={t.icon} size={24} /></span>
          <span className="tab-label">{t.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 4: Styles**

In `src/theme.css`, delete these two lines inside `/* legacy:pet */`:

```css
.xpbar { height: 8px; background: var(--ink); border-radius: 4px; overflow: hidden; width: 160px; }
.xpbar > div { height: 100%; background: var(--accent-2); }
```

and append:

```css
/* kit: small parts */
.icon { flex: none; }
.pill { display: inline-flex; align-items: center; gap: 5px; padding: 5px 12px; border-radius: 999px; background: var(--panel); color: var(--text); border: 2px solid var(--panel-border); font-weight: 800; font-size: 14px; }
.pill-flame .icon { color: var(--primary); }
.pill-shield .icon { color: var(--rarity-1-base); }
.pill-good .icon { color: var(--success); }
.pill.pop { animation: pill-pop 0.7s cubic-bezier(0.3, 1.6, 0.5, 1); }
@keyframes pill-pop { 0% { transform: scale(0.6); } 60% { transform: scale(1.15); } 100% { transform: scale(1); } }
.xpbar { width: 190px; height: 14px; border-radius: 999px; overflow: hidden; background: var(--panel-sunken); border: 2px solid var(--panel-border); }
.xpbar-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--gold), var(--primary)); transition: width 0.9s cubic-bezier(0.34, 1.56, 0.64, 1); }
.ring { position: relative; flex: none; }
.ring svg { display: block; width: 100%; height: 100%; }
.ring-fill { transition: stroke-dashoffset 0.3s; }
.ring-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.pips { display: inline-flex; gap: 6px; }
.pips i { display: block; width: 24px; height: 8px; border-radius: 4px; background: currentColor; opacity: 0.3; }
.pips i.on { opacity: 1; }
.pips i.now { opacity: 1; background: var(--gold); }
@media (prefers-reduced-motion: reduce) {
  .pill.pop { animation: none; }
  .xpbar-fill, .ring-fill { transition: none; }
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/ui && npm test`
Expected: all PASS (TabBar test unchanged and green).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(ui): icon set, pill, XP bar, progress ring and pips; icon tab bar"
```

---

### Task 4: Pet moods, the animated pet and the meadow scene

**Files:**
- Create: `src/domain/petMood.ts`, `src/domain/petMood.test.ts`, `src/ui/Pet.tsx`, `src/ui/Pet.test.tsx`, `src/ui/MeadowScene.tsx`, `src/ui/MeadowScene.test.tsx`
- Delete: `src/ui/PetSprite.tsx`, `src/ui/PetSprite.test.tsx`
- Modify (PetSprite → Pet): `src/screens/HomeScreen.tsx`, `src/screens/SummaryScreen.tsx`, `src/screens/ProfileScreen.tsx`, `src/screens/OnboardingScreen.tsx`, `src/screens/play/RestView.tsx`, `src/screens/play/SetView.tsx`, `src/screens/play/TutorialView.tsx`, `src/ui/TcgCard.tsx`; `src/theme.css`

**Interfaces:**
- Consumes: `DayPhase` (Task 1), `StreakInfo['days']` / `DayInfo` from `src/domain/streak.ts`, `addDays`, `dateKey` from `src/domain/dates.ts`, `PET_PALETTES`, `PetColorContext` from `src/ui/petColor.ts`.
- Produces: `type PetMood = 'happy' | 'excited' | 'proud' | 'relaxed' | 'sleepy' | 'missed'`; `petMood(i: { phase: DayPhase; plannedToday: boolean; trainedToday: boolean; missedYesterday: boolean }): PetMood`; `missedYesterday(days: Map<string, DayInfo>, today: Date): boolean`; `Pet({ size = 160, mood = 'happy', color?, onTap? })` — svg `role="img"` named "Your pet", wrapper `data-mood`; `MeadowScene({ height = 300, className?, children? })`.

- [ ] **Step 1: Write the failing tests**

`src/domain/petMood.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { missedYesterday, petMood } from './petMood'
import type { DayInfo } from './streak'

const base = { phase: 'day' as const, plannedToday: true, trainedToday: false, missedYesterday: false }

describe('petMood', () => {
  it('follows the priority: proud > sleepy > missed > excited > relaxed', () => {
    expect(petMood({ ...base, trainedToday: true, phase: 'night', missedYesterday: true })).toBe('proud')
    expect(petMood({ ...base, phase: 'night', missedYesterday: true })).toBe('sleepy')
    expect(petMood({ ...base, missedYesterday: true })).toBe('missed')
    expect(petMood(base)).toBe('excited')
    expect(petMood({ ...base, plannedToday: false })).toBe('relaxed')
  })
})

describe('missedYesterday', () => {
  const day = (key: string, status: DayInfo['status']): [string, DayInfo] => [key, { key, status, deckId: 'push' }]

  it('is true when yesterday was a planned day without training (shielded or not)', () => {
    const today = new Date(2026, 9, 13, 9)
    expect(missedYesterday(new Map([day('2026-10-12', 'missed')]), today)).toBe(true)
    expect(missedYesterday(new Map([day('2026-10-12', 'shielded')]), today)).toBe(true)
    expect(missedYesterday(new Map([day('2026-10-12', 'done')]), today)).toBe(false)
    expect(missedYesterday(new Map([day('2026-10-12', 'rest')]), today)).toBe(false)
    expect(missedYesterday(new Map(), today)).toBe(false)
  })
})
```

`src/ui/Pet.test.tsx` (replaces `PetSprite.test.tsx`):

```tsx
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Pet } from './Pet'
import { PetColorContext, PET_PALETTES } from './petColor'

const wrapper = (c: HTMLElement) => c.querySelector('.pet') as HTMLElement

describe('Pet', () => {
  afterEach(() => vi.useRealTimers())

  it('draws a smooth blob in the chosen colour, from the prop or context', () => {
    const { container, unmount } = render(<Pet color="peach" />)
    expect(screen.getByRole('img', { name: 'Your pet' })).toBeInTheDocument()
    expect(container.querySelector('rect')).toBeNull()
    expect(container.querySelector('[data-part="body"]')).toHaveAttribute('fill', PET_PALETTES.peach.body)
    unmount()
    const r = render(<PetColorContext.Provider value="lavender"><Pet /></PetColorContext.Provider>)
    expect(r.container.querySelector('[data-part="body"]')).toHaveAttribute('fill', PET_PALETTES.lavender.body)
  })

  it('shows its mood', () => {
    const { container, rerender } = render(<Pet mood="sleepy" />)
    expect(wrapper(container)).toHaveAttribute('data-mood', 'sleepy')
    expect(container.querySelector('.pet-z')).not.toBeNull()
    rerender(<Pet mood="proud" />)
    expect(container.querySelector('.pet-sparkles')).not.toBeNull()
  })

  it('perks up for 3 seconds when tapped', () => {
    vi.useFakeTimers()
    const onTap = vi.fn()
    const { container } = render(<Pet mood="sleepy" onTap={onTap} />)
    fireEvent.click(wrapper(container))
    expect(onTap).toHaveBeenCalledTimes(1)
    expect(wrapper(container)).toHaveAttribute('data-mood', 'excited')
    act(() => vi.advanceTimersByTime(3000))
    expect(wrapper(container)).toHaveAttribute('data-mood', 'sleepy')
  })
})
```

`src/ui/MeadowScene.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MeadowScene } from './MeadowScene'

describe('MeadowScene', () => {
  it('shows its content over decorative sky and hill', () => {
    const { container } = render(<MeadowScene><p>Hello</p></MeadowScene>)
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(container.querySelector('.meadow-sky')).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('.meadow-hill')).toHaveAttribute('aria-hidden', 'true')
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/domain/petMood.test.ts src/ui/Pet.test.tsx src/ui/MeadowScene.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

`src/domain/petMood.ts`:

```ts
import { addDays, dateKey } from './dates'
import type { DayPhase } from './dayPhase'
import type { DayInfo } from './streak'

export type PetMood = 'happy' | 'excited' | 'proud' | 'relaxed' | 'sleepy' | 'missed'

export interface MoodInput {
  phase: DayPhase
  plannedToday: boolean
  trainedToday: boolean
  missedYesterday: boolean
}

/** Never sad or guilt-tripping: a missed day only makes the pet hopeful. */
export function petMood(i: MoodInput): PetMood {
  if (i.trainedToday) return 'proud'
  if (i.phase === 'night') return 'sleepy'
  if (i.missedYesterday) return 'missed'
  if (i.plannedToday) return 'excited'
  return 'relaxed'
}

/** Yesterday was a training day without a counted session (a shield covering it still counts as missed). */
export function missedYesterday(days: Map<string, DayInfo>, today: Date): boolean {
  const status = days.get(dateKey(addDays(today, -1)))?.status
  return status === 'missed' || status === 'shielded'
}
```

`src/ui/Pet.tsx`:

```tsx
import { useContext, useEffect, useState } from 'react'
import type { PetMood } from '../domain/petMood'
import type { PetColor } from '../domain/types'
import { PET_PALETTES, PetColorContext } from './petColor'

const INK = '#2d2d2d'
const TAP_MS = 3000

function Eyes({ mood }: { mood: PetMood }) {
  const line = { stroke: INK, strokeWidth: 2.4, fill: 'none', strokeLinecap: 'round' as const }
  if (mood === 'relaxed') return <g><path d="M35 58 Q40 53 45 58" {...line} /><path d="M55 58 Q60 53 65 58" {...line} /></g>
  if (mood === 'sleepy') return <g><path d="M35 58 Q40 61 45 58" {...line} /><path d="M55 58 Q60 61 65 58" {...line} /></g>
  const shine = mood === 'excited' ? 2.6 : 1.8
  return (
    <g className="pet-eyes">
      <ellipse cx="40" cy="58" rx="5" ry="6.5" fill={INK} />
      <ellipse cx="60" cy="58" rx="5" ry="6.5" fill={INK} />
      <g className="pet-pupils">
        <circle cx="41.5" cy="55.5" r={shine} fill="#fff" />
        <circle cx="61.5" cy="55.5" r={shine} fill="#fff" />
      </g>
    </g>
  )
}

function Mouth({ mood }: { mood: PetMood }) {
  if (mood === 'excited' || mood === 'proud') return <path d="M44 65 Q50 75 56 65 Z" fill={INK} />
  if (mood === 'sleepy') return <ellipse cx="50" cy="68" rx="2.2" ry="2.6" fill={INK} />
  return <path d="M46 67 Q50 71 54 67" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
}

/** The kawaii blob with moods, blinking and a jump when tapped. Body traits (M4) will reshape the arms and brow. */
export function Pet({ size = 160, mood = 'happy', color, onTap }: {
  size?: number
  mood?: PetMood
  color?: PetColor
  onTap?: () => void
}) {
  const fromContext = useContext(PetColorContext)
  const p = PET_PALETTES[color ?? fromContext]
  const [tappedAt, setTappedAt] = useState(0)
  const [blinkDelay] = useState(() => `${(Math.random() * 4).toFixed(2)}s`)
  useEffect(() => {
    if (!tappedAt) return
    const id = window.setTimeout(() => setTappedAt(0), TAP_MS)
    return () => window.clearTimeout(id)
  }, [tappedAt])
  const shown: PetMood = tappedAt ? 'excited' : mood

  return (
    <div
      className={`pet${tappedAt ? ' pet-jump' : ''}`} data-mood={shown} data-tappable={onTap ? 'true' : undefined}
      style={{ width: size, height: size, ['--blink-delay' as string]: blinkDelay }}
      onClick={onTap ? () => { setTappedAt(Date.now()); onTap() } : undefined}
    >
      <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Your pet">
        <ellipse cx="50" cy="94" rx="26" ry="4" fill="#000" opacity=".12" />
        <g className="pet-body">
          <circle cx="38" cy="30" r="7" fill={p.shade} />
          <circle cx="62" cy="30" r="7" fill={p.shade} />
          <path data-part="body" d="M22 70 Q18 30 50 26 Q82 30 78 70 Q76 92 50 92 Q24 92 22 70Z" fill={p.body} />
          {shown === 'missed' && (
            <g stroke={INK} strokeWidth="2" strokeLinecap="round">
              <path d="M34 49 L44 46" />
              <path d="M66 49 L56 46" />
            </g>
          )}
          <Eyes mood={shown} />
          <ellipse cx="31" cy="68" rx="5" ry="3" fill={p.blush} opacity=".8" />
          <ellipse cx="69" cy="68" rx="5" ry="3" fill={p.blush} opacity=".8" />
          <Mouth mood={shown} />
          <ellipse cx="21" cy="74" rx="5" ry="7" fill={p.shade} />
          <ellipse cx="79" cy="74" rx="5" ry="7" fill={p.shade} />
        </g>
        {shown === 'proud' && (
          <g className="pet-sparkles" fill="#ffd34d">
            <path d="M14 24 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" />
            <path d="M86 38 l1.5 3.5 3.5 1.5 -3.5 1.5 -1.5 3.5 -1.5 -3.5 -3.5 -1.5 3.5 -1.5z" />
          </g>
        )}
        {shown === 'sleepy' && (
          <g className="pet-z" fill="currentColor" fontFamily="var(--font-display)" fontWeight="700">
            <text x="74" y="30" fontSize="11">z</text>
            <text x="83" y="19" fontSize="8">z</text>
          </g>
        )}
      </svg>
    </div>
  )
}
```

`src/ui/MeadowScene.tsx`:

```tsx
import type { ReactNode } from 'react'

/** Sky (follows the day phase via CSS), drifting clouds or stars, and a grassy hill for the pet to stand on. */
export function MeadowScene({ height = 300, className, children }: { height?: number; className?: string; children?: ReactNode }) {
  return (
    <section className={className ? `meadow ${className}` : 'meadow'} style={{ minHeight: height }}>
      <div className="meadow-sky" aria-hidden="true">
        <span className="meadow-sun" />
        <span className="meadow-cloud c1" />
        <span className="meadow-cloud c2" />
        <span className="meadow-cloud c3" />
        <span className="meadow-stars" />
      </div>
      <div className="meadow-hill" aria-hidden="true">
        <span className="tuft t1" />
        <span className="tuft t2" />
        <span className="flower f1" />
        <span className="flower f2" />
      </div>
      <div className="meadow-content">{children}</div>
    </section>
  )
}
```

- [ ] **Step 4: Replace PetSprite everywhere**

```bash
git rm src/ui/PetSprite.tsx src/ui/PetSprite.test.tsx
```

In each file below change the import `import { PetSprite } from '…/PetSprite'` to `import { Pet } from '…/Pet'` (same relative prefix) and the usages:

| File | Old | New |
|---|---|---|
| `src/screens/HomeScreen.tsx` | `<PetSprite size={200} bounce />` | `<Pet size={200} />` |
| `src/screens/SummaryScreen.tsx` | `<PetSprite size={140} bounce />` | `<Pet size={140} mood="proud" />` |
| `src/screens/ProfileScreen.tsx` | `<PetSprite size={72} color={draft.petColor} />` | `<Pet size={72} color={draft.petColor} />` |
| `src/screens/OnboardingScreen.tsx` | `<PetSprite size={180} bounce color={petColor} />` | `<Pet size={180} mood="excited" color={petColor} />` |
| `src/screens/play/RestView.tsx` | `<PetSprite size={48} />` | `<Pet size={48} />` |
| `src/screens/play/SetView.tsx` | `<PetSprite size={48} />` | `<Pet size={48} />` |
| `src/screens/play/TutorialView.tsx` | `<PetSprite size={120} />` | `<Pet size={120} />` |
| `src/ui/TcgCard.tsx` | `<PetSprite size={72} />` | `<Pet size={72} />` |

Run: `grep -rn "PetSprite" src` — Expected: no output.

- [ ] **Step 5: Styles**

In `src/theme.css` delete these lines from `/* legacy:pet */`:

```css
@keyframes pet-squish { 0%, 100% { transform: translateY(0) scale(1, 1); } 40% { transform: translateY(-6px) scale(0.96, 1.04); } 80% { transform: translateY(0) scale(1.06, 0.94); } }
.pet-squish { animation: pet-squish 1.8s ease-in-out infinite; transform-origin: 50% 90%; }
@media (prefers-reduced-motion: reduce) { .pet-squish { animation: none; } }
```

and append:

```css
/* pet */
.pet { position: relative; display: inline-block; flex: none; color: var(--text); }
.pet[data-tappable='true'] { cursor: pointer; }
.pet svg { display: block; overflow: visible; }
.pet-body, .pet-eyes { transform-box: view-box; }
.pet-body { transform-origin: 50% 92%; animation: pet-breathe 3.2s ease-in-out infinite; }
.pet-eyes { transform-origin: 50% 58%; animation: pet-blink 5s infinite; animation-delay: var(--blink-delay, 0s); }
.pet-pupils { animation: pet-look 9s ease-in-out infinite; }
.pet-jump .pet-body { animation: pet-jump 0.6s cubic-bezier(0.3, 1.6, 0.5, 1); }
.pet-z text { animation: pet-z 2.4s ease-in infinite; }
.pet-z text + text { animation-delay: 1.2s; }
.pet-sparkles path { transform-box: fill-box; transform-origin: center; animation: pet-twinkle 1.6s ease-in-out infinite; }
@keyframes pet-breathe { 0%, 100% { transform: scale(1, 1); } 50% { transform: scale(1.03, 0.97); } }
@keyframes pet-blink { 0%, 94%, 100% { transform: scaleY(1); } 97% { transform: scaleY(0.1); } }
@keyframes pet-look { 0%, 40%, 100% { transform: translateX(0); } 45%, 55% { transform: translateX(-1.6px); } 60%, 70% { transform: translateX(1.6px); } }
@keyframes pet-jump { 0% { transform: translateY(0); } 30% { transform: translateY(-14px) scale(0.94, 1.08); } 60% { transform: translateY(0) scale(1.08, 0.92); } 100% { transform: none; } }
@keyframes pet-z { 0% { opacity: 0; transform: translate(0, 4px); } 30% { opacity: 1; } 100% { opacity: 0; transform: translate(4px, -8px); } }
@keyframes pet-twinkle { 0%, 100% { opacity: 0.4; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.1); } }

/* meadow */
.meadow { position: relative; overflow: hidden; display: flex; flex-direction: column; padding: 12px 12px 22px; border-radius: 24px; background: linear-gradient(180deg, var(--sky-top), var(--sky-bottom)); }
.meadow-sky, .meadow-hill { position: absolute; pointer-events: none; }
.meadow-sky { inset: 0; }
.meadow-sun { position: absolute; top: 18px; right: 26px; width: 46px; height: 46px; border-radius: 50%; background: var(--sun); box-shadow: 0 0 0 10px color-mix(in srgb, var(--sun) 25%, transparent); }
:root[data-phase='morning'] .meadow-sun { top: 42%; left: 20px; right: auto; }
:root[data-phase='sunset'] .meadow-sun { top: 48%; }
:root[data-phase='night'] .meadow-sun { width: 34px; height: 34px; background: transparent; box-shadow: inset -9px -3px 0 0 var(--sun); }
.meadow-cloud { position: absolute; height: 18px; border-radius: 999px; background: rgba(255, 255, 255, 0.92); animation: cloud-drift 40s linear infinite alternate; }
.meadow-cloud::before { content: ''; position: absolute; left: 18%; bottom: 30%; width: 55%; height: 170%; border-radius: 50%; background: inherit; }
.c1 { width: 70px; top: 34px; left: 10%; }
.c2 { width: 50px; top: 74px; left: 55%; animation-duration: 55s; }
.c3 { width: 40px; top: 18px; left: 40%; animation-duration: 70s; opacity: 0.7; }
:root[data-phase='sunset'] .meadow-cloud { background: rgba(255, 214, 224, 0.92); }
:root[data-phase='night'] .meadow-cloud { display: none; }
.meadow-stars {
  display: none; position: absolute; inset: 0 0 40% 0; animation: twinkle 3s ease-in-out infinite alternate;
  background-image:
    radial-gradient(1.6px 1.6px at 12% 20%, #fff 50%, transparent 52%), radial-gradient(1.4px 1.4px at 30% 55%, #fff 50%, transparent 52%),
    radial-gradient(1.8px 1.8px at 48% 14%, #fff 50%, transparent 52%), radial-gradient(1.3px 1.3px at 63% 40%, #fff 50%, transparent 52%),
    radial-gradient(1.6px 1.6px at 82% 62%, #fff 50%, transparent 52%), radial-gradient(1.2px 1.2px at 90% 12%, #fff 50%, transparent 52%);
}
:root[data-phase='night'] .meadow-stars { display: block; }
.meadow-hill { left: -15%; right: -15%; bottom: -64px; height: 150px; border-radius: 50%; background: var(--grass); box-shadow: inset 0 10px 0 color-mix(in srgb, var(--grass) 70%, white); }
.tuft { position: absolute; width: 14px; height: 10px; border-radius: 10px 10px 0 0; background: var(--grass-dark); }
.t1 { top: 20px; left: 28%; }
.t2 { top: 26px; left: 68%; }
.flower { position: absolute; width: 9px; height: 9px; border-radius: 50%; background: #fff; box-shadow: inset 0 0 0 3px #ffd34d; }
.f1 { top: 32px; left: 36%; }
.f2 { top: 22px; left: 61%; }
.meadow-content { position: relative; z-index: 1; flex: 1; display: flex; flex-direction: column; gap: 8px; }
@keyframes cloud-drift { from { transform: translateX(-20px); } to { transform: translateX(30px); } }
@keyframes twinkle { from { opacity: 0.5; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .pet-body, .pet-pupils, .pet-z text, .pet-sparkles path, .pet-jump .pet-body, .meadow-cloud, .meadow-stars { animation: none; }
}
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run src/domain/petMood.test.ts src/ui && npm test && npm run typecheck`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(pet): moods, blinking and tap reactions; meadow scene"
```

---

### Task 5: Rarity cards

**Files:**
- Create: `src/ui/RarityCard.tsx`, `src/ui/RarityCard.test.tsx`
- Delete: `src/ui/TcgCard.tsx`
- Modify: `src/screens/DecksScreen.tsx`, `src/screens/NewSessionScreen.tsx` (imports + usages), `src/theme.css`

**Interfaces:**
- Consumes: `Icon` (Task 3), `Pet` (Task 4), `imageUrl` from `src/content`, `repRangeFor`, `restSecFor` from `src/domain/session`.
- Produces: `RarityCard({ exercise: Exercise; settings?: SessionSettings; size?: 'full' | 'mini'; children?: ReactNode })` → `<article aria-label={exercise.name} data-rarity={1|2|3}>`; `RARITY_LABEL: Record<1|2|3, string>` = Common / Rare / Epic.

- [ ] **Step 1: Write the failing test**

`src/ui/RarityCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { content } from '../content'
import { RarityCard } from './RarityCard'

const settings = { sets: 3, cards: 5, rir: [1, 3] as [number, number], restSec: null, repRange: [8, 12] as [number, number] }

describe('RarityCard', () => {
  it('frames the card by rarity and shows name, rarity, muscles and stats', () => {
    const ex = content.exercises['pushup']
    render(<RarityCard exercise={ex} settings={settings}><button>Swap</button></RarityCard>)
    const card = screen.getByRole('article', { name: ex.name })
    expect(card).toHaveAttribute('data-rarity', String(ex.rarity))
    expect(card.querySelector('.rcard-type')!.textContent).toContain(['Common', 'Rare', 'Epic'][ex.rarity - 1])
    expect(card.querySelector('.rcard-type')!.textContent).toContain(ex.muscles.primary[0])
    expect(screen.getByText(/3 × 8–12/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Swap' })).toBeInTheDocument()
  })

  it('has a compact mini size without the movement line', () => {
    const { container } = render(<RarityCard exercise={content.exercises['pushup']} size="mini" />)
    expect(container.querySelector('.rcard-mini')).not.toBeNull()
    expect(container.querySelector('.rcard-meta')).toBeNull()
  })

  it('covers every rarity used in the content', () => {
    const rarities = new Set(Object.values(content.exercises).map((e) => e.rarity))
    for (const r of rarities) expect([1, 2, 3]).toContain(r)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/ui/RarityCard.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/ui/RarityCard.tsx`:

```tsx
import type { ReactNode } from 'react'
import { imageUrl } from '../content'
import { repRangeFor, restSecFor } from '../domain/session'
import type { Exercise, SessionSettings } from '../domain/types'
import { Icon } from './Icon'
import { Pet } from './Pet'

export const RARITY_LABEL: Record<Exercise['rarity'], string> = { 1: 'Common', 2: 'Rare', 3: 'Epic' }
const MOVEMENT: Record<Exercise['movement'], string> = {
  push: 'Push', pull: 'Pull', squat: 'Squat', hinge: 'Hinge', core: 'Core', isolation: 'Isolation', warmup: 'Warm-up',
}
const EQUIPMENT: Record<Exercise['equipment'], string> = { bodyweight: 'Bodyweight', dumbbell: 'Dumbbell', band: 'Band' }

export function RarityCard({ exercise, settings, size = 'full', children }: {
  exercise: Exercise
  settings?: SessionSettings
  size?: 'full' | 'mini'
  children?: ReactNode
}) {
  const img = imageUrl(exercise.id)
  const [lo, hi] = settings ? repRangeFor(exercise, settings) : exercise.repRange
  const rest = settings ? restSecFor(exercise, settings) : exercise.restSec
  return (
    <article className={`rcard rcard-${size}`} data-rarity={exercise.rarity} aria-label={exercise.name}>
      <div className="rcard-inner">
        <span className="rcard-gem" aria-hidden="true">{exercise.rarity}</span>
        <div className="rcard-art">{img ? <img src={img} alt="" loading="lazy" /> : <Pet size={size === 'mini' ? 56 : 80} />}</div>
        <div className="rcard-body">
          <h3 className="rcard-name">{exercise.name}</h3>
          <span className="rcard-type">{RARITY_LABEL[exercise.rarity]} · {exercise.muscles.primary.join(' / ')}</span>
          {size === 'full' && <span className="rcard-meta">{MOVEMENT[exercise.movement]} · {EQUIPMENT[exercise.equipment]}</span>}
          <div className="rcard-stats">
            <span className="badge"><Icon name="muscle" size={14} />{settings ? `${settings.sets} × ` : ''}{lo}–{hi}{exercise.perSide ? ' per side' : ''}</span>
            <span className="badge"><Icon name="timer" size={14} />{rest}s</span>
          </div>
        </div>
        {children && <div className="rcard-foot">{children}</div>}
      </div>
    </article>
  )
}
```

`react/only-export-components` may warn for `RARITY_LABEL` (constant export, allowed).

Swap the old card:

```bash
git rm src/ui/TcgCard.tsx
```

In `src/screens/DecksScreen.tsx` and `src/screens/NewSessionScreen.tsx`: replace `import { TcgCard } from '../ui/TcgCard'` with `import { RarityCard } from '../ui/RarityCard'`, and every `<TcgCard` / `</TcgCard>` with `<RarityCard` / `</RarityCard>`. In `DecksScreen.tsx` additionally pass `size="mini"`: `<RarityCard exercise={current} size="mini">`.

Run: `grep -rn "TcgCard\|tcg" src --include=*.tsx` — Expected: no output.

- [ ] **Step 4: Styles**

In `src/theme.css` delete the whole `/* legacy:tcg */ … /* end legacy:tcg */` block, and in `/* legacy:decks */` delete:

```css
.card-grid .tcg-art { height: 96px; }
.card-grid .tcg-stats { flex-direction: column; font-size: 12px; }
```

Append:

```css
/* rarity cards */
.rcard { --r: var(--rarity-1); --rb: var(--rarity-1-base); padding: 5px; border-radius: 18px; color: var(--text); background: linear-gradient(160deg, color-mix(in srgb, var(--r) 50%, white), var(--r)); box-shadow: 0 5px 0 var(--rb); }
.rcard[data-rarity='2'] { --r: var(--rarity-2); --rb: var(--rarity-2-base); }
.rcard[data-rarity='3'] { --r: var(--rarity-3); --rb: var(--rarity-3-base); box-shadow: 0 5px 0 var(--rb), 0 0 16px color-mix(in srgb, var(--r) 60%, transparent); }
.rcard-inner { position: relative; overflow: hidden; border-radius: 13px; background: var(--panel); }
.rcard-gem { position: absolute; top: 8px; left: 8px; z-index: 1; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--r); color: var(--on-color); font-family: var(--font-display); font-weight: 700; font-size: 13px; box-shadow: 0 2px 0 var(--rb); }
.rcard-art { height: 150px; display: flex; align-items: center; justify-content: center; background: var(--panel-sunken); }
.rcard-art img { width: 100%; height: 100%; object-fit: cover; }
.rcard-body { display: flex; flex-direction: column; gap: 4px; padding: 8px 10px 10px; }
.rcard-name { font-size: 17px; }
.rcard-type { font-size: 11px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-muted); }
.rcard-meta { font-size: 12px; color: var(--text-muted); }
.rcard-stats { display: flex; flex-wrap: wrap; gap: 6px; }
.badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 8px; background: var(--panel-sunken); font-size: 12px; font-weight: 800; }
.rcard-foot { padding: 0 10px 10px; font-size: 13px; }
.rcard-foot .btn { width: 100%; min-height: 44px; padding: 6px; font-size: 15px; }
.rcard-mini .rcard-art { height: 92px; }
.rcard-mini .rcard-name { font-size: 15px; }
.rcard[data-rarity='3'] .rcard-inner::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(110deg, transparent 35%, rgba(255, 255, 255, 0.55) 50%, transparent 65%); transform: translateX(-120%); animation: rcard-shine 4s ease-in-out infinite; }
@keyframes rcard-shine { 0%, 60% { transform: translateX(-120%); } 100% { transform: translateX(120%); } }
@media (prefers-reduced-motion: reduce) { .rcard[data-rarity='3'] .rcard-inner::after { display: none; } }
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/ui/RarityCard.test.tsx && npm test`
Expected: all PASS (Decks and NewSession tests unchanged and green).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(cards): rarity-coloured exercise cards replace the gold TCG frame"
```

---

### Task 6: Home in the meadow

**Files:**
- Modify: `src/screens/HomeScreen.tsx` (whole file), `src/screens/HomeScreen.test.tsx`, `src/theme.css`

**Interfaces:**
- Consumes: `MeadowScene`, `Pet`, `Pill`, `XpBar`, `Icon`, `petMood`, `missedYesterday`, `usePhase`, `feedback`.
- Produces: nothing new.

- [ ] **Step 1: Write the failing test**

Append to the `describe('HomeScreen')` block in `src/screens/HomeScreen.test.tsx`:

```tsx
  it('shows an excited pet on a training day and a progress bar for XP', async () => {
    const db = await makeTestDb((d) => saveProfile(d, makeProfile({ petName: 'Mochi' })))
    renderRoutes(db, routes, ['/'])
    await screen.findByText(/Mochi · Lv 1/)
    expect(document.querySelector('.pet')).toHaveAttribute('data-mood', 'excited')
    expect(screen.getByRole('progressbar', { name: /XP to next level/ })).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/screens/HomeScreen.test.tsx`
Expected: FAIL — `data-mood` is `happy` and no progressbar.

- [ ] **Step 3: Implement**

`src/screens/HomeScreen.tsx` (replace whole file):

```tsx
import { useState } from 'react'
import { Link } from 'react-router'
import { content } from '../content'
import { useAppData } from '../data/AppData'
import { usePhase } from '../design/phaseContext'
import { estimateMinutes, recommendDefaults } from '../domain/defaults'
import { addDays, dateKey, weekdayOf, WEEKDAY_LABELS } from '../domain/dates'
import { levelFromXp, petLine, totalXp } from '../domain/pet'
import { missedYesterday, petMood } from '../domain/petMood'
import { plannedDeckId } from '../domain/plan'
import { suggestNextDeck } from '../domain/recommender'
import { countedDays, streakInfo } from '../domain/streak'
import type { Deck } from '../domain/types'
import { feedback } from '../feedback/feedback'
import { useNow } from '../hooks/useNow'
import { Icon } from '../ui/Icon'
import { MeadowScene } from '../ui/MeadowScene'
import { Pet } from '../ui/Pet'
import { Pill } from '../ui/Pill'
import { XpBar } from '../ui/XpBar'

export function HomeScreen() {
  const { profile, history, plans, active } = useAppData()
  const [picking, setPicking] = useState(false)
  const [taps, setTaps] = useState(0)
  const phase = usePhase()
  const nowMs = useNow(60_000)
  if (!profile) return null

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
    : petLine(doneToday ? 'home_trained_today' : todayDeck ? 'home_fresh' : 'home_rest', `${now.toDateString()}:${taps}`)
  const activeDeck = active ? content.decks.find((d) => d.id === active.deckId) : undefined
  const mood = petMood({
    phase, plannedToday: !!todayDeck, trainedToday: doneToday, missedYesterday: missedYesterday(streak.days, now),
  })

  return (
    <main className="screen home">
      <MeadowScene height={340}>
        <div className="row spread">
          <Pill icon="flame" tone="flame" label={`${streak.current}-day streak`}>{streak.current}</Pill>
          <Pill icon="shield" tone="shield">{streak.shieldAvailable ? 'Shield ready' : 'Shield used this week'}</Pill>
        </div>
        <div className="meadow-pet">
          <div className="bubble">{line}</div>
          <Pet size={170} mood={mood} onTap={() => { setTaps((t) => t + 1); feedback('petTap') }} />
        </div>
      </MeadowScene>

      <div className="pet-level">
        <strong className="pet-name">{profile.petName} · Lv {level}</strong>
        <XpBar value={xpIntoLevel} max={xpForNext} label={`${xpIntoLevel} of ${xpForNext} XP to next level`} />
        <span className="muted">{xpIntoLevel} / {xpForNext} XP</span>
      </div>

      <section className="panel stack">
        {active ? (
          <>
            <span className="label">Session in progress</span>
            <h2>{activeDeck?.name}</h2>
            <Link className="btn btn-primary btn-block" to="/session/play">Resume session <Icon name="play" size={18} /></Link>
          </>
        ) : (
          <>
            {todayDeck ? (
              <>
                <span className="label row">
                  {doneToday ? <><Icon name="check" size={16} /> Done for today</> : <><Icon name="calendar" size={16} /> Today · {WEEKDAY_LABELS[weekdayOf(now)]}</>}
                </span>
                <h2>{todayDeck.name}</h2>
                <span className="muted">{rec.settings.cards} cards · ~{estimateMinutes(rec.settings)} min</span>
                <Link className="btn btn-primary btn-block" to={`/session/new/${todayDeck.id}`}>Deal my hand <Icon name="play" size={18} /></Link>
              </>
            ) : (
              <>
                <span className="label row"><Icon name="moon" size={16} /> Rest day</span>
                {next && <h2>Next up: {next.deck.name} on {WEEKDAY_LABELS[weekdayOf(next.date)]}</h2>}
                <Link className="btn btn-block" to={`/session/new/${primary.id}`}>Train anyway <Icon name="play" size={18} /></Link>
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
            <Link className="muted center-text quiet-link" to="/plan">Edit my week</Link>
          </>
        )}
      </section>
    </main>
  )
}
```

Note: the "Rest day" label now contains an icon, so the existing rest-day assertion `findByText('Rest day')` still matches the label's text node only if the text is its own node. Update that line in the test to `expect(await screen.findByText(/Rest day/)).toBeInTheDocument()`.

- [ ] **Step 4: Styles**

In `src/theme.css` delete the whole `/* legacy:home */ … /* end legacy:home */` block and append:

```css
/* home */
.home .meadow-pet { margin-top: auto; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.pet-level { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.pet-name { font-family: var(--font-display); font-size: 20px; }
.quiet-link { font-weight: 800; padding: 8px; }
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/screens/HomeScreen.test.tsx && npm test`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(home): pet in the meadow with moods, streak pills and XP bar"
```

---

### Task 7: Focus-mode workout screens

**Files:**
- Modify: `src/screens/PlayScreen.tsx`, `src/screens/play/WarmupView.tsx`, `src/screens/play/TutorialView.tsx`, `src/screens/play/SetView.tsx`, `src/screens/play/RestView.tsx`, `src/screens/play/EndEarlySheet.tsx`, `src/screens/play/SetView.test.tsx`, `src/theme.css`

**Interfaces:**
- Consumes: `Ring`, `Pips`, `Icon`, `RarityCard`, `Pet`, `formatClock`, `feedback`.
- Produces: `WarmupView` gains prop `totalMs: number`. `PlayScreen`'s `<main>` gets `className="screen full focus"` and `data-focus={0|1|2|3}`.

- [ ] **Step 1: Write the failing test**

Append to `describe('SetView')` in `src/screens/play/SetView.test.tsx`:

```tsx
  it('shows reps in a ring with set pips, and logs with the "log" feedback', () => {
    const { container } = render(
      <SetView exercise={content.exercises['pushup']} settings={settings} setNo={2} initialReps={8} initialWeight={null}
        onLog={vi.fn()} onHurt={vi.fn()} onShowTutorial={vi.fn()} />,
    )
    expect(container.querySelector('.ring')).not.toBeNull()
    expect(container.querySelectorAll('.pips i')).toHaveLength(3)
    expect(container.querySelector('.pips i.now')).toBe(container.querySelectorAll('.pips i')[1])
    expect(screen.getByRole('button', { name: /Log set/ })).toHaveAttribute('data-feedback', 'log')
  })
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/screens/play/SetView.test.tsx`
Expected: FAIL — no `.ring`.

- [ ] **Step 3: Implement the views**

`src/screens/play/SetView.tsx` (replace whole file):

```tsx
import { useState } from 'react'
import { imageUrl } from '../../content'
import { repRangeFor } from '../../domain/session'
import type { Exercise, SessionSettings } from '../../domain/types'
import { Icon } from '../../ui/Icon'
import { Pet } from '../../ui/Pet'
import { Pips } from '../../ui/Pips'
import { Ring } from '../../ui/Ring'

export function SetView({ exercise, settings, setNo, initialReps, initialWeight, onLog, onHurt, onShowTutorial }: {
  exercise: Exercise
  settings: SessionSettings
  setNo: number
  initialReps: number
  initialWeight: number | null
  onLog(reps: number, weightKg: number | null): void
  onHurt(reps: number, weightKg: number | null): void
  onShowTutorial(): void
}) {
  const [reps, setReps] = useState(initialReps)
  const [weight, setWeight] = useState(initialWeight)
  const [lo, hi] = repRangeFor(exercise, settings)
  const img = imageUrl(exercise.id)

  return (
    <section className="stack play">
      <div className="focus-head">
        <h1 className="focus-title">{exercise.name}</h1>
        <Pips done={setNo - 1} total={settings.sets} />
        <span className="focus-sub">Set {setNo} / {settings.sets}</span>
      </div>

      <div className="center">
        <Ring value={hi > 0 ? reps / hi : 0} size={210} color="var(--gold)" track="rgba(255,255,255,.22)">
          <output className="big-number" aria-label="Reps done">{reps}</output>
          <span className="ring-caption">reps done</span>
        </Ring>
        <div className="row center ring-controls">
          <button className="btn round" aria-label="One fewer rep" onClick={() => setReps((r) => Math.max(0, r - 1))}><Icon name="minus" /></button>
          <button className="btn round" aria-label="One more rep" onClick={() => setReps((r) => r + 1)}><Icon name="plus" /></button>
        </div>
      </div>
      <span className="label center-text">
        Go! Target {lo}–{hi}{exercise.perSide ? ' per side' : ''} · stop {settings.rir[0]}–{settings.rir[1]} reps before failure
      </span>
      {weight !== null && (
        <div className="row center">
          <button className="btn round" aria-label="Less weight" onClick={() => setWeight((w) => Math.max(0.5, (w ?? 1) - 1))}><Icon name="minus" /></button>
          <span className="stepper-value">{weight} kg</span>
          <button className="btn round" aria-label="More weight" onClick={() => setWeight((w) => (w ?? 0) + 1)}><Icon name="plus" /></button>
        </div>
      )}

      <button className="ref" onClick={onShowTutorial}>
        {img ? <img src={img} alt="" /> : <Pet size={48} />}
        <span className="stack" style={{ gap: 2 }}>
          <span className="row"><Icon name="bulb" size={16} /> {exercise.cues[0]}</span>
          <span className="focus-dim">Tap for the full tutorial</span>
        </span>
      </button>

      <div className="spacer" />
      <button className="btn btn-primary btn-block" data-feedback="log" onClick={() => onLog(reps, weight)}><Icon name="check" /> Log set</button>
      <button className="btn btn-danger btn-block" onClick={() => onHurt(reps, weight)}>This hurts: stop this card</button>
    </section>
  )
}
```

`src/screens/play/WarmupView.tsx` (replace whole file):

```tsx
import type { Exercise } from '../../domain/types'
import { formatClock } from '../../ui/format'
import { Icon } from '../../ui/Icon'
import { Ring } from '../../ui/Ring'

export function WarmupView({ exercise, remaining, totalMs, onDone }: { exercise: Exercise; remaining: number; totalMs: number; onDone(): void }) {
  return (
    <section className="stack play">
      <div className="focus-head">
        <span className="focus-sub">Warm-up</span>
        <h1 className="focus-title">{exercise.name}</h1>
      </div>
      <div className="center">
        <div role="timer" aria-label={remaining > 0 ? `Warm-up ${formatClock(remaining)} remaining` : 'Warm-up done'}>
          <Ring value={totalMs > 0 ? remaining / totalMs : 0} size={190} color="var(--gold)" track="rgba(255,255,255,.22)">
            <span className="big-number ring-clock">{remaining > 0 ? formatClock(remaining) : <Icon name="check" size={56} />}</span>
          </Ring>
        </div>
      </div>
      <ol className="stack cue-list">
        {exercise.cues.map((c) => <li key={c}>{c}</li>)}
      </ol>
      <p className="focus-dim">Avoid: {exercise.mistakes.join(' · ')}</p>
      <div className="spacer" />
      <button className="btn btn-primary btn-block" onClick={onDone}>Start first card <Icon name="play" size={18} /></button>
    </section>
  )
}
```

`src/screens/play/RestView.tsx` (replace whole file):

```tsx
import { imageUrl } from '../../content'
import type { Exercise } from '../../domain/types'
import { formatClock } from '../../ui/format'
import { Icon } from '../../ui/Icon'
import { Pet } from '../../ui/Pet'
import { Ring } from '../../ui/Ring'

export function RestView({ exercise, remaining, totalMs, lastReps, range, nextLabel, onAdd, onSkip }: {
  exercise: Exercise
  remaining: number
  totalMs: number
  lastReps: number | null
  range: [number, number]
  nextLabel: string
  onAdd(): void
  onSkip(): void
}) {
  const img = imageUrl(exercise.id)
  return (
    <section className="stack play">
      <div className="ref">
        {img ? <img src={img} alt="" /> : <Pet size={48} />}
        {lastReps !== null && (
          <span>
            Last set: <b>{lastReps} reps</b>{' '}
            {lastReps >= range[0]
              ? <span className="row in-range"><Icon name="check" size={16} /> in range</span>
              : <span className="focus-dim">below range, and that's OK</span>}
          </span>
        )}
      </div>
      <div className="center">
        <div role="timer" aria-label={`Rest ${formatClock(remaining)} remaining`}>
          <Ring value={totalMs > 0 ? remaining / totalMs : 0} size={220} color="var(--gold)" track="rgba(255,255,255,.22)">
            <span className="big-number ring-clock">{formatClock(remaining)}</span>
            <span className="ring-caption">REST</span>
          </Ring>
        </div>
      </div>
      <p className="center-text focus-dim">{nextLabel}</p>
      <div className="spacer" />
      <div className="row">
        <button className="btn" style={{ flex: 1 }} onClick={onAdd}><Icon name="plus" size={18} /> 15s</button>
        <button className="btn btn-primary" style={{ flex: 2 }} onClick={onSkip}>Skip rest <Icon name="play" size={18} /></button>
      </div>
    </section>
  )
}
```

The "+15s" button's accessible name changes from `+15s` to `15s`; no test or e2e uses it.

`src/screens/play/TutorialView.tsx` (replace whole file):

```tsx
import { useState } from 'react'
import { videoUrl } from '../../content'
import type { Exercise, SessionSettings } from '../../domain/types'
import { Icon } from '../../ui/Icon'
import { RarityCard } from '../../ui/RarityCard'

export function TutorialView({ exercise, settings, mode, readyLabel, onReady }: {
  exercise: Exercise
  settings: SessionSettings
  mode: 'full' | 'refresher'
  readyLabel: string
  onReady(): void
}) {
  const [expanded, setExpanded] = useState(mode === 'full')
  return (
    <section className="stack play">
      <RarityCard exercise={exercise} settings={settings} />
      {expanded ? (
        <>
          <a className="btn" href={videoUrl(exercise)} target="_blank" rel="noreferrer"><Icon name="video" /> Watch full tutorial</a>
          <div>
            <strong>How to</strong>
            <ol className="cue-list">{exercise.cues.map((c) => <li key={c}>{c}</li>)}</ol>
          </div>
          <div>
            <strong>Avoid</strong>
            <ul className="avoid-list">{exercise.mistakes.map((m) => <li key={m}><Icon name="close" size={14} /> {m}</li>)}</ul>
          </div>
        </>
      ) : (
        <>
          <p className="row"><Icon name="bulb" size={18} /> {exercise.cues[0]}</p>
          <button className="btn btn-ghost" onClick={() => setExpanded(true)}>Show full tutorial</button>
        </>
      )}
      <div className="spacer" />
      <button className="btn btn-primary btn-block" onClick={onReady}>{readyLabel}</button>
    </section>
  )
}
```

`src/screens/play/EndEarlySheet.tsx` (replace whole file):

```tsx
import type { EndReason } from '../../domain/types'
import { Icon, type IconName } from '../../ui/Icon'

const REASONS: { id: EndReason; label: string; icon: IconName }[] = [
  { id: 'tired', label: 'Tired', icon: 'moon' },
  { id: 'no_time', label: 'No time', icon: 'timer' },
  { id: 'too_hard', label: 'Too hard', icon: 'muscle' },
  { id: 'other', label: 'Other / skip', icon: 'dots' },
]

export function EndEarlySheet({ onCancel, onConfirm }: { onCancel(): void; onConfirm(reason: EndReason): void }) {
  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-labelledby="end-title">
      <div className="sheet">
        <h2 id="end-title">End session early?</h2>
        <p className="muted">Every set you've done is saved and still counts.</p>
        <span className="label">Why? This helps tune your next session</span>
        {REASONS.map((r) => (
          <button key={r.id} className="choice reason" onClick={() => onConfirm(r.id)}>
            <Icon name={r.icon} /> <strong>{r.label}</strong>
          </button>
        ))}
        <button className="btn btn-primary" onClick={onCancel}>Keep going</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Wire focus mode into PlayScreen**

In `src/screens/PlayScreen.tsx`:

1. Add imports: `import { Icon } from '../ui/Icon'`.
2. Replace the tutorial label line with:

```tsx
    const label = showTutorial ? 'Back to my set' : mode === 'full' ? "I'm ready. Start set 1" : 'Skip, start set 1'
```

3. Pass the warm-up total to `WarmupView`:

```tsx
      <WarmupView
        exercise={content.exercises[state.warmupId]}
        remaining={remainingMs(state.warmupEndsAt, now)}
        totalMs={(content.exercises[state.warmupId].durationSec ?? 180) * 1000}
        onDone={() => dispatch({ type: 'WARMUP_DONE' })}
      />
```

4. Replace the returned `<main …>` opening, top bar and alert (everything from `return (` down to `{view}`) with:

```tsx
  const focus = state.phase === 'warmup' || !ex ? 0 : ex.rarity
  return (
    <main className="screen full focus" data-focus={focus}>
      <div className="topbar">
        <span className="label">
          {deck?.name}
          {state.phase !== 'warmup' && state.phase !== 'summary' && ` · Card ${state.cardIndex + 1} / ${state.hand.length}`}
        </span>
        {state.phase !== 'summary' && (
          <button className="btn round" aria-label="End session" onClick={() => setEnding(true)}><Icon name="close" /></button>
        )}
      </div>
      {saveError && (
        <p role="alert" className="panel">
          Couldn't save the last step on this phone. Keep going: the next step saves again.
        </p>
      )}
      {view}
```

(The rest — `{ending && …}` and `</main>` — stays.)

- [ ] **Step 5: Styles**

In `src/theme.css` delete the whole `/* legacy:play */ … /* end legacy:play */` block and append:

```css
/* focus mode (workout) */
.focus { --focus-top: var(--focus-1-top); --focus-bottom: var(--focus-1); color: var(--on-color); background: linear-gradient(180deg, var(--focus-top), var(--focus-bottom)); max-width: none; }
.focus > * { width: 100%; max-width: 488px; margin-left: auto; margin-right: auto; }
.focus[data-focus='0'] { --focus-top: var(--focus-0-top); --focus-bottom: var(--focus-0); }
.focus[data-focus='2'] { --focus-top: var(--focus-2-top); --focus-bottom: var(--focus-2); }
.focus[data-focus='3'] { --focus-top: var(--focus-3-top); --focus-bottom: var(--focus-3); }
.focus .label, .focus .muted, .focus-dim { color: rgba(255, 255, 255, 0.88); }
.focus .btn:not(.btn-primary):not(.btn-good):not(.btn-danger) { --btn-bg: rgba(255, 255, 255, 0.16); --btn-base: rgba(0, 0, 0, 0.25); --btn-fg: var(--on-color); }
.focus .btn-primary { --btn-bg: var(--gold); --btn-base: var(--gold-base); --btn-fg: #3a1d00; }
.focus .btn-danger { --btn-fg: #ffe0de; }
.focus .panel { color: var(--text); }
.topbar { display: flex; justify-content: space-between; align-items: center; }
.play { flex: 1; }
.spacer { flex: 1; }
.focus-head { display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; }
.focus-title { font-size: 26px; }
.focus-sub { font-weight: 800; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.9; }
.ring-caption { font-size: 12px; font-weight: 800; letter-spacing: 0.08em; opacity: 0.85; }
.ring-clock { font-size: 48px; }
.ring-controls { margin-top: -28px; gap: 96px; }
.ref { display: flex; gap: 10px; align-items: center; padding: 8px; border: 0; border-radius: var(--radius); background: rgba(255, 255, 255, 0.14); color: inherit; text-align: left; }
.ref img { width: 64px; height: 48px; object-fit: cover; border-radius: 8px; }
.in-range { display: inline-flex; gap: 4px; font-weight: 800; }
.cue-list { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 6px; }
.avoid-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
.avoid-list li { display: flex; gap: 6px; align-items: center; }
.reason { align-items: center; }
```

- [ ] **Step 6: Run tests and the e2e flow**

Run: `npm test && npm run typecheck && npm run e2e`
Expected: all PASS (PlayScreen tests still find `Start first card`, `start set 1`, `Log set`, `Rest … remaining`, `Skip rest`, `Set 2 / 2`, `End session`, `No time`).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(play): focus-mode workout in the card's rarity colour with rings and pips"
```

---

### Task 8: Summary celebrations and level-up

**Files:**
- Create: `src/ui/motion.ts`, `src/ui/useCountUp.ts`, `src/ui/useCountUp.test.tsx`, `src/ui/celebrate.ts`, `src/ui/LevelUpOverlay.tsx`
- Modify: `src/domain/streak.ts`, `src/domain/streak.test.ts`, `src/screens/SummaryScreen.tsx` (whole file), `src/screens/SummaryScreen.test.tsx`, `e2e/session.spec.ts`, `src/theme.css`, `package.json`

**Interfaces:**
- Consumes: `MeadowScene`, `Pet`, `Pill`, `XpBar`, `Icon`, `feedback`, `streakInfo`.
- Produces: `prefersReducedMotion(): boolean` (true when `matchMedia` is missing); `useCountUp(target: number, ms?: number): number`; `burstConfetti(): void`; `LevelUpOverlay({ petName, level, onClose })` (dialog named "Level up!", button "Awesome!"); `streakGain(ctx: PlanContext, sessionId: string, at: Date): { before: number; after: number }`.

- [ ] **Step 1: Write the failing tests**

Append to `src/domain/streak.test.ts` (keep its existing imports; add `streakGain` to the import from `./streak`, and `makeProfile`, `makeSession`, `makeSet`, `makeHistory` from `./testFixtures` if not already imported):

```ts
describe('streakGain', () => {
  it('compares the streak with and without one session', () => {
    const profile = makeProfile({ onboardedAt: new Date(2026, 9, 5, 8).toISOString() }) // Monday
    const settings = { sets: 1, cards: 1, rir: [1, 3] as [number, number], restSec: null, repRange: null }
    const history = makeHistory({
      sessions: [makeSession({ id: 's1', startedAt: new Date(2026, 9, 5, 12).toISOString(), status: 'complete', settings })],
      sets: [makeSet({ sessionId: 's1', exerciseId: 'pushup', reps: 10 })],
    })
    expect(streakGain({ profile, history, plans: [] }, 's1', new Date(2026, 9, 5, 13))).toEqual({ before: 0, after: 1 })
  })
})
```

`src/ui/useCountUp.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { prefersReducedMotion } from './motion'
import { useCountUp } from './useCountUp'

function Show({ n }: { n: number }) {
  return <p>{useCountUp(n)}</p>
}

describe('motion helpers', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('treats a missing matchMedia (or the reduce setting) as reduced motion', () => {
    expect(prefersReducedMotion()).toBe(true)
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce'), media: q }))
    expect(prefersReducedMotion()).toBe(true)
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q }))
    expect(prefersReducedMotion()).toBe(false)
  })

  it('shows the final number at once with reduced motion', () => {
    render(<Show n={45} />)
    expect(screen.getByText('45')).toBeInTheDocument()
  })
})
```

Add to `src/screens/SummaryScreen.test.tsx` (inside `describe('SummaryScreen')`):

```tsx
  it('celebrates a level up with a dismissable overlay', async () => {
    const db = await makeTestDb(async (d) => {
      await saveProfile(d, makeProfile({ experience: 'consistent', onboardedAt: new Date().toISOString() }))
      await createSession(d, makeSession({ id: 's1', startedAt: new Date().toISOString(), status: 'complete' }))
      await addSetLogs(d, 's1', [1, 2, 3].map((setNo) => ({ exerciseId: 'pushup', setNo, reps: 10, weightKg: null, stoppedForPain: false })))
    })
    const user = userEvent.setup()
    renderRoutes(db, routes, ['/session/summary/s1'])
    expect(await screen.findByRole('dialog', { name: 'Level up!' })).toBeInTheDocument() // 3×10 + 25 = 55 XP → Lv 2
    await user.click(screen.getByRole('button', { name: 'Awesome!' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText('+55 XP')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/domain/streak.test.ts src/ui/useCountUp.test.tsx src/screens/SummaryScreen.test.tsx`
Expected: FAIL — `streakGain`, `./motion`, `./useCountUp` missing; no dialog.

- [ ] **Step 3: Install confetti**

```bash
npm install canvas-confetti
npm install -D @types/canvas-confetti
```

- [ ] **Step 4: Implement**

Append to `src/domain/streak.ts`:

```ts
/** Streak at `at` without and with one session: a larger `after` means this session extended it. */
export function streakGain(ctx: PlanContext, sessionId: string, at: Date): { before: number; after: number } {
  const without = { ...ctx.history, sessions: ctx.history.sessions.filter((s) => s.id !== sessionId) }
  return { before: streakInfo({ ...ctx, history: without }, at).current, after: streakInfo(ctx, at).current }
}
```

`src/ui/motion.ts`:

```ts
/** Without matchMedia (tests, very old browsers) we play it safe and skip motion. */
export function prefersReducedMotion(): boolean {
  return typeof window.matchMedia !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
```

`src/ui/useCountUp.ts`:

```ts
import { useEffect, useState } from 'react'
import { prefersReducedMotion } from './motion'

/** Counts from 0 to `target` with an ease-out; shows `target` at once when motion is reduced. */
export function useCountUp(target: number, ms = 900): number {
  const [reduced] = useState(prefersReducedMotion)
  const [value, setValue] = useState(reduced ? target : 0)
  useEffect(() => {
    if (reduced) {
      setValue(target)
      return
    }
    let frame = 0
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms)
      setValue(Math.round(target * (1 - (1 - p) ** 3)))
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, ms, reduced])
  return value
}
```

`src/ui/celebrate.ts`:

```ts
import confetti from 'canvas-confetti'
import { prefersReducedMotion } from './motion'

export function burstConfetti(): void {
  if (prefersReducedMotion()) return
  void confetti({
    particleCount: 90, spread: 75, startVelocity: 38, origin: { y: 0.3 },
    colors: ['#ff8a1f', '#ffd34d', '#7ed957', '#4da3ff', '#9b7bff'], disableForReducedMotion: true,
  })
}
```

(`colors` are confetti art, allowed like pet art.)

`src/ui/LevelUpOverlay.tsx`:

```tsx
import { Icon } from './Icon'
import { Pet } from './Pet'

export function LevelUpOverlay({ petName, level, onClose }: { petName: string; level: number; onClose(): void }) {
  return (
    <div className="levelup" role="dialog" aria-modal="true" aria-labelledby="levelup-title">
      <div className="levelup-card">
        <span className="levelup-burst" aria-hidden="true"><Icon name="star" size={40} /><Icon name="sparkle" size={30} /><Icon name="star" size={28} /></span>
        <div className="levelup-pet"><Pet size={150} mood="proud" /></div>
        <h2 id="levelup-title">Level up!</h2>
        <p className="muted">{petName} reached level {level}</p>
        <button className="btn btn-primary btn-block" data-feedback="none" onClick={onClose}>Awesome!</button>
      </div>
    </div>
  )
}
```

`src/screens/SummaryScreen.tsx` (replace whole file):

```tsx
import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { content } from '../content'
import { useAppData } from '../data/AppData'
import { addSoreness } from '../data/repo'
import { recommendDefaults } from '../domain/defaults'
import { endEarlySuggestion } from '../domain/history'
import { countsForXp, levelFromXp, petLine, sessionXp, totalXp } from '../domain/pet'
import { streakGain } from '../domain/streak'
import type { Profile, SessionRecord } from '../domain/types'
import { feedback } from '../feedback/feedback'
import { burstConfetti } from '../ui/celebrate'
import { Icon, type IconName } from '../ui/Icon'
import { LevelUpOverlay } from '../ui/LevelUpOverlay'
import { MeadowScene } from '../ui/MeadowScene'
import { Pet } from '../ui/Pet'
import { Pill } from '../ui/Pill'
import { useCountUp } from '../ui/useCountUp'
import { XpBar } from '../ui/XpBar'

const SORENESS: { rating: 1 | 2 | 3; label: string; icon: IconName }[] = [
  { rating: 1, label: 'Fine', icon: 'face-happy' },
  { rating: 2, label: 'A bit sore', icon: 'face-meh' },
  { rating: 3, label: 'Very sore', icon: 'face-sore' },
]

export function SummaryScreen() {
  const { sessionId } = useParams()
  const { ready, profile, history } = useAppData()
  if (!ready) return null
  const session = history.sessions.find((s) => s.id === sessionId)
  if (!session || !profile) return <Navigate to="/" replace />
  return <SummaryView session={session} profile={profile} />
}

function SummaryView({ session, profile }: { session: SessionRecord; profile: Profile }) {
  const { db, history, plans, afterWrite } = useAppData()
  const navigate = useNavigate()
  const [rated, setRated] = useState<1 | 2 | 3 | null>(null)
  const [levelUpSeen, setLevelUpSeen] = useState(false)

  const sets = history.sets.filter((s) => s.sessionId === session.id)
  const done = sets.filter(countsForXp)
  const gained = sessionXp(history, session.id)
  const after = levelFromXp(totalXp(history))
  const leveledUp = after.level > levelFromXp(totalXp(history) - gained).level
  const complete = session.status === 'complete'
  const moment = leveledUp ? 'level_up' : complete ? 'summary_complete' : 'summary_partial'
  const onRamp = recommendDefaults(profile, history, new Date(session.startedAt)).stage !== 'target'
  const alreadyRated = history.soreness.some((c) => c.sessionId === session.id)
  const suggestion = complete ? null : endEarlySuggestion(history)
  const streak = streakGain({ profile, history, plans }, session.id, new Date(session.startedAt))
  const xpShown = useCountUp(gained)
  const setsShown = useCountUp(done.length)

  // Celebrate once per visit, not on every re-render.
  const celebrated = useRef(false)
  useEffect(() => {
    if (celebrated.current) return
    celebrated.current = true
    feedback(leveledUp ? 'levelUp' : 'celebrate')
    if (complete || leveledUp) burstConfetti()
  }, [leveledUp, complete])

  const byExercise = new Map<string, typeof sets>()
  for (const s of sets) byExercise.set(s.exerciseId, [...(byExercise.get(s.exerciseId) ?? []), s])

  async function rate(rating: 1 | 2 | 3) {
    setRated(rating)
    await addSoreness(db, session.id, rating)
    await afterWrite()
  }

  return (
    <main className="screen full summary">
      <MeadowScene height={230}>
        <div className="meadow-pet">
          <div className="bubble">{petLine(moment, session.id)}</div>
          <Pet size={120} mood="proud" />
        </div>
      </MeadowScene>
      <h1 className="center-text">{complete ? 'Hand cleared!' : 'Session saved'}</h1>
      <div className="row center summary-pills">
        <span className="chip xp-chip">+{xpShown} XP</span>
        {streak.after > streak.before && <Pill icon="flame" tone="flame" className="pop">{streak.after}-day streak!</Pill>}
      </div>
      <div className="pet-level">
        <strong className="pet-name">{profile.petName} · Lv {after.level}</strong>
        <XpBar value={after.xpIntoLevel} max={after.xpForNext} label={`${after.xpIntoLevel} of ${after.xpForNext} XP to next level`} />
      </div>

      <section className="panel stack">
        <strong className="summary-count">{setsShown} sets completed</strong>
        {[...byExercise.entries()].map(([exerciseId, list]) => (
          <div key={exerciseId} className="row spread">
            <span>{content.exercises[exerciseId]?.name ?? exerciseId}</span>
            <span className="muted">
              {list.map((s) => (s.stoppedForPain ? `${s.reps} (stopped: hurt)` : `${s.reps}${s.weightKg !== null ? `@${s.weightKg}kg` : ''}`)).join(' · ')}
            </span>
          </div>
        ))}
      </section>

      {suggestion && <p className="panel row"><Icon name="bulb" /> {suggestion.message}</p>}

      {onRamp && !alreadyRated && rated === null && (
        <section className="panel stack">
          <strong>How sore are you from recent sessions?</strong>
          <div className="row soreness">
            {SORENESS.map((o) => (
              <button key={o.rating} className="btn soreness-btn" onClick={() => void rate(o.rating)}>
                <Icon name={o.icon} size={34} /><span>{o.label}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      {rated !== null && (
        <p className="panel">
          {rated === 3
            ? "Thanks! We'll hold this week's settings a little longer so your body can catch up."
            : 'Thanks! Noted.'}
        </p>
      )}

      <div className="spacer" />
      <button className="btn btn-primary btn-block" onClick={() => navigate('/', { replace: true })}>Done</button>
      {leveledUp && !levelUpSeen && <LevelUpOverlay petName={profile.petName} level={after.level} onClose={() => setLevelUpSeen(true)} />}
    </main>
  )
}
```

- [ ] **Step 5: Update the e2e flow**

In `e2e/session.spec.ts`:

1. In `test.beforeEach`, add as the first line: `await page.emulateMedia({ reducedMotion: 'reduce' })`.
2. In the first test, between `await expect(page.getByText('+55 XP')).toBeVisible()` and `await page.getByRole('button', { name: 'Done' }).click()`, add:

```ts
  await page.getByRole('button', { name: 'Awesome!' }).click()
```

- [ ] **Step 6: Styles**

In `src/theme.css` delete the remaining `/* legacy:pet */ … /* end legacy:pet */` block (it now only holds `.pet-stage`) and append:

```css
/* summary */
.summary .meadow-pet { margin-top: auto; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.summary-pills { gap: 10px; flex-wrap: wrap; }
.xp-chip { font-family: var(--font-display); font-size: 20px; padding: 4px 14px; background: color-mix(in srgb, var(--gold) 30%, var(--panel)); border-color: var(--gold-base); }
.summary-count { font-family: var(--font-display); font-size: 20px; }
.soreness { align-items: stretch; }
.soreness-btn { flex: 1; flex-direction: column; gap: 4px; font-size: 14px; padding: 10px 6px; }
.levelup { position: fixed; inset: 0; z-index: 20; display: flex; align-items: center; justify-content: center; padding: 24px; background: rgba(10, 14, 40, 0.6); animation: fade-in 0.25s ease-out; }
.levelup-card { position: relative; width: 100%; max-width: 340px; display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 28px 20px 20px; border-radius: 28px; background: var(--panel); color: var(--text); border: 3px solid var(--gold); box-shadow: 0 6px 0 var(--gold-base); text-align: center; animation: pop-in 0.5s cubic-bezier(0.3, 1.6, 0.5, 1); }
.levelup-card h2 { font-size: 30px; }
.levelup-burst { position: absolute; top: -22px; display: flex; gap: 8px; color: var(--gold-base); }
.levelup-pet { animation: grow 1.2s ease-in-out infinite alternate; }
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes pop-in { from { transform: scale(0.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes grow { from { transform: scale(1); } to { transform: scale(1.1); } }
@media (prefers-reduced-motion: reduce) { .levelup-card, .levelup-pet { animation: none; } }
```

- [ ] **Step 7: Run tests**

Run: `npm test && npm run typecheck && npm run e2e`
Expected: all PASS, including the existing summary tests (`+45 XP`, `2 sets completed`, `Very sore`) and all 3 e2e tests.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(summary): confetti, count-ups, streak pop and a level-up celebration"
```

---

### Task 9: Decks and dealing a hand

**Files:**
- Modify: `src/screens/DecksScreen.tsx` (whole file), `src/screens/DecksScreen.test.tsx`, `src/screens/NewSessionScreen.tsx`, `src/theme.css`

**Interfaces:**
- Consumes: `RarityCard`, `Icon`.
- Produces: nothing new.

- [ ] **Step 1: Update the test first**

In `src/screens/DecksScreen.test.tsx`, add `import userEvent from '@testing-library/user-event'` and, right after `const push = await screen.findByRole('region', { name: 'Upper Body: Push' })`, add:

```tsx
    expect(within(push).queryByRole('article', { name: 'Push-up' })).toBeNull() // collapsed: only the fan preview (hidden from AT)
    await userEvent.setup().click(within(push).getByRole('button', { name: /See all/ }))
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/screens/DecksScreen.test.tsx`
Expected: FAIL — the Push-up article is visible and there is no "See all" button.

- [ ] **Step 3: Implement**

`src/screens/DecksScreen.tsx` (replace whole file):

```tsx
import { useState } from 'react'
import { Link } from 'react-router'
import { content } from '../content'
import { useAppData } from '../data/AppData'
import { availableChains, currentExerciseFor } from '../domain/recommender'
import type { Equipment } from '../domain/types'
import { Icon } from '../ui/Icon'
import { RarityCard } from '../ui/RarityCard'

const NEEDS: Record<Equipment, string> = { bodyweight: 'Needs nothing', dumbbell: 'Needs dumbbells', band: 'Needs resistance bands' }

export function DecksScreen() {
  const { profile, history } = useAppData()
  const [open, setOpen] = useState<string | null>(null)
  if (!profile) return null
  return (
    <main className="screen">
      <h1>Decks</h1>
      {content.decks.map((deck) => {
        const owned = new Set(availableChains(deck, content, profile.equipment).map((c) => c.id))
        const cards = deck.chainIds.map((id) => {
          const chain = content.chains[id]
          const current = content.exercises[currentExerciseFor(chain, profile, history)]
          return { id, chain, current }
        })
        const isOpen = open === deck.id
        return (
          <section key={deck.id} className="panel stack deck" aria-labelledby={`deck-${deck.id}`}>
            <div className="deck-fan" aria-hidden="true">
              {cards.slice(0, 3).map(({ id, current }) => <RarityCard key={id} exercise={current} size="mini" />)}
            </div>
            <div className="row spread">
              <div className="stack" style={{ gap: 2 }}>
                <h2 id={`deck-${deck.id}`}>{deck.name}</h2>
                <span className="muted">{deck.tagline}</span>
              </div>
              <Link className="btn btn-primary" to={`/session/new/${deck.id}`}>Train <Icon name="play" size={18} /></Link>
            </div>
            <button className="btn btn-ghost btn-block" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : deck.id)}>
              {isOpen ? 'Hide cards' : `See all ${cards.length} cards`}
            </button>
            {isOpen && (
              <div className="card-grid">
                {cards.map(({ id, chain, current }) => {
                  const next = chain.steps[chain.steps.indexOf(current.id) + 1]
                  return (
                    <div key={id} className={owned.has(id) ? undefined : 'unavailable'}>
                      <RarityCard exercise={current} size="mini">
                        {!owned.has(id) ? (
                          <span>{NEEDS[current.equipment]}</span>
                        ) : next ? (
                          <span className="row"><Icon name="lock" size={14} /> <span>Evolves → <b>{content.exercises[next].name}</b></span></span>
                        ) : (
                          <span className="row"><Icon name="star" size={14} /> Top of its line</span>
                        )}
                      </RarityCard>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}
    </main>
  )
}
```

In the test, `within(pushupCard).getByText(/Evolves →/)` now matches the inner `<span>`, whose text is `Evolves → Decline Push-up` — unchanged assertion.

`src/screens/NewSessionScreen.tsx` — hand stage. Replace the block from `{hand.map((card, i) => {` through the closing `})}` and the reroll + start buttons with:

```tsx
      <div className="hand-row">
        {hand.map((card, i) => {
          const canSwap = swapsLeft > 0 && swapOptions({ ...args, hand, index: i }).length > 0
          return (
            <div key={card.chainId} className="hand-slot" style={{ ['--i' as string]: i }}>
              <RarityCard exercise={content.exercises[card.exerciseId]} settings={s}>
                <button className="btn" disabled={!canSwap} onClick={() => setSwapping(i)}><Icon name="swap" size={18} /> Swap</button>
              </RarityCard>
            </div>
          )
        })}
      </div>
      <button
        className="btn btn-ghost" disabled={rerollsLeft === 0}
        onClick={() => { setRerollsLeft((n) => n - 1); deal(`${sessionId}:reroll`) }}
      >
        <Icon name="dice" /> Reroll whole hand ({rerollsLeft} left)
      </button>
      <button className="btn btn-primary btn-block" disabled={hand.length === 0 || starting} onClick={() => void start()}>
        Start <Icon name="play" size={18} />
      </button>
```

Also in the setup stage change `Deal my hand ▶` to `Deal my hand <Icon name="play" size={18} />`, and add `import { Icon } from '../ui/Icon'`. Re-dealing (reroll) must replay the flip-in: give the row a key that changes per deal — change `<div className="hand-row">` to `<div className="hand-row" key={rerollsLeft}>`.

- [ ] **Step 4: Styles**

In `src/theme.css` delete the remaining `/* legacy:decks */ … /* end legacy:decks */` block and append:

```css
/* decks + hand */
.deck { overflow: hidden; }
.deck-fan { position: relative; height: 120px; display: flex; justify-content: center; }
.deck-fan .rcard { position: absolute; top: 6px; width: 104px; }
.deck-fan .rcard .rcard-art { height: 60px; }
.deck-fan .rcard .rcard-stats, .deck-fan .rcard .rcard-type { display: none; }
.deck-fan .rcard:nth-child(1) { transform: translateX(-70px) rotate(-10deg); }
.deck-fan .rcard:nth-child(2) { z-index: 1; }
.deck-fan .rcard:nth-child(3) { transform: translateX(70px) rotate(10deg); }
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 14px; }
.unavailable { opacity: 0.45; }
.hand-row { display: flex; gap: 14px; overflow-x: auto; scroll-snap-type: x mandatory; padding: 6px 4px 14px; margin: 0 -16px; padding-left: 16px; padding-right: 16px; }
.hand-slot { flex: 0 0 76%; max-width: 300px; scroll-snap-align: center; animation: deal-in 0.5s cubic-bezier(0.3, 1.4, 0.5, 1) both; animation-delay: calc(var(--i) * 90ms); }
@keyframes deal-in { from { opacity: 0; transform: translateY(30px) rotateY(80deg); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .hand-slot { animation: none; } }
```

- [ ] **Step 5: Run tests**

Run: `npm test && npm run e2e`
Expected: all PASS (NewSession test still counts 5 articles and finds `Swap`, `1 swap left`, `Start`).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(decks): fanned deck previews, card collections and a dealt-hand row"
```

---

### Task 10: Progress, calendar and exercise history

**Files:**
- Modify: `src/domain/exerciseHistory.ts`, `src/domain/exerciseHistory.test.ts`, `src/ui/Sparkline.tsx`, `src/ui/MonthCalendar.tsx` (whole file), `src/screens/ProgressScreen.tsx`, `src/screens/ExerciseHistoryScreen.tsx` (whole file), `src/theme.css`

**Interfaces:**
- Consumes: `Icon`, `Pill`, `RarityCard`, `imageUrl`, existing `exerciseHistory(exerciseId, history)` and `trainedExercises(history)`.
- Produces: `bestSeries(exerciseId: string, history: History, max = 12): { values: number[]; byWeight: boolean }`; `Sparkline({ values, label, width = 240, height = 56 })`.

- [ ] **Step 1: Write the failing test**

Append to `src/domain/exerciseHistory.test.ts` (add `bestSeries` to the import from `./exerciseHistory`; reuse the file's fixture helpers `makeHistory`, `makeSession`, `makeSet`):

```ts
describe('bestSeries', () => {
  it('charts best weight when every session has one, else best reps, oldest first', () => {
    const history = makeHistory({
      sessions: [
        makeSession({ id: 'a', startedAt: '2026-01-05T09:00:00.000Z' }),
        makeSession({ id: 'b', startedAt: '2026-01-07T09:00:00.000Z' }),
      ],
      sets: [
        makeSet({ sessionId: 'a', exerciseId: 'db-curl', reps: 10, weightKg: 8 }),
        makeSet({ sessionId: 'b', exerciseId: 'db-curl', reps: 9, weightKg: 10 }),
        makeSet({ sessionId: 'a', exerciseId: 'pushup', reps: 8, weightKg: null }),
        makeSet({ sessionId: 'b', exerciseId: 'pushup', reps: 11, weightKg: null }),
      ],
    })
    expect(bestSeries('db-curl', history)).toEqual({ values: [8, 10], byWeight: true })
    expect(bestSeries('pushup', history)).toEqual({ values: [8, 11], byWeight: false })
    expect(bestSeries('squat', history)).toEqual({ values: [], byWeight: false })
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/domain/exerciseHistory.test.ts`
Expected: FAIL — `bestSeries` is not exported.

- [ ] **Step 3: Implement**

Append to `src/domain/exerciseHistory.ts`:

```ts
/** Chart data: best weight per session if every session has one, else best reps; oldest first, last `max` sessions. */
export function bestSeries(exerciseId: string, history: History, max = 12): { values: number[]; byWeight: boolean } {
  const chrono = [...exerciseHistory(exerciseId, history)].reverse().slice(-max)
  const byWeight = chrono.length > 0 && chrono.every((e) => e.bestWeight !== null)
  return { values: chrono.map((e) => (byWeight ? e.bestWeight! : e.bestReps)), byWeight }
}
```

(If `History` is not yet imported in that file, add `import type { History } from './types'`.)

`src/ui/Sparkline.tsx` (replace whole file):

```tsx
export function Sparkline({ values, label, width = 240, height = 56 }: { values: number[]; label: string; width?: number; height?: number }) {
  if (values.length === 0) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => {
    const x = values.length === 1 ? width / 2 : (i / (values.length - 1)) * (width - 8) + 4
    const y = height - 6 - ((v - min) / span) * (height - 12)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="sparkline">
      <polyline points={pts.join(' ')} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p) => {
        const [x, y] = p.split(',')
        return <circle key={p} cx={x} cy={y} r="3.5" fill="var(--gold)" stroke="var(--primary-base)" strokeWidth="1.5" />
      })}
    </svg>
  )
}
```

`src/ui/MonthCalendar.tsx` (replace whole file):

```tsx
import type { CalendarCell } from '../domain/calendar'
import { Icon, type IconName } from './Icon'

const MARK: Record<CalendarCell['status'], { icon: IconName | null; label: string }> = {
  done: { icon: 'check', label: 'trained' },
  bonus: { icon: 'star', label: 'bonus session' },
  shielded: { icon: 'shield', label: 'covered by shield' },
  missed: { icon: 'close', label: 'missed' },
  pending: { icon: null, label: 'today, not trained yet' },
  rest: { icon: null, label: 'rest day' },
  future: { icon: null, label: 'upcoming' },
  none: { icon: null, label: 'before you started' },
}

export function MonthCalendar({ weeks, title, onPrev, onNext }: {
  weeks: CalendarCell[][]; title: string; onPrev(): void; onNext(): void
}) {
  const monthName = title.split(' ')[0]
  return (
    <section className="panel stack">
      <div className="row spread">
        <button className="btn round" aria-label="Previous month" onClick={onPrev}><Icon name="chevron-left" /></button>
        <h2>{title}</h2>
        <button className="btn round" aria-label="Next month" onClick={onNext}><Icon name="chevron-right" /></button>
      </div>
      <div className="cal-grid">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i} className="cal-head">{d}</span>)}
        {weeks.flat().map((c) => {
          const icon = MARK[c.status].icon
          return (
            <div
              key={c.key}
              className={`cal-cell cal-${c.status}${c.inMonth ? '' : ' cal-out'}${c.deckId && c.status === 'future' ? ' cal-planned' : ''}`}
              aria-label={c.inMonth ? `${monthName} ${c.day}: ${MARK[c.status].label}` : undefined}
            >
              <span className="cal-day">{c.day}</span>
              <span className="cal-icon">{icon && <Icon name={icon} size={12} />}</span>
            </div>
          )
        })}
      </div>
      <p className="cal-legend">
        <span><span className="cal-dot cal-done" /> trained</span>
        <span><Icon name="shield" size={14} /> shield</span>
        <span><Icon name="close" size={14} /> missed</span>
        <span><Icon name="star" size={14} /> bonus</span>
        <span><span className="cal-dot cal-planned-dot" /> planned</span>
      </p>
    </section>
  )
}
```

`src/screens/ProgressScreen.tsx` — keep `syncStatusText` exactly as is. Add imports `import { imageUrl } from '../content'` (merge with the existing `content` import as `import { content, imageUrl } from '../content'`), `import { bestSeries, trainedExercises } from '../domain/exerciseHistory'` (replacing the existing `trainedExercises` import), `import { Icon } from '../ui/Icon'`, `import { Sparkline } from '../ui/Sparkline'`. Replace the JSX from `<h1>Progress</h1>` through the end of the "Exercises" section with:

```tsx
      <div className="row spread">
        <h1>Progress</h1>
      </div>
      <p className="pill sync-pill" role="status">{syncStatusText(mode, dirtyCount, needsSignIn)}</p>
      {needsSignIn && <Link className="btn btn-primary btn-block" to="/login">Sign in to sync</Link>}
      <div className="tiles">
        <div className="tile" aria-label={`Current streak: ${streak.current} day${streak.current === 1 ? '' : 's'}`}>
          <Icon name="flame" className="tile-icon flame" size={26} />
          <strong className="stat">{streak.current}</strong>
          <span className="label">Streak</span>
        </div>
        <div className="tile" aria-label={`Best streak: ${streak.best} day${streak.best === 1 ? '' : 's'}`}>
          <Icon name="star" className="tile-icon gold" size={26} />
          <strong className="stat">{streak.best}</strong>
          <span className="label">Best</span>
        </div>
        <div className="tile" aria-label={streak.shieldAvailable ? 'Shield ready' : 'Shield used this week'}>
          <Icon name="shield" className="tile-icon shield" size={26} />
          <strong className="stat">{streak.shieldAvailable ? 1 : 0}</strong>
          <span className="label">Shield</span>
        </div>
        <div className="tile">
          <Icon name="calendar" className="tile-icon" size={26} />
          <strong className="stat">{all.length}</strong>
          <span className="label">Sessions</span>
        </div>
        <div className="tile">
          <Icon name="muscle" className="tile-icon" size={26} />
          <strong className="stat">{setsDone.length}</strong>
          <span className="label">Sets done</span>
        </div>
      </div>
      <MonthCalendar weeks={weeks} title={title} onPrev={() => move(-1)} onNext={() => move(1)} />
      <section className="stack">
        <h2>Exercises</h2>
        {exercises.length === 0 && <p className="muted">Your exercise history will show up here after your first session.</p>}
        {exercises.map((e) => {
          const ex = content.exercises[e.exerciseId]
          const img = imageUrl(e.exerciseId)
          const series = bestSeries(e.exerciseId, history)
          return (
            <Link key={e.exerciseId} className="panel ex-row" to={`/progress/exercise/${e.exerciseId}`} data-rarity={ex?.rarity ?? 1}>
              {img ? <img className="ex-thumb" src={img} alt="" /> : <span className="ex-thumb" />}
              <span className="stack ex-text">
                <strong>{ex?.name ?? e.exerciseId}</strong>
                <span className="muted">{e.sessions} session{e.sessions === 1 ? '' : 's'}</span>
              </span>
              <Sparkline values={series.values} width={80} height={32} label={`${series.byWeight ? 'Best weight' : 'Best reps'} trend`} />
              <Icon name="chevron-right" />
            </Link>
          )
        })}
      </section>
```

In the "Recent sessions" list, replace `<span className="chip">{s.status === 'complete' ? 'Complete' : 'Partial'}</span>` with:

```tsx
                <span className={`chip ${s.status === 'complete' ? 'chip-good' : ''}`}>{s.status === 'complete' ? 'Complete' : 'Partial'}</span>
```

`src/screens/ExerciseHistoryScreen.tsx` (replace whole file):

```tsx
import { Link, useParams } from 'react-router'
import { content } from '../content'
import { useAppData } from '../data/AppData'
import { bestSeries, exerciseHistory } from '../domain/exerciseHistory'
import { Icon } from '../ui/Icon'
import { RarityCard } from '../ui/RarityCard'
import { Sparkline } from '../ui/Sparkline'

export function ExerciseHistoryScreen() {
  const { exerciseId = '' } = useParams()
  const { history, profile } = useAppData()
  // Wait for local data, so "No sets logged" never flashes while history loads.
  if (!profile) return null
  const exercise = content.exercises[exerciseId]
  const entries = exerciseHistory(exerciseId, history)
  const { values, byWeight } = bestSeries(exerciseId, history)
  const unit = byWeight ? ' kg' : ' reps'
  const label = `${byWeight ? 'Best weight' : 'Best reps'}: ${values[0]}${unit} → ${values[values.length - 1]}${unit}`

  return (
    <main className="screen">
      <Link className="row back-link" to="/progress"><Icon name="chevron-left" size={18} /> Progress</Link>
      <h1>{exercise?.name ?? exerciseId}</h1>
      {exercise && <div className="history-card"><RarityCard exercise={exercise} size="mini" /></div>}
      {entries.length === 0 ? (
        <p className="muted">No sets logged for this exercise yet.</p>
      ) : (
        <>
          <section className="panel stack">
            <span className="label">{byWeight ? 'Best weight per session' : 'Best reps per session'}</span>
            <Sparkline values={values} label={label} width={300} height={90} />
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

The heading is now the page `h1`; the mini card adds an `h3` with the same name, so the existing test `findByRole('heading', { name: 'Dumbbell Biceps Curl' })` would find two. Change that test line to `expect(await screen.findByRole('heading', { level: 1, name: 'Dumbbell Biceps Curl' })).toBeInTheDocument()`.

- [ ] **Step 4: Styles**

In `src/theme.css` delete the whole `/* legacy:progress */ … /* end legacy:progress */` block and append:

```css
/* progress */
.sync-pill { align-self: flex-start; margin: 0; font-size: 13px; }
.tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.tile { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 12px 6px; border-radius: var(--radius); background: var(--panel); border: 2.5px solid var(--panel-border); box-shadow: 0 var(--press) 0 var(--panel-border); }
.tile-icon { color: var(--text-muted); }
.tile-icon.flame { color: var(--primary); }
.tile-icon.gold { color: var(--gold-base); }
.tile-icon.shield { color: var(--rarity-1-base); }
.stat { font-family: var(--font-display); font-size: 28px; line-height: 1.1; }
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; text-align: center; }
.cal-head { font-size: 11px; font-weight: 800; color: var(--text-muted); }
.cal-cell { position: relative; aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 50%; background: var(--panel-sunken); font-size: 12px; font-weight: 800; }
.cal-out { opacity: 0.3; }
.cal-done, .cal-dot.cal-done { background: var(--gold); color: #3a1d00; box-shadow: inset 0 -3px 0 var(--gold-base); }
.cal-bonus { background: color-mix(in srgb, var(--gold) 40%, var(--panel-sunken)); }
.cal-shielded { background: color-mix(in srgb, var(--rarity-1) 25%, var(--panel-sunken)); }
.cal-missed { background: color-mix(in srgb, var(--danger) 18%, var(--panel-sunken)); }
.cal-pending { box-shadow: inset 0 0 0 2.5px var(--primary); }
.cal-planned::after, .cal-planned-dot { content: ''; position: absolute; bottom: 4px; width: 5px; height: 5px; border-radius: 50%; background: var(--primary); }
.cal-icon { line-height: 0; min-height: 12px; }
.cal-legend { display: flex; flex-wrap: wrap; gap: 6px 12px; margin: 0; font-size: 12px; color: var(--text-muted); }
.cal-legend > span { display: inline-flex; align-items: center; gap: 4px; }
.cal-dot { position: relative; display: inline-block; width: 12px; height: 12px; border-radius: 50%; }
.cal-planned-dot { position: static; display: inline-block; }
.sparkline { display: block; margin: 0 auto; }
.ex-row { display: flex; align-items: center; gap: 10px; text-decoration: none; color: inherit; padding: 10px; }
.ex-thumb { width: 52px; height: 52px; flex: none; object-fit: cover; border-radius: 12px; border: 3px solid var(--rarity-1); background: var(--panel-sunken); }
.ex-row[data-rarity='2'] .ex-thumb { border-color: var(--rarity-2); }
.ex-row[data-rarity='3'] .ex-thumb { border-color: var(--rarity-3); }
.ex-text { flex: 1; gap: 2px; }
.chip-good { background: color-mix(in srgb, var(--success) 20%, var(--panel)); border-color: var(--success); }
.back-link { color: var(--text-muted); font-weight: 800; text-decoration: none; }
.history-card { max-width: 200px; }
```

- [ ] **Step 5: Run tests**

Run: `npm test && npm run typecheck`
Expected: all PASS (Progress test labels `Current streak: 0 days`, `Best streak: 1 day`, `January 5: trained`, `January 6: covered by shield`, `January 8: missed`, link `/Push-up/`; ExerciseHistory sparkline label `Best weight: 8 kg → 10 kg`).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(progress): stat tiles, sun-circle calendar, exercise rows with trends"
```

---

### Task 11: Plan, Profile (with Sounds & vibration), Onboarding, Login, update banner

**Files:**
- Create: `src/ui/FeedbackSettingsSection.tsx`, `src/ui/FeedbackSettingsSection.test.tsx`
- Modify: `src/screens/PlanScreen.tsx`, `src/screens/ProfileScreen.tsx`, `src/screens/OnboardingScreen.tsx`, `src/screens/LoginScreen.tsx`, `src/ui/PetColorPicker.tsx`, `src/ui/UpdateBanner.tsx`, `src/theme.css`

**Interfaces:**
- Consumes: `loadFeedbackSettings`, `saveFeedbackSettings`, `feedback` (Task 2), `Icon`, `Pet`, `MeadowScene`.
- Produces: `FeedbackSettingsSection()` — checkboxes named "Sounds" and "Vibration".

- [ ] **Step 1: Write the failing test**

`src/ui/FeedbackSettingsSection.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { loadFeedbackSettings } from '../feedback/settings'
import { FeedbackSettingsSection } from './FeedbackSettingsSection'

describe('FeedbackSettingsSection', () => {
  afterEach(() => localStorage.clear())

  it('shows both switches on by default and saves changes on this device', async () => {
    const user = userEvent.setup()
    render(<FeedbackSettingsSection />)
    const sounds = screen.getByRole('checkbox', { name: /Sounds/ })
    const vibration = screen.getByRole('checkbox', { name: /Vibration/ })
    expect(sounds).toBeChecked()
    expect(vibration).toBeChecked()
    await user.click(sounds)
    expect(sounds).not.toBeChecked()
    expect(loadFeedbackSettings()).toEqual({ sound: false, vibration: true })
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/ui/FeedbackSettingsSection.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the section**

`src/ui/FeedbackSettingsSection.tsx`:

```tsx
import { useState } from 'react'
import { feedback } from '../feedback/feedback'
import { loadFeedbackSettings, saveFeedbackSettings, type FeedbackSettings } from '../feedback/settings'
import { Icon } from './Icon'

/** Per-device switches; never synced, so muting one phone leaves the others alone. */
export function FeedbackSettingsSection() {
  const [s, setS] = useState(loadFeedbackSettings)
  const update = (patch: Partial<FeedbackSettings>) => {
    const next = { ...s, ...patch }
    setS(next)
    saveFeedbackSettings(next)
    feedback('tap') // preview with the new setting
  }
  return (
    <section className="panel stack">
      <h2>Sounds &amp; vibration</h2>
      <span className="muted">Saved on this device only.</span>
      <label className="choice" aria-checked={s.sound} data-feedback="none">
        <input type="checkbox" checked={s.sound} onChange={(e) => update({ sound: e.target.checked })} />
        <Icon name="sound" /> Sounds
      </label>
      <label className="choice" aria-checked={s.vibration} data-feedback="none">
        <input type="checkbox" checked={s.vibration} onChange={(e) => update({ vibration: e.target.checked })} />
        <Icon name="vibrate" /> Vibration
      </label>
    </section>
  )
}
```

- [ ] **Step 4: Restyle the remaining screens**

`src/screens/ProfileScreen.tsx` — add imports `import { FeedbackSettingsSection } from '../ui/FeedbackSettingsSection'`. Replace the returned JSX (from `<main className="screen">` to `</main>`) with:

```tsx
    <main className="screen">
      <h1>Profile</h1>
      <section className="panel profile-hero">
        <Pet size={96} color={draft.petColor} />
        <label className="stack" style={{ flex: 1 }}>
          <span className="label">Pet name</span>
          <input type="text" maxLength={20} value={draft.petName} onChange={(e) => edit({ petName: e.target.value })} />
        </label>
        <PetColorPicker value={draft.petColor} onChange={(petColor) => edit({ petColor })} />
      </section>

      <section className="panel stack">
        <h2>Experience</h2>
        <span className="label">Goal: build muscle + strength</span>
        {EXPERIENCES.map((e) => (
          <button key={e.id} className="choice" aria-pressed={draft.experience === e.id} onClick={() => edit({ experience: e.id })}>
            <span className="stack" style={{ gap: 4 }}>
              <strong>{e.title}</strong>
              <span className="muted">{e.body}</span>
            </span>
          </button>
        ))}
      </section>

      <section className="panel stack">
        <h2>Equipment</h2>
        <label className="choice" aria-checked="true">
          <input type="checkbox" checked disabled readOnly /> Bodyweight (always included)
        </label>
        {OPTIONAL_EQUIPMENT.map((o) => (
          <label key={o.id} className="choice" aria-checked={draft.equipment.includes(o.id)}>
            <input type="checkbox" checked={draft.equipment.includes(o.id)} onChange={() => toggle(o.id)} /> {o.label}
          </label>
        ))}
      </section>

      <button className="btn btn-primary btn-block" onClick={() => void save()}>Save changes</button>
      {saved && <p role="status" className="center-text">Saved ✓</p>}

      <Link className="btn btn-block" to="/plan"><Icon name="calendar" /> Edit my week</Link>

      {mode === 'cloud' && supabase && profile && (
        <section className="panel">
          <RemindersSection
            value={{ reminderEnabled: profile.reminderEnabled, reminderTime: profile.reminderTime, nudgeEnabled: profile.nudgeEnabled }}
            onChange={(v) => void saveReminders(v)}
            subscribe={() => subscribePush(supabase!, import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined)}
            unsubscribe={() => unsubscribePush(supabase!)}
            deviceReady={pushReady}
          />
        </section>
      )}

      <FeedbackSettingsSection />

      <details className="panel">
        <summary>About the science</summary>
        <ul className="muted" style={{ fontSize: 13 }}>
          {Object.entries(SOURCES).map(([k, v]) => <li key={k}>{v}</li>)}
        </ul>
        <p className="muted" style={{ fontSize: 13 }}>General fitness information, not medical advice.</p>
      </details>

      {mode === 'cloud' && <button className="btn btn-danger" onClick={() => void doSignOut()}>Sign out</button>}
    </main>
```

and add `import { Icon } from '../ui/Icon'`. (Profile test: `Pet name` textbox, `Sky` radio, `Save changes`, `Saved ✓`, `Returning after a break`, `Resistance bands` — all kept.)

`src/ui/PetColorPicker.tsx` — keep markup; only the CSS changes (below).

`src/screens/PlanScreen.tsx` — add `import { Icon } from '../ui/Icon'`. Replace the `<section className="stack">…</section>` holding the weekday selects and the warnings line with:

```tsx
      <section className="week-grid">
        {WEEKDAYS.map((w) => (
          <label key={w} className={`day-tile${days[w] ? ' day-train' : ''}`}>
            <span className="day-name">{WEEKDAY_LABELS[w].slice(0, 3)}</span>
            <Icon name={days[w] ? 'muscle' : 'moon'} size={22} />
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
      {warnings.map((w) => <p key={w} className="panel row"><Icon name="warning" /> {w}</p>)}
```

`src/screens/OnboardingScreen.tsx` — add imports `import { MeadowScene } from '../ui/MeadowScene'` (Pet is already imported since Task 4). Insert, directly after `<main className="screen full">`:

```tsx
      <div className="steps" role="progressbar" aria-label="Setup progress" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={4}>
        {[0, 1, 2, 3].map((i) => <i key={i} className={i <= step ? 'on' : undefined} />)}
      </div>
      <MeadowScene height={190} className="onboard-meadow">
        <div className="meadow-pet">
          <Pet
            size={step === 3 ? 130 : 100} color={petColor}
            mood={step === 0 ? 'happy' : step === 1 ? (experience ? 'excited' : 'happy') : step === 2 ? (equipment.length > 1 ? 'excited' : 'happy') : 'proud'}
          />
        </div>
      </MeadowScene>
```

In step 3 remove the line `<Pet size={180} mood="excited" color={petColor} />` (the meadow shows the pet), change `Hatch &amp; start ▶` to `Hatch &amp; start`, and change "with a pixel buddy that grows as you train" to "with a buddy that grows as you train".

`src/screens/LoginScreen.tsx` — add imports `import { MeadowScene } from '../ui/MeadowScene'`, `import { Pet } from '../ui/Pet'`. Replace the returned JSX with:

```tsx
    <main className="screen full">
      <MeadowScene height={230}>
        <div className="meadow-pet">
          <div className="bubble">Hi! Sign in so I can remember all our progress.</div>
          <Pet size={110} />
        </div>
      </MeadowScene>
      <h1 className="center-text">Pocket Gains</h1>
      <form className="panel stack" onSubmit={submit}>
        <label className="stack">
          <span className="label">Email</span>
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="stack">
          <span className="label">Password</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </main>
```

`src/ui/UpdateBanner.tsx` — replace the returned JSX with:

```tsx
    <div className="update-banner" role="status">
      <span className="row"><Icon name="sparkle" /> A new version of Pocket Gains is ready.</span>
      <div className="row">
        <button className="btn btn-primary" onClick={() => void updateServiceWorker(true)}>Update</button>
        <button className="btn btn-ghost" onClick={() => setNeedRefresh(false)}>Later</button>
      </div>
    </div>
```

and add `import { Icon } from './Icon'`.

- [ ] **Step 5: Styles**

In `src/theme.css` delete the whole `/* legacy:profile */ … /* end legacy:profile */` block and append:

```css
/* profile, plan, onboarding, banner */
.profile-hero { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; }
.swatches { display: flex; flex-wrap: wrap; gap: 10px; }
.swatch { width: 44px; height: 44px; padding: 0; border-radius: 50%; cursor: pointer; border: 3px solid var(--panel); box-shadow: 0 0 0 2.5px var(--panel-border); }
.swatch[aria-checked='true'] { box-shadow: 0 0 0 3px var(--primary); }
.week-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 10px; }
.day-tile { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px 8px; border-radius: var(--radius); background: var(--panel); border: 2.5px solid var(--panel-border); box-shadow: 0 var(--press) 0 var(--panel-border); color: var(--text-muted); }
.day-train { color: var(--text); border-color: var(--primary); box-shadow: 0 var(--press) 0 var(--primary-base); }
.day-name { font-family: var(--font-display); font-weight: 700; font-size: 17px; color: var(--text); }
.day-tile select { width: 100%; font-size: 13px; padding: 6px; }
.steps { display: flex; gap: 6px; }
.steps i { flex: 1; height: 8px; border-radius: 4px; background: var(--panel-border); }
.steps i.on { background: var(--primary); }
.onboard-meadow .meadow-pet, .screen > .meadow .meadow-pet { margin-top: auto; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.update-banner { position: fixed; top: calc(10px + env(safe-area-inset-top)); left: 12px; right: 12px; z-index: 6; max-width: 496px; margin: 0 auto; display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: 20px; background: var(--panel); color: var(--text); border: 2.5px solid var(--primary); box-shadow: 0 var(--press) 0 var(--primary-base); animation: slide-down 0.4s cubic-bezier(0.3, 1.4, 0.5, 1); }
@keyframes slide-down { from { transform: translateY(-120%); } to { transform: none; } }
@media (prefers-reduced-motion: reduce) { .update-banner { animation: none; } }
```

- [ ] **Step 6: Run tests**

Run: `npm test && npm run typecheck && npm run e2e`
Expected: all PASS (Plan comboboxes, Profile, Onboarding `Next`/`Hatch`/`Lavender`, UpdateBanner `Update`/`Later`).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(design): restyle plan, profile, onboarding, login and the update banner; sound and vibration switches"
```

---

### Task 12: Cleanup, emoji/legacy audit, size check and docs

**Files:**
- Create: `src/design/audit.test.ts`
- Modify: `src/theme.css` (remove legacy aliases), `PROGRESS.md`

**Interfaces:**
- Consumes: everything above.
- Produces: nothing new.

- [ ] **Step 1: Write the failing audit test**

`src/design/audit.test.ts`:

```ts
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function files(dir: string, ext: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return files(p, ext)
    return p.endsWith(ext) && !p.includes('.test.') ? [p] : []
  })
}

const UI = [...files('src/screens', '.tsx'), ...files('src/ui', '.tsx'), 'src/router.tsx']

describe('design audit', () => {
  it('uses icons, not emoji, in the interface', () => {
    const hits = UI.flatMap((f) =>
      readFileSync(f, 'utf8').split('\n').flatMap((line, i) => (/\p{Extended_Pictographic}/u.test(line) ? [`${f}:${i + 1}`] : [])),
    )
    expect(hits).toEqual([])
  })

  it('no longer uses the old colour names', () => {
    const legacy = /var\(--(accent|accent-2|good|muted|surface|surface-2|ink)\)/
    const hits = [...UI, 'src/theme.css'].filter((f) => legacy.test(readFileSync(f, 'utf8')))
    expect(hits).toEqual([])
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/design/audit.test.ts`
Expected: the emoji test PASSES already (Tasks 3–11 removed them; if any line is listed, replace that emoji with an `Icon` and re-run). The colour-name test FAILS on `src/theme.css` (the legacy alias block).

- [ ] **Step 3: Remove the legacy aliases**

In `src/theme.css` delete these lines from `:root`:

```css
  /* legacy names, removed in Task 12 */
  --accent: var(--primary);
  --accent-2: var(--gold);
  --good: var(--success);
  --muted: var(--text-muted);
  --surface: var(--panel);
  --surface-2: var(--panel-border);
  --ink: var(--panel-sunken);
```

Run: `grep -n "legacy" src/theme.css` — Expected: no output.

- [ ] **Step 4: Full verification and bundle size**

Run: `npm test && npm run typecheck && npm run lint && npm run build && npm run e2e`
Expected: all PASS; lint shows only the 4 pre-existing warnings (plus allowed constant-export warnings if any). Then:

```bash
du -cb dist/assets/* | tail -1          # design-pass total
git switch -q main && npm run build >/dev/null && du -cb dist/assets/* | tail -1 && git switch -q design-pass
npm run build >/dev/null                # restore this branch's build
```

Record both totals; the difference is the size the design pass adds (spec estimate ≈ +100 KB).

- [ ] **Step 5: Update `PROGRESS.md`**

In the status table change the **Design pass** row status to `🔧 Built on branch \`design-pass\`; waiting for on-device check` and add a changelog entry at the top of `## Changelog`:

```markdown
### 2026-10-13: Design pass built
- **Look:** "Sky meadow" theme with a day/night cycle (morning, day, sunset, night), Fredoka + Nunito fonts, chunky press-in buttons and panels, hand-drawn icons instead of emoji.
- **Pet:** lives in a meadow scene; moods (happy, excited, proud, relaxed, sleepy, missed you), blinking, looking around, jumps when tapped.
- **Cards:** rarity colours (blue common, purple rare, gold epic with a shine).
- **Workout:** focus mode in the card's rarity colour with rep and rest rings and set pips.
- **Celebrations:** confetti, count-ups, streak pop and a level-up overlay.
- **Feedback:** tap sounds and vibration, with per-device switches in Profile.
- **Size:** adds <N> KB to the download (mostly the two fonts).
```

(Replace `<N>` with the number measured in Step 4.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(design): audit for emoji and old colour names; progress notes"
```

---

## Acceptance (user, on device, after merge/deploy with the user's go-ahead)

Every screen in day and in night (set the phone clock past 20:00 or wait for evening); a full workout with sounds/vibration on, then off; the summary celebration and a level-up; tapping the pet; offline launch still works.

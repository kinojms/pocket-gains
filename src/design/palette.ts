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

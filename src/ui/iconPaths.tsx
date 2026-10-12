import type { ReactNode } from 'react'

const F = { fill: 'currentColor', fillOpacity: 0.18 }

export const PATHS = {
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


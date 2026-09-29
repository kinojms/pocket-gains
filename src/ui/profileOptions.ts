import type { Equipment, Experience } from '../domain/types'

export const EXPERIENCES: { id: Experience; title: string; body: string }[] = [
  { id: 'new', title: 'New to training', body: 'Never trained regularly. We start gently for the first 4 weeks.' },
  { id: 'returning', title: 'Returning after a break', body: 'Trained before, stopped for a while. A 2-week on-ramp.' },
  { id: 'consistent', title: 'Training consistently', body: 'Training 2+ times a week for the last 3 months.' },
]

export const OPTIONAL_EQUIPMENT: { id: Equipment; label: string }[] = [
  { id: 'dumbbell', label: 'Dumbbells' },
  { id: 'band', label: 'Resistance bands' },
]

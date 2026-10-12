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

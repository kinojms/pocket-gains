import type { EndReason } from '../../domain/types'

const REASONS: { id: EndReason; label: string }[] = [
  { id: 'tired', label: '😴 Tired' },
  { id: 'no_time', label: '⏰ No time' },
  { id: 'too_hard', label: '💪 Too hard' },
  { id: 'other', label: '🤷 Other / skip' },
]

export function EndEarlySheet({ onCancel, onConfirm }: { onCancel(): void; onConfirm(reason: EndReason): void }) {
  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-labelledby="end-title">
      <div className="sheet">
        <h2 id="end-title">End session early?</h2>
        <p className="muted">Every set you've done is saved and still counts.</p>
        <span className="label">Why? This helps tune your next session</span>
        {REASONS.map((r) => (
          <button key={r.id} className="btn" onClick={() => onConfirm(r.id)}>{r.label}</button>
        ))}
        <button className="btn btn-primary" onClick={onCancel}>Keep going 💪</button>
      </div>
    </div>
  )
}

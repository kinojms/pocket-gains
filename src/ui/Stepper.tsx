export function Stepper({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange(v: number): void
}) {
  return (
    <div className="row spread">
      <span>{label}</span>
      <div className="row">
        <button className="btn round" aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}>−</button>
        <output aria-label={label} className="stepper-value">{value}</output>
        <button className="btn round" aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}>+</button>
      </div>
    </div>
  )
}

/** Set progress: done pips filled, the current one highlighted. */
export function Pips({ done, total }: { done: number; total: number }) {
  return (
    <span className="pips" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => <i key={i} className={i < done ? 'on' : i === done ? 'now' : undefined} />)}
    </span>
  )
}

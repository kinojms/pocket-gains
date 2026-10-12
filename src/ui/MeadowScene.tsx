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

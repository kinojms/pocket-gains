import { SOURCES, type SourceKey } from '../content/sources'

export function InfoSources({ keys }: { keys: SourceKey[] }) {
  return (
    <details className="sources">
      <summary>ⓘ Why this number?</summary>
      <ul>
        {keys.map((k) => <li key={k}>{SOURCES[k]}</li>)}
      </ul>
    </details>
  )
}

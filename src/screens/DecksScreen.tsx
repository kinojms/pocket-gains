import { Link } from 'react-router'
import { content } from '../content'
import { useAppData } from '../data/AppData'
import { availableChains, currentExerciseFor } from '../domain/recommender'
import type { Equipment } from '../domain/types'
import { TcgCard } from '../ui/TcgCard'

const NEEDS: Record<Equipment, string> = { bodyweight: 'Needs nothing', dumbbell: 'Needs dumbbells', band: 'Needs resistance bands' }

export function DecksScreen() {
  const { profile, history } = useAppData()
  if (!profile) return null
  return (
    <main className="screen">
      <h1>Decks</h1>
      {content.decks.map((deck) => {
        const owned = new Set(availableChains(deck, content, profile.equipment).map((c) => c.id))
        return (
          <section key={deck.id} className="stack" aria-labelledby={`deck-${deck.id}`}>
            <div className="row spread">
              <div className="stack" style={{ gap: 2 }}>
                <h2 id={`deck-${deck.id}`}>{deck.name}</h2>
                <span className="muted">{deck.tagline}</span>
              </div>
              <Link className="btn btn-primary center-text" to={`/session/new/${deck.id}`}>Train ▶</Link>
            </div>
            <div className="card-grid">
              {deck.chainIds.map((id) => {
                const chain = content.chains[id]
                const current = content.exercises[currentExerciseFor(chain, profile, history)]
                const next = chain.steps[chain.steps.indexOf(current.id) + 1]
                return (
                  <div key={id} className={owned.has(id) ? undefined : 'unavailable'}>
                    <TcgCard exercise={current}>
                      {!owned.has(id) ? (
                        <span>{NEEDS[current.equipment]}</span>
                      ) : next ? (
                        <span>🔒 Evolves → <b>{content.exercises[next].name}</b></span>
                      ) : (
                        <span>★ Top of its line</span>
                      )}
                    </TcgCard>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </main>
  )
}

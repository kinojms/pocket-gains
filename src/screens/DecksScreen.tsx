import { useState } from 'react'
import { Link } from 'react-router'
import { content } from '../content'
import { useAppData } from '../data/AppData'
import { availableChains, currentExerciseFor } from '../domain/recommender'
import type { Equipment } from '../domain/types'
import { Icon } from '../ui/Icon'
import { RarityCard } from '../ui/RarityCard'

const NEEDS: Record<Equipment, string> = { bodyweight: 'Needs nothing', dumbbell: 'Needs dumbbells', band: 'Needs resistance bands' }

export function DecksScreen() {
  const { profile, history } = useAppData()
  const [open, setOpen] = useState<string | null>(null)
  if (!profile) return null
  return (
    <main className="screen">
      <h1>Decks</h1>
      {content.decks.map((deck) => {
        const owned = new Set(availableChains(deck, content, profile.equipment).map((c) => c.id))
        const cards = deck.chainIds.map((id) => {
          const chain = content.chains[id]
          const current = content.exercises[currentExerciseFor(chain, profile, history)]
          return { id, chain, current }
        })
        const isOpen = open === deck.id
        return (
          <section key={deck.id} className="panel stack deck" aria-labelledby={`deck-${deck.id}`}>
            <div className="deck-fan" aria-hidden="true">
              {cards.slice(0, 3).map(({ id, current }) => <RarityCard key={id} exercise={current} size="mini" />)}
            </div>
            <div className="row spread">
              <div className="stack" style={{ gap: 2 }}>
                <h2 id={`deck-${deck.id}`}>{deck.name}</h2>
                <span className="muted">{deck.tagline}</span>
              </div>
              <Link className="btn btn-primary" to={`/session/new/${deck.id}`}>Train <Icon name="play" size={18} /></Link>
            </div>
            <button className="btn btn-ghost btn-block" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : deck.id)}>
              {isOpen ? 'Hide cards' : `See all ${cards.length} cards`}
            </button>
            {isOpen && (
              <div className="card-grid">
                {cards.map(({ id, chain, current }) => {
                  const next = chain.steps[chain.steps.indexOf(current.id) + 1]
                  return (
                    <div key={id} className={owned.has(id) ? undefined : 'unavailable'}>
                      <RarityCard exercise={current} size="mini">
                        {!owned.has(id) ? (
                          <span>{NEEDS[current.equipment]}</span>
                        ) : next ? (
                          <span className="row"><Icon name="lock" size={14} /> <span>Evolves → <b>{content.exercises[next].name}</b></span></span>
                        ) : (
                          <span className="row"><Icon name="star" size={14} /> Top of its line</span>
                        )}
                      </RarityCard>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}
    </main>
  )
}

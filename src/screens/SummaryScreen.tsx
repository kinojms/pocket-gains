import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { content } from '../content'
import { useAppData } from '../data/AppData'
import { addSoreness } from '../data/repo'
import { recommendDefaults } from '../domain/defaults'
import { endEarlySuggestion } from '../domain/history'
import { countsForXp, levelFromXp, petLine, sessionXp, totalXp } from '../domain/pet'
import { streakGain } from '../domain/streak'
import type { Profile, SessionRecord } from '../domain/types'
import { feedback } from '../feedback/feedback'
import { burstConfetti } from '../ui/celebrate'
import { Icon, type IconName } from '../ui/Icon'
import { LevelUpOverlay } from '../ui/LevelUpOverlay'
import { MeadowScene } from '../ui/MeadowScene'
import { Pet } from '../ui/Pet'
import { Pill } from '../ui/Pill'
import { useCountUp } from '../ui/useCountUp'
import { XpBar } from '../ui/XpBar'

const SORENESS: { rating: 1 | 2 | 3; label: string; icon: IconName }[] = [
  { rating: 1, label: 'Fine', icon: 'face-happy' },
  { rating: 2, label: 'A bit sore', icon: 'face-meh' },
  { rating: 3, label: 'Very sore', icon: 'face-sore' },
]

export function SummaryScreen() {
  const { sessionId } = useParams()
  const { ready, profile, history } = useAppData()
  if (!ready) return null
  const session = history.sessions.find((s) => s.id === sessionId)
  if (!session || !profile) return <Navigate to="/" replace />
  return <SummaryView session={session} profile={profile} />
}

function SummaryView({ session, profile }: { session: SessionRecord; profile: Profile }) {
  const { db, history, plans, afterWrite } = useAppData()
  const navigate = useNavigate()
  const [rated, setRated] = useState<1 | 2 | 3 | null>(null)
  const [levelUpSeen, setLevelUpSeen] = useState(false)

  const sets = history.sets.filter((s) => s.sessionId === session.id)
  const done = sets.filter(countsForXp)
  const gained = sessionXp(history, session.id)
  const after = levelFromXp(totalXp(history))
  const leveledUp = after.level > levelFromXp(totalXp(history) - gained).level
  const complete = session.status === 'complete'
  const moment = leveledUp ? 'level_up' : complete ? 'summary_complete' : 'summary_partial'
  const onRamp = recommendDefaults(profile, history, new Date(session.startedAt)).stage !== 'target'
  const alreadyRated = history.soreness.some((c) => c.sessionId === session.id)
  const suggestion = complete ? null : endEarlySuggestion(history)
  const streak = streakGain({ profile, history, plans }, session.id, new Date(session.startedAt))
  const xpShown = useCountUp(gained)
  const setsShown = useCountUp(done.length)

  // Celebrate once per visit, not on every re-render.
  const celebrated = useRef(false)
  useEffect(() => {
    if (celebrated.current) return
    celebrated.current = true
    feedback(leveledUp ? 'levelUp' : 'celebrate')
    if (complete || leveledUp) burstConfetti()
  }, [leveledUp, complete])

  const byExercise = new Map<string, typeof sets>()
  for (const s of sets) byExercise.set(s.exerciseId, [...(byExercise.get(s.exerciseId) ?? []), s])

  async function rate(rating: 1 | 2 | 3) {
    setRated(rating)
    await addSoreness(db, session.id, rating)
    await afterWrite()
  }

  return (
    <main className="screen full summary">
      <MeadowScene height={230}>
        <div className="meadow-pet">
          <div className="bubble">{petLine(moment, session.id)}</div>
          <Pet size={120} mood="proud" />
        </div>
      </MeadowScene>
      <h1 className="center-text">{complete ? 'Hand cleared!' : 'Session saved'}</h1>
      <div className="row center summary-pills">
        <span className="chip xp-chip">+{xpShown} XP</span>
        {streak.after > streak.before && <Pill icon="flame" tone="flame" className="pop">{streak.after}-day streak!</Pill>}
      </div>
      <div className="pet-level">
        <strong className="pet-name">{profile.petName} · Lv {after.level}</strong>
        <XpBar value={after.xpIntoLevel} max={after.xpForNext} label={`${after.xpIntoLevel} of ${after.xpForNext} XP to next level`} />
      </div>

      <section className="panel stack">
        <strong className="summary-count">{setsShown} sets completed</strong>
        {[...byExercise.entries()].map(([exerciseId, list]) => (
          <div key={exerciseId} className="row spread">
            <span>{content.exercises[exerciseId]?.name ?? exerciseId}</span>
            <span className="muted">
              {list.map((s) => (s.stoppedForPain ? `${s.reps} (stopped: hurt)` : `${s.reps}${s.weightKg !== null ? `@${s.weightKg}kg` : ''}`)).join(' · ')}
            </span>
          </div>
        ))}
      </section>

      {suggestion && <p className="panel row"><Icon name="bulb" /> {suggestion.message}</p>}

      {onRamp && !alreadyRated && rated === null && (
        <section className="panel stack">
          <strong>How sore are you from recent sessions?</strong>
          <div className="row soreness">
            {SORENESS.map((o) => (
              <button key={o.rating} className="btn soreness-btn" onClick={() => void rate(o.rating)}>
                <Icon name={o.icon} size={34} /><span>{o.label}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      {rated !== null && (
        <p className="panel">
          {rated === 3
            ? "Thanks! We'll hold this week's settings a little longer so your body can catch up."
            : 'Thanks! Noted.'}
        </p>
      )}

      <div className="spacer" />
      <button className="btn btn-primary btn-block" onClick={() => navigate('/', { replace: true })}>Done</button>
      {leveledUp && !levelUpSeen && <LevelUpOverlay petName={profile.petName} level={after.level} onClose={() => setLevelUpSeen(true)} />}
    </main>
  )
}

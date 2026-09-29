import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { useAppData } from '../data/AppData'
import { saveProfile } from '../data/repo'
import type { Equipment, Experience } from '../domain/types'
import { PetSprite } from '../ui/PetSprite'
import { EXPERIENCES, OPTIONAL_EQUIPMENT } from '../ui/profileOptions'

export function OnboardingScreen() {
  const { db, profile, afterWrite } = useAppData()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [understood, setUnderstood] = useState(false)
  const [experience, setExperience] = useState<Experience | null>(null)
  const [equipment, setEquipment] = useState<Equipment[]>(['bodyweight'])
  const [petName, setPetName] = useState('Biscuit')

  if (profile) return <Navigate to="/" replace />

  const toggle = (id: Equipment) =>
    setEquipment((cur) => (cur.includes(id) ? cur.filter((e) => e !== id) : [...cur, id]))

  async function finish() {
    await saveProfile(db, {
      goal: 'muscle_strength',
      experience: experience!,
      onboardedAt: new Date().toISOString(),
      equipment: (['bodyweight', 'dumbbell', 'band'] as Equipment[]).filter((e) => equipment.includes(e)),
      petName: petName.trim() || 'Biscuit',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
    await afterWrite()
    navigate('/', { replace: true })
  }

  return (
    <main className="screen full">
      {step === 0 && (
        <section className="stack">
          <h1>Welcome to Lock In</h1>
          <p>Each workout is a hand of exercise cards, built on published training research, with a pixel buddy that grows as you train.</p>
          <div className="panel stack">
            <strong>Before we start</strong>
            <p className="muted">
              This app gives general fitness information, not medical advice. Stop any exercise that causes sharp pain.
              If you have an injury or health condition, check with a professional first.
            </p>
            <label className="row">
              <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />
              I understand
            </label>
          </div>
          <button className="btn btn-primary btn-block" disabled={!understood} onClick={() => setStep(1)}>Next</button>
        </section>
      )}

      {step === 1 && (
        <section className="stack">
          <span className="label">Your goal: build muscle + strength</span>
          <h2>Where are you starting from?</h2>
          {EXPERIENCES.map((e) => (
            <button key={e.id} className="choice" aria-pressed={experience === e.id} onClick={() => setExperience(e.id)}>
              <span className="stack" style={{ gap: 4 }}>
                <strong>{e.title}</strong>
                <span className="muted">{e.body}</span>
              </span>
            </button>
          ))}
          <button className="btn btn-primary btn-block" disabled={!experience} onClick={() => setStep(2)}>Next</button>
        </section>
      )}

      {step === 2 && (
        <section className="stack">
          <h2>What equipment do you have?</h2>
          <label className="choice" aria-checked="true">
            <input type="checkbox" checked disabled readOnly /> Bodyweight (always included)
          </label>
          {OPTIONAL_EQUIPMENT.map((o) => (
            <label key={o.id} className="choice" aria-checked={equipment.includes(o.id)}>
              <input type="checkbox" checked={equipment.includes(o.id)} onChange={() => toggle(o.id)} /> {o.label}
            </label>
          ))}
          <button className="btn btn-primary btn-block" onClick={() => setStep(3)}>Next</button>
        </section>
      )}

      {step === 3 && (
        <section className="stack" style={{ alignItems: 'center', textAlign: 'center' }}>
          <h2>Meet your training buddy</h2>
          <PetSprite size={180} bounce />
          <label className="stack" style={{ width: '100%' }}>
            <span className="label">Pet name</span>
            <input type="text" value={petName} maxLength={20} onChange={(e) => setPetName(e.target.value)} />
          </label>
          <button className="btn btn-primary btn-block" onClick={() => void finish()}>Hatch &amp; start ▶</button>
        </section>
      )}
    </main>
  )
}

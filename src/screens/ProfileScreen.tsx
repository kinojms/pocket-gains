import { useState } from 'react'
import { Link } from 'react-router'
import { SOURCES } from '../content/sources'
import { useAppData } from '../data/AppData'
import { pushReady, subscribePush, unsubscribePush } from '../data/push'
import { addPlanSnapshots, saveProfile } from '../data/repo'
import { supabase } from '../data/supabase'
import { experienceChange } from '../domain/plan'
import type { Equipment, Profile } from '../domain/types'
import { FeedbackSettingsSection } from '../ui/FeedbackSettingsSection'
import { Icon } from '../ui/Icon'
import { PetColorPicker } from '../ui/PetColorPicker'
import { Pet } from '../ui/Pet'
import { EXPERIENCES, OPTIONAL_EQUIPMENT } from '../ui/profileOptions'
import { RemindersSection, type ReminderSettings } from '../ui/RemindersSection'

export function ProfileScreen() {
  const { profile } = useAppData()
  if (!profile) return null
  return <ProfileForm initial={profile} />
}

function ProfileForm({ initial }: { initial: Profile }) {
  const { db, mode, dirtyCount, afterWrite, signOut, profile, history, plans } = useAppData()
  const [draft, setDraft] = useState(initial)
  const [saved, setSaved] = useState(false)
  const edit = (patch: Partial<Profile>) => {
    setDraft((d) => ({ ...d, ...patch }))
    setSaved(false)
  }
  const toggle = (id: Equipment) =>
    edit({
      equipment: (['bodyweight', 'dumbbell', 'band'] as Equipment[]).filter((e) =>
        e === id ? !draft.equipment.includes(e) : draft.equipment.includes(e),
      ),
    })

  async function save() {
    // Save only what the form edits, on top of the latest profile (reminderDays is kept current by the app).
    const latest = profile ?? initial
    if (draft.experience !== latest.experience) {
      await addPlanSnapshots(db, experienceChange({ profile: latest, history, plans }, draft.experience, new Date()))
    }
    await saveProfile(db, {
      ...latest,
      experience: draft.experience,
      equipment: draft.equipment,
      petName: draft.petName.trim() || initial.petName,
      petColor: draft.petColor,
    })
    await afterWrite()
    setSaved(true)
  }

  async function saveReminders(v: ReminderSettings) {
    const latest = profile ?? initial
    await saveProfile(db, { ...latest, ...v })
    await afterWrite()
  }

  async function doSignOut() {
    const warn = dirtyCount > 0 ? ` ${dirtyCount} unsynced change(s) on this device will be lost.` : ''
    if (window.confirm(`Sign out?${warn}`)) await signOut()
  }

  return (
    <main className="screen">
      <h1>Profile</h1>
      <section className="panel profile-hero">
        <Pet size={96} color={draft.petColor} />
        <label className="stack" style={{ flex: 1 }}>
          <span className="label">Pet name</span>
          <input type="text" maxLength={20} value={draft.petName} onChange={(e) => edit({ petName: e.target.value })} />
        </label>
        <PetColorPicker value={draft.petColor} onChange={(petColor) => edit({ petColor })} />
      </section>

      <section className="panel stack">
        <h2>Experience</h2>
        <span className="label">Goal: build muscle + strength</span>
        {EXPERIENCES.map((e) => (
          <button key={e.id} className="choice" aria-pressed={draft.experience === e.id} onClick={() => edit({ experience: e.id })}>
            <span className="stack" style={{ gap: 4 }}>
              <strong>{e.title}</strong>
              <span className="muted">{e.body}</span>
            </span>
          </button>
        ))}
      </section>

      <section className="panel stack">
        <h2>Equipment</h2>
        <label className="choice" aria-checked="true">
          <input type="checkbox" checked disabled readOnly /> Bodyweight (always included)
        </label>
        {OPTIONAL_EQUIPMENT.map((o) => (
          <label key={o.id} className="choice" aria-checked={draft.equipment.includes(o.id)}>
            <input type="checkbox" checked={draft.equipment.includes(o.id)} onChange={() => toggle(o.id)} /> {o.label}
          </label>
        ))}
      </section>

      <button className="btn btn-primary btn-block" onClick={() => void save()}>Save changes</button>
      {saved && <p role="status" className="center-text">Saved ✓</p>}

      <Link className="btn btn-block" to="/plan"><Icon name="calendar" /> Edit my week</Link>

      {mode === 'cloud' && supabase && profile && (
        <section className="panel">
          <RemindersSection
            value={{ reminderEnabled: profile.reminderEnabled, reminderTime: profile.reminderTime, nudgeEnabled: profile.nudgeEnabled }}
            onChange={(v) => void saveReminders(v)}
            subscribe={() => subscribePush(supabase!, import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined)}
            unsubscribe={() => unsubscribePush(supabase!)}
            deviceReady={pushReady}
          />
        </section>
      )}

      <FeedbackSettingsSection />

      <details className="panel">
        <summary>About the science</summary>
        <ul className="muted" style={{ fontSize: 13 }}>
          {Object.entries(SOURCES).map(([k, v]) => <li key={k}>{v}</li>)}
        </ul>
        <p className="muted" style={{ fontSize: 13 }}>General fitness information, not medical advice.</p>
      </details>

      {mode === 'cloud' && <button className="btn btn-danger" onClick={() => void doSignOut()}>Sign out</button>}
    </main>
  )
}

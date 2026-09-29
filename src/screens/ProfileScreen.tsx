import { useState } from 'react'
import { SOURCES } from '../content/sources'
import { useAppData } from '../data/AppData'
import { saveProfile } from '../data/repo'
import type { Equipment, Profile } from '../domain/types'
import { EXPERIENCES, OPTIONAL_EQUIPMENT } from '../ui/profileOptions'

export function ProfileScreen() {
  const { profile } = useAppData()
  if (!profile) return null
  return <ProfileForm initial={profile} />
}

function ProfileForm({ initial }: { initial: Profile }) {
  const { db, mode, dirtyCount, afterWrite, signOut } = useAppData()
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
    await saveProfile(db, { ...draft, petName: draft.petName.trim() || initial.petName })
    await afterWrite()
    setSaved(true)
  }

  async function doSignOut() {
    const warn = dirtyCount > 0 ? ` ${dirtyCount} unsynced change(s) on this device will be lost.` : ''
    if (window.confirm(`Sign out?${warn}`)) await signOut()
  }

  return (
    <main className="screen">
      <h1>Profile</h1>
      <span className="label">Goal: build muscle + strength</span>

      <section className="stack">
        <h2>Experience</h2>
        {EXPERIENCES.map((e) => (
          <button key={e.id} className="choice" aria-pressed={draft.experience === e.id} onClick={() => edit({ experience: e.id })}>
            <span className="stack" style={{ gap: 4 }}>
              <strong>{e.title}</strong>
              <span className="muted">{e.body}</span>
            </span>
          </button>
        ))}
      </section>

      <section className="stack">
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

      <label className="stack">
        <span className="label">Pet name</span>
        <input type="text" maxLength={20} value={draft.petName} onChange={(e) => edit({ petName: e.target.value })} />
      </label>

      <button className="btn btn-primary btn-block" onClick={() => void save()}>Save changes</button>
      {saved && <p role="status">Saved ✓</p>}

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

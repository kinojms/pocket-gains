import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { useAppData } from '../data/AppData'
import { MeadowScene } from '../ui/MeadowScene'
import { Pet } from '../ui/Pet'

export function LoginScreen() {
  const { mode, signedIn, signIn } = useAppData()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (mode === 'local' || signedIn) return <Navigate to="/" replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    const err = await signIn(email, password)
    setBusy(false)
    if (err) setError(err)
    else navigate('/', { replace: true })
  }

  return (
    <main className="screen full">
      <MeadowScene height={230}>
        <div className="meadow-pet">
          <div className="bubble">Hi! Sign in so I can remember all our progress.</div>
          <Pet size={110} />
        </div>
      </MeadowScene>
      <h1 className="center-text">Pocket Gains</h1>
      <form className="panel stack" onSubmit={submit}>
        <label className="stack">
          <span className="label">Email</span>
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="stack">
          <span className="label">Password</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </main>
  )
}

import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { useAppData } from '../data/AppData'

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
    <form className="screen full" onSubmit={submit}>
      <h1>Pocket Gains</h1>
      <p className="muted">Sign in to sync your training.</p>
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
  )
}

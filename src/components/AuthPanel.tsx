import { useState } from 'react'
import { useAuth } from '../lib/auth'

/** Inline login/signup card. Renders nothing (returns null) once the user is signed in. */
export default function AuthPanel({ onDone }: { onDone?: () => void }) {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true); setError(''); setInfo('')
    const err = mode === 'signin' ? await signIn(email, password) : await signUp(email, password)
    setBusy(false)
    if (err) { setError(err); return }
    setInfo('')
    onDone?.()
  }

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3">
      <div className="mb-3 flex gap-1 rounded-lg bg-black/30 p-1">
        <button
          className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium ${mode === 'signin' ? 'bg-cyan-glow/20 text-cyan-glow' : 'text-slate-400'}`}
          onClick={() => setMode('signin')}
        >
          Sign in
        </button>
        <button
          className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium ${mode === 'signup' ? 'bg-cyan-glow/20 text-cyan-glow' : 'text-slate-400'}`}
          onClick={() => setMode('signup')}
        >
          Sign up
        </button>
      </div>
      <input
        value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (e.g. you@gmail.com)"
        className="mb-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
      />
      <input
        value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password"
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        className="mb-3 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
      />
      {error && <div className="mb-2 rounded bg-red-500/10 px-2 py-1 text-xs text-red-300">{error}</div>}
      {info && <div className="mb-2 rounded bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">{info}</div>}
      <button
        disabled={busy || !email || !password} onClick={submit}
        className="w-full rounded-lg bg-cyan-glow text-black py-2 text-sm font-medium disabled:opacity-50"
      >
        {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
      </button>
    </div>
  )
}

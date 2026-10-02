import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiGet, apiPost, isApiReady, setToken } from './api'

export interface Profile { id: string; email: string; isAdmin: boolean }

interface AuthState {
  user: Profile | null
  profile: Profile | null // same object as user here; kept for naming parity with the rest of the app
  loading: boolean
  apiReady: boolean
  signUp: (email: string, password: string) => Promise<string | null>
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [apiReady, setApiReady] = useState(true)

  useEffect(() => {
    isApiReady().then(async (ready) => {
      setApiReady(ready)
      if (!ready) { setLoading(false); return }
      const { data } = await apiGet<{ user: Profile }>('auth/me')
      setUser(data?.user ?? null)
      setLoading(false)
    })
  }, [])

  const signUp = async (email: string, password: string) => {
    const { data, error } = await apiPost<{ token: string; user: Profile }>('auth/signup', { email, password })
    if (error || !data) return error || 'Sign up failed.'
    setToken(data.token)
    setUser(data.user)
    return null
  }
  const signIn = async (email: string, password: string) => {
    const { data, error } = await apiPost<{ token: string; user: Profile }>('auth/login', { email, password })
    if (error || !data) return error || 'Sign in failed.'
    setToken(data.token)
    setUser(data.user)
    return null
  }
  const signOut = () => { setToken(null); setUser(null) }

  return (
    <AuthContext.Provider value={{ user, profile: user, loading, apiReady, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

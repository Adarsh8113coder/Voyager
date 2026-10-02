const TOKEN_KEY = 'tg_token'

export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } }
export const setToken = (t: string | null) => {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ }
}

async function request<T>(path: string, init?: RequestInit): Promise<{ data: T | null; error: string | null }> {
  try {
    const token = getToken()
    const res = await fetch(`/api/${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers || {}),
      },
    })
    const body = await res.json().catch(() => null)
    if (!res.ok) return { data: null, error: (body && body.error) || `Request failed (${res.status})` }
    return { data: body as T, error: null }
  } catch (e: any) {
    return { data: null, error: e?.message || 'Network error' }
  }
}

export const apiGet = <T>(path: string) => request<T>(path)
export const apiPost = <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) })
export const apiDelete = <T>(path: string) => request<T>(path, { method: 'DELETE' })

/** Memoized check: is the backend reachable and configured (MONGODB_URI set)? */
let readyPromise: Promise<boolean> | null = null
export function isApiReady(): Promise<boolean> {
  if (!readyPromise) {
    readyPromise = fetch('/api/world')
      .then((r) => r.ok && (r.headers.get('content-type') || '').includes('application/json'))
      .catch(() => false)
  }
  return readyPromise
}

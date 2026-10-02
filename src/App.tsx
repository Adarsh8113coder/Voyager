import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AuthPanel from './components/AuthPanel'
import PackagesPanel from './components/PackagesPanel'
import TravelGlobe from './components/TravelGlobe'
import { createBooking, loadWorld } from './lib/data'
import { useAuth } from './lib/auth'
import type { City, Country } from './types'
import { distanceKm, estimateFlight } from './utils/geo'

const btn = 'rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/15 transition'
const bookBtn = 'w-full rounded-lg bg-cyan-glow text-black py-2 text-sm font-medium hover:brightness-110 disabled:opacity-50'

export default function App() {
  const { user, loading: authLoading, apiReady } = useAuth()
  const [cities, setCities] = useState<City[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [originId, setOriginId] = useState<string | null>(null)
  const [destId, setDestId] = useState<string | null>(null)
  const [visited, setVisited] = useState<Set<string>>(new Set())
  const [showAuth, setShowAuth] = useState(false)
  const [flightBooked, setFlightBooked] = useState(false)
  const [booking, setBooking] = useState(false)
  const [bookError, setBookError] = useState('')

  useEffect(() => {
    let cancelled = false
    loadWorld().then(({ countries, cities }) => {
      if (cancelled) return
      setCountries(countries)
      setCities(cities)
      setVisited(new Set(cities.filter((c) => c.isCapital && ['FR', 'JP', 'US', 'IN'].includes(c.countryCode)).map((c) => c.id)))
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const countryByCode = useMemo(() => new Map(countries.map((c) => [c.code, c])), [countries])
  const cityById = useMemo(() => new Map(cities.map((c) => [c.id, c])), [cities])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return cities
      .filter((c) => c.name.toLowerCase().includes(q) || countryByCode.get(c.countryCode)?.name.toLowerCase().includes(q))
      .slice(0, 8)
  }, [query, cities, countryByCode])

  const sel = selectedId ? cityById.get(selectedId) : undefined
  const selCountry = sel ? countryByCode.get(sel.countryCode) : undefined
  const origin = originId ? cityById.get(originId) : undefined
  const dest = destId ? cityById.get(destId) : undefined
  const flight = origin && dest ? estimateFlight(distanceKm(origin, dest)) : null

  const toggleVisited = (id: string) =>
    setVisited((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const visitedCountries = new Set([...visited].map((id) => cityById.get(id)?.countryCode).filter(Boolean)).size

  const bookFlight = async () => {
    if (!apiReady) { setBookError('Connect a database to enable bookings — see README.'); return }
    if (!user) { setShowAuth(true); return }
    if (!origin || !dest || !flight) return
    setBooking(true); setBookError('')
    const err = await createBooking(user.id, {
      type: 'flight', title: `${origin.name} → ${dest.name}`, priceUsd: flight.priceUsd,
      cityId: dest.id, details: { km: flight.km, duration: flight.duration, stops: flight.stops },
    })
    setBooking(false)
    if (err) setBookError(err); else setFlightBooked(true)
  }

  useEffect(() => { setFlightBooked(false); setBookError('') }, [originId, destId])

  if (loading || authLoading) {
    return <div className="grid h-full w-full place-items-center text-slate-400 text-sm">Loading globe…</div>
  }

  return (
    <div className="relative h-full w-full">
      <TravelGlobe
        cities={cities} visited={visited} originId={originId} destId={destId}
        selectedId={selectedId} onSelect={setSelectedId}
      />

      <div className="absolute bottom-0 left-0 right-0 z-10 max-h-[50vh] overflow-y-auto rounded-t-2xl border border-white/10 bg-space-900/80 p-4 text-slate-100 shadow-glow backdrop-blur md:bottom-auto md:left-4 md:right-auto md:top-4 md:max-h-[calc(100vh-2rem)] md:w-[360px] md:rounded-2xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="font-display text-xl font-semibold">Travel Globe</h1>
            <p className="mb-3 text-xs text-slate-400">
              {visited.size} cities · {visitedCountries} countries visited · {cities.length.toLocaleString()} cities worldwide
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1 text-[11px]">
            {user ? (
              <span className="text-slate-400 truncate max-w-[120px]" title={user.email ?? ''}>{user.email}</span>
            ) : (
              <button className="text-cyan-glow hover:underline" onClick={() => setShowAuth((s) => !s)}>
                Sign in / Sign up
              </button>
            )}
            <Link to="/admin" className="text-slate-500 hover:text-cyan-glow underline">Admin</Link>
          </div>
        </div>

        {showAuth && !user && <AuthPanel onDone={() => setShowAuth(false)} />}

        {!apiReady && (
          <p className="mb-3 mt-3 rounded bg-white/5 px-2 py-1 text-[11px] text-slate-400">
            Using bundled data. Connect a database in .env to enable accounts & bookings — see /admin.
          </p>
        )}

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a city or country…"
          className="mt-3 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-cyan-glow"
        />
        {results.map((c) => (
          <button
            key={c.id}
            onClick={() => { setSelectedId(c.id); setQuery('') }}
            className="mt-1 block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-white/10"
          >
            {c.name} <span className="text-slate-400">· {countryByCode.get(c.countryCode)?.name}</span>
          </button>
        ))}

        {sel && selCountry && (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="font-display text-lg">{sel.name}</div>
            <div className="text-xs text-slate-400">
              {selCountry.name} · {selCountry.continent}{sel.isCapital ? ' · Capital' : ''}{sel.iata ? ` · ${sel.iata}` : ''}
              {sel.population > 0 && <> · pop. {sel.population.toLocaleString()}</>}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className={btn} onClick={() => setOriginId(sel.id)}>Set origin</button>
              <button className={btn} onClick={() => setDestId(sel.id)}>Set destination</button>
              <button className={btn} onClick={() => toggleVisited(sel.id)}>
                {visited.has(sel.id) ? 'Unmark visited' : 'Mark visited'}
              </button>
            </div>
          </div>
        )}

        {sel && selCountry && <PackagesPanel city={sel} country={selCountry} />}

        {(origin || dest) && (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span><span className="text-emerald-400">●</span> {origin?.name ?? '—'}</span>
              <span className="text-slate-500">→</span>
              <span><span className="text-pink-400">●</span> {dest?.name ?? '—'}</span>
            </div>
            {flight && (
              <>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
                  <div>Distance<br /><b className="text-base text-white">{flight.km.toLocaleString()} km</b></div>
                  <div>Duration<br /><b className="text-base text-white">{flight.duration}</b></div>
                  <div>Est. price<br /><b className="text-base text-white">${flight.priceUsd}</b></div>
                  <div>Stops<br /><b className="text-base text-white">{flight.stops}</b></div>
                  <div className="col-span-2 rounded bg-amber-400/10 px-2 py-1 text-amber-300">Sample / estimated data — not live</div>
                </div>
                {bookError && <div className="mt-2 rounded bg-red-500/10 px-2 py-1 text-xs text-red-300">{bookError}</div>}
                {flightBooked ? (
                  <div className="mt-3 rounded-lg bg-emerald-500/15 py-2 text-center text-sm font-medium text-emerald-300">✓ Flight booked</div>
                ) : (
                  <button className={`${bookBtn} mt-3`} disabled={booking} onClick={bookFlight}>
                    {booking ? 'Booking…' : '✈ Book this flight'}
                  </button>
                )}
              </>
            )}
            <button className={`${btn} mt-2`} onClick={() => { setOriginId(null); setDestId(null) }}>Clear route</button>
          </div>
        )}

        <p className="mt-4 text-[11px] text-slate-500">Drag to rotate · scroll to zoom · click a marker to focus</p>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import type { City, Country } from '../types'
import { createBooking, hotelPackagesForCity, tourPackagesForCity } from '../lib/data'
import type { HotelPackage, TourPackage } from '../utils/packages'
import { useAuth } from '../lib/auth'
import AuthPanel from './AuthPanel'

const tabBtn = (active: boolean) =>
  `flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${
    active ? 'bg-cyan-glow/20 text-cyan-glow' : 'text-slate-400 hover:bg-white/5'
  }`

const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n)

/** "Book now" button for one package card — tracks its own booked/loading/error state. */
function BookNowButton({
  onBook, requireAuth,
}: { onBook: () => Promise<string | null>; requireAuth: () => boolean }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')

  const click = async () => {
    if (!requireAuth()) return
    setState('busy'); setError('')
    const err = await onBook()
    if (err) { setError(err); setState('error') } else { setState('done') }
  }

  if (state === 'done') {
    return <div className="mt-2 rounded-lg bg-emerald-500/15 py-1.5 text-center text-xs font-medium text-emerald-300">✓ Booked</div>
  }
  return (
    <div className="mt-2">
      <button
        onClick={click}
        disabled={state === 'busy'}
        className="w-full rounded-lg bg-cyan-glow text-black py-1.5 text-xs font-semibold hover:brightness-110 disabled:opacity-50"
      >
        {state === 'busy' ? 'Booking…' : 'Book now'}
      </button>
      {error && <div className="mt-1 text-[10px] text-red-300">{error}</div>}
    </div>
  )
}

export default function PackagesPanel({ city, country }: { city: City; country: Country }) {
  const { user, apiReady } = useAuth()
  const [tab, setTab] = useState<'hotels' | 'tours'>('hotels')
  const [hotels, setHotels] = useState<HotelPackage[]>([])
  const [tours, setTours] = useState<TourPackage[]>([])
  const [showAuth, setShowAuth] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([hotelPackagesForCity(city), tourPackagesForCity(city, country)]).then(([h, t]) => {
      if (!cancelled) { setHotels(h); setTours(t) }
    })
    return () => { cancelled = true }
  }, [city, country])

  const requireAuth = () => {
    if (!apiReady) return false
    if (!user) { setShowAuth(true); return false }
    return true
  }

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex gap-1 rounded-lg bg-black/30 p-1">
        <button className={tabBtn(tab === 'hotels')} onClick={() => setTab('hotels')}>🏨 Hotel packages</button>
        <button className={tabBtn(tab === 'tours')} onClick={() => setTab('tours')}>🧭 Tourist packages</button>
      </div>

      {!apiReady && (
        <p className="mt-2 rounded bg-white/5 px-2 py-1 text-[10px] text-slate-400">
          Connect a database to enable Book now — see /admin.
        </p>
      )}
      {showAuth && !user && apiReady && <AuthPanel onDone={() => setShowAuth(false)} />}

      {tab === 'hotels' && (
        <div className="mt-3 space-y-2">
          {hotels.map((h) => (
            <div key={h.id} className="rounded-lg border border-white/10 bg-black/20 p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">{h.name}</div>
                  <div className="text-amber-300 text-xs">{stars(h.stars)}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-base font-semibold text-white">${h.totalUsd}</div>
                  <div className="text-[11px] text-slate-400">${h.pricePerNightUsd}/night · {h.nights}n</div>
                </div>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {h.perks.map((p) => (
                  <span key={p} className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-300">{p}</span>
                ))}
              </div>
              <BookNowButton
                requireAuth={requireAuth}
                onBook={() =>
                  createBooking(user!.id, {
                    type: 'hotel', title: `${h.name} — ${city.name}`, priceUsd: h.totalUsd,
                    cityId: city.id, details: { stars: h.stars, nights: h.nights, pricePerNight: h.pricePerNightUsd },
                  })
                }
              />
            </div>
          ))}
        </div>
      )}

      {tab === 'tours' && (
        <div className="mt-3 space-y-2">
          {tours.map((t) => (
            <div key={t.id} className="rounded-lg border border-white/10 bg-black/20 p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-medium">{t.name}</div>
                <div className="text-right shrink-0">
                  <div className="text-base font-semibold text-white">${t.priceUsd}</div>
                  <div className="text-[11px] text-slate-400">{t.days}d · {t.groupSize}</div>
                </div>
              </div>
              <ul className="mt-1.5 space-y-0.5">
                {t.highlights.map((h) => (
                  <li key={h} className="text-[11px] text-slate-300">· {h}</li>
                ))}
              </ul>
              <BookNowButton
                requireAuth={requireAuth}
                onBook={() =>
                  createBooking(user!.id, {
                    type: 'tour', title: t.name, priceUsd: t.priceUsd,
                    cityId: city.id, details: { days: t.days, groupSize: t.groupSize },
                  })
                }
              />
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 rounded bg-amber-400/10 px-2 py-1 text-[11px] text-amber-300">
        Sample / generated packages shown alongside any entries you've added in Admin — not live bookings
      </div>
    </div>
  )
}

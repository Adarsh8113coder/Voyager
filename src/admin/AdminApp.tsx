import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import AuthPanel from '../components/AuthPanel'
import CrudTable, { type Field } from './CrudTable'

const COUNTRY_FIELDS: Field[] = [
  { key: 'code', label: 'Country code (e.g. FR)' },
  { key: 'name', label: 'Name' },
  { key: 'continent', label: 'Continent' },
  { key: 'capital', label: 'Capital' },
]
const CITY_FIELDS: Field[] = [
  { key: 'id', label: 'City ID (e.g. fr-paris)' },
  { key: 'name', label: 'Name' },
  { key: 'countryCode', label: 'Country code (e.g. FR)' },
  { key: 'lat', label: 'Latitude', type: 'number' },
  { key: 'lng', label: 'Longitude', type: 'number' },
  { key: 'population', label: 'Population', type: 'number' },
  { key: 'isCapital', label: 'Is capital', type: 'boolean' },
  { key: 'iata', label: 'Airport IATA code (optional)' },
  { key: 'landmarks', label: 'Landmarks (comma-separated)', type: 'list' },
]
const HOTEL_FIELDS: Field[] = [
  { key: 'id', label: 'ID', readOnly: true },
  { key: 'cityId', label: 'City ID (e.g. fr-paris)' },
  { key: 'name', label: 'Hotel name' },
  { key: 'stars', label: 'Stars (1-5)', type: 'number' },
  { key: 'nights', label: 'Nights', type: 'number' },
  { key: 'pricePerNight', label: 'Price per night (USD)', type: 'number' },
  { key: 'perks', label: 'Perks (comma-separated)', type: 'list' },
]
const TOUR_FIELDS: Field[] = [
  { key: 'id', label: 'ID', readOnly: true },
  { key: 'cityId', label: 'City ID (e.g. fr-paris)' },
  { key: 'name', label: 'Package name' },
  { key: 'days', label: 'Days', type: 'number' },
  { key: 'priceUsd', label: 'Price (USD)', type: 'number' },
  { key: 'groupSize', label: 'Group size' },
  { key: 'highlights', label: 'Highlights (comma-separated)', type: 'list' },
]
const USER_FIELDS: Field[] = [
  { key: 'id', label: 'User ID', readOnly: true },
  { key: 'email', label: 'Email', readOnly: true },
  { key: 'isAdmin', label: 'Admin access', type: 'boolean' },
]
const BOOKING_FIELDS: Field[] = [
  { key: 'id', label: 'Booking ID', readOnly: true },
  { key: 'userEmail', label: 'Booked by', readOnly: true },
  { key: 'type', label: 'Type', readOnly: true },
  { key: 'title', label: 'Title', readOnly: true },
  { key: 'priceUsd', label: 'Price (USD)', readOnly: true },
  { key: 'cityId', label: 'City ID', readOnly: true },
]

const TABS = [
  { id: 'countries', label: 'Countries', resource: 'countries', pk: 'code', fields: COUNTRY_FIELDS, allowAdd: true, allowDelete: true, allowEdit: true },
  { id: 'cities', label: 'Cities', resource: 'cities', pk: 'id', fields: CITY_FIELDS, allowAdd: true, allowDelete: true, allowEdit: true },
  { id: 'hotels', label: 'Hotel packages', resource: 'hotel-packages', pk: 'id', fields: HOTEL_FIELDS, allowAdd: true, allowDelete: true, allowEdit: true },
  { id: 'tours', label: 'Tour packages', resource: 'tour-packages', pk: 'id', fields: TOUR_FIELDS, allowAdd: true, allowDelete: true, allowEdit: true },
  { id: 'users', label: 'Users', resource: 'users', pk: 'id', fields: USER_FIELDS, allowAdd: false, allowDelete: false, allowEdit: true },
  { id: 'bookings', label: 'Bookings', resource: 'bookings', pk: 'id', fields: BOOKING_FIELDS, allowAdd: false, allowDelete: true, allowEdit: false },
] as const

function NotConfigured() {
  return (
    <div className="grid h-full place-items-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-space-900/80 p-5 text-sm text-slate-300">
        <h1 className="font-display text-lg font-semibold mb-2">No database connected</h1>
        <p className="mb-2">
          Set <code className="text-cyan-glow">MONGODB_URI</code> and{' '}
          <code className="text-cyan-glow">JWT_SECRET</code> as environment variables to enable the
          admin panel. Full setup steps are in the README.
        </p>
        <Link to="/" className="text-xs text-slate-500 hover:text-cyan-glow underline">← Back to globe</Link>
      </div>
    </div>
  )
}

function NotAdmin() {
  const { signOut } = useAuth()
  return (
    <div className="grid h-full place-items-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-space-900/80 p-5 text-sm text-slate-300">
        <h1 className="font-display text-lg font-semibold mb-2">You're signed in, but not an admin</h1>
        <p className="mb-3">
          Ask the project owner to grant access, or promote yourself directly in your MongoDB database —
          set <code className="text-cyan-glow">isAdmin: true</code> on your user document in the{' '}
          <code className="text-cyan-glow">users</code> collection. See the README for the exact steps.
        </p>
        <div className="flex gap-3">
          <Link to="/" className="text-xs text-slate-500 hover:text-cyan-glow underline">← Back to globe</Link>
          <button className="text-xs text-red-400 hover:underline" onClick={() => signOut()}>Sign out</button>
        </div>
      </div>
    </div>
  )
}

export default function AdminApp() {
  const { user, profile, loading, apiReady, signOut } = useAuth()
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('cities')

  if (loading) return <div className="grid h-full place-items-center text-slate-400 text-sm">Loading…</div>
  if (!apiReady) return <NotConfigured />
  if (!user) {
    return (
      <div className="grid h-full place-items-center p-4">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-space-900/80 p-5">
          <h1 className="font-display text-lg font-semibold mb-1">Admin login</h1>
          <p className="mb-2 text-xs text-slate-400">
            Sign in with your admin account. (Sign up on the main site first, then grant yourself
            admin access — see README.)
          </p>
          <AuthPanel />
          <Link to="/" className="mt-3 block text-center text-xs text-slate-500 hover:text-cyan-glow underline">
            ← Back to globe
          </Link>
        </div>
      </div>
    )
  }
  if (!profile?.isAdmin) return <NotAdmin />

  const active = TABS.find((t) => t.id === tab)!

  return (
    <div className="h-full w-full overflow-y-auto p-4 text-slate-100">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="font-display text-xl font-semibold">Travel Globe — Admin</h1>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-xs text-slate-500 hover:text-cyan-glow underline">View globe</Link>
            <button className="text-xs text-slate-500 hover:text-red-400 underline" onClick={() => signOut()}>
              Sign out
            </button>
          </div>
        </div>

        <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg bg-black/30 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                tab === t.id ? 'bg-cyan-glow/20 text-cyan-glow' : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <CrudTable
          key={active.id} resource={active.resource} primaryKey={active.pk} fields={active.fields}
          title={active.label} allowAdd={active.allowAdd} allowDelete={active.allowDelete} allowEdit={active.allowEdit}
        />
      </div>
    </div>
  )
}

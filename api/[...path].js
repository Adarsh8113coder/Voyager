import { ObjectId } from 'mongodb'
import { getDb } from './_lib/db.js'
import { getAuth, hashPassword, signToken, verifyPassword } from './_lib/auth.js'

const json = (res, code, body) => { res.status(code).json(body) }
const toId = (id) => { try { return new ObjectId(id) } catch { return null } }
const userOut = (u) => ({ id: String(u._id), email: u.email, isAdmin: !!u.isAdmin, createdAt: u.createdAt })

export default async function handler(req, res) {
  // Derive route segments from the URL itself — req.query.path is an array on some
  // Vercel runtimes and a "a/b" string on others, which made every route fall through to 404.
  const pathname = String(req.url || '').split('?')[0]
  const segments = pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean).map(decodeURIComponent)
  const query = Object.fromEntries(new URL(req.url || '/', 'http://x').searchParams)
  const [resource, id] = segments
  const method = req.method

  let db
  try {
    db = await getDb()
  } catch (e) {
    return json(res, 503, { error: 'Backend not configured: ' + e.message })
  }

  try {
    // ── Auth ────────────────────────────────────────────────────────────
    if (resource === 'auth' && id === 'signup' && method === 'POST') {
      const { email, password } = req.body || {}
      if (!email || !password || password.length < 6) return json(res, 400, { error: 'Email and a password (6+ chars) are required.' })
      const users = db.collection('users')
      if (await users.findOne({ email })) return json(res, 400, { error: 'An account with that email already exists.' })
      const doc = { email, passwordHash: await hashPassword(password), isAdmin: false, createdAt: new Date().toISOString() }
      const { insertedId } = await users.insertOne(doc)
      const user = { ...doc, _id: insertedId }
      return json(res, 200, { token: signToken(user), user: userOut(user) })
    }
    if (resource === 'auth' && id === 'login' && method === 'POST') {
      const { email, password } = req.body || {}
      const user = await db.collection('users').findOne({ email })
      if (!user || !(await verifyPassword(password || '', user.passwordHash))) return json(res, 400, { error: 'Invalid email or password.' })
      return json(res, 200, { token: signToken(user), user: userOut(user) })
    }
    if (resource === 'auth' && id === 'me' && method === 'GET') {
      const auth = getAuth(req)
      if (!auth) return json(res, 401, { error: 'Not signed in.' })
      const user = await db.collection('users').findOne({ _id: toId(auth.userId) })
      if (!user) return json(res, 401, { error: 'Account no longer exists.' })
      return json(res, 200, { user: userOut(user) })
    }

    // ── World data (public) ────────────────────────────────────────────
    if (resource === 'world' && method === 'GET') {
      const countries = await db.collection('countries').find({}).toArray()
      const cities = await db.collection('cities').find({}).toArray()
      return json(res, 200, {
        countries: countries.map((c) => ({ code: c._id, name: c.name, continent: c.continent, capital: c.capital })),
        cities: cities.map((c) => ({
          id: c._id, name: c.name, countryCode: c.countryCode, lat: c.lat, lng: c.lng,
          population: c.population || 0, isCapital: !!c.isCapital, iata: c.iata || null, landmarks: c.landmarks || [],
        })),
      })
    }

    // ── Countries (admin writes, public read, pk = code) ───────────────
    if (resource === 'countries') {
      const col = db.collection('countries')
      if (method === 'GET') {
        const rows = await col.find({}).limit(500).toArray()
        return json(res, 200, rows.map((r) => ({ code: r._id, name: r.name, continent: r.continent, capital: r.capital })))
      }
      const auth = getAuth(req)
      if (!auth?.isAdmin) return json(res, 403, { error: 'Admin access required.' })
      if (method === 'POST') {
        const b = req.body || {}
        await col.updateOne({ _id: b.code }, { $set: { name: b.name, continent: b.continent, capital: b.capital } }, { upsert: true })
        return json(res, 200, { ok: true })
      }
      if (method === 'DELETE' && id) { await col.deleteOne({ _id: id }); return json(res, 200, { ok: true }) }
    }

    // ── Cities (admin writes, public read, pk = id) ─────────────────────
    if (resource === 'cities') {
      const col = db.collection('cities')
      if (method === 'GET') {
        const rows = await col.find({}).limit(500).toArray()
        return json(res, 200, rows.map((r) => ({
          id: r._id, name: r.name, countryCode: r.countryCode, lat: r.lat, lng: r.lng,
          population: r.population || 0, isCapital: !!r.isCapital, iata: r.iata || null, landmarks: r.landmarks || [],
        })))
      }
      const auth = getAuth(req)
      if (!auth?.isAdmin) return json(res, 403, { error: 'Admin access required.' })
      if (method === 'POST') {
        const b = req.body || {}
        await col.updateOne(
          { _id: b.id },
          { $set: { name: b.name, countryCode: b.countryCode, lat: Number(b.lat), lng: Number(b.lng),
            population: Number(b.population) || 0, isCapital: !!b.isCapital, iata: b.iata || null, landmarks: b.landmarks || [] } },
          { upsert: true }
        )
        return json(res, 200, { ok: true })
      }
      if (method === 'DELETE' && id) { await col.deleteOne({ _id: id }); return json(res, 200, { ok: true }) }
    }

    // ── Hotel & tour packages (admin writes, public read, pk = _id ObjectId) ──
    if (resource === 'hotel-packages' || resource === 'tour-packages') {
      const col = db.collection(resource === 'hotel-packages' ? 'hotelPackages' : 'tourPackages')
      if (method === 'GET') {
        const filter = query.cityId ? { cityId: query.cityId } : {}
        const rows = await col.find(filter).limit(500).toArray()
        return json(res, 200, rows.map((r) => ({ ...r, id: String(r._id), _id: undefined })))
      }
      const auth = getAuth(req)
      if (!auth?.isAdmin) return json(res, 403, { error: 'Admin access required.' })
      if (method === 'POST') {
        const b = { ...(req.body || {}) }
        const rowId = b.id; delete b.id
        if (resource === 'hotel-packages') {
          b.stars = Number(b.stars); b.nights = Number(b.nights); b.pricePerNight = Number(b.pricePerNight)
          b.perks = Array.isArray(b.perks) ? b.perks : []
        } else {
          b.days = Number(b.days); b.priceUsd = Number(b.priceUsd)
          b.highlights = Array.isArray(b.highlights) ? b.highlights : []
        }
        if (rowId && toId(rowId)) await col.updateOne({ _id: toId(rowId) }, { $set: b })
        else await col.insertOne(b)
        return json(res, 200, { ok: true })
      }
      if (method === 'DELETE' && id && toId(id)) { await col.deleteOne({ _id: toId(id) }); return json(res, 200, { ok: true }) }
    }

    // ── Users (admin only) ───────────────────────────────────────────────
    if (resource === 'users') {
      const auth = getAuth(req)
      if (!auth?.isAdmin) return json(res, 403, { error: 'Admin access required.' })
      const col = db.collection('users')
      if (method === 'GET') {
        const rows = await col.find({}).limit(500).toArray()
        return json(res, 200, rows.map(userOut))
      }
      if (method === 'POST') {
        const b = req.body || {}
        if (!b.id || !toId(b.id)) return json(res, 400, { error: 'Missing user id.' })
        await col.updateOne({ _id: toId(b.id) }, { $set: { isAdmin: !!b.isAdmin } })
        return json(res, 200, { ok: true })
      }
    }

    // ── Bookings (signed-in users: own; admins: all) ─────────────────────
    if (resource === 'bookings') {
      const auth = getAuth(req)
      if (!auth) return json(res, 401, { error: 'Sign in required.' })
      const col = db.collection('bookings')
      if (method === 'GET') {
        const filter = auth.isAdmin ? {} : { userId: auth.userId }
        const rows = await col.find(filter).sort({ createdAt: -1 }).limit(500).toArray()
        return json(res, 200, rows.map((r) => ({ ...r, id: String(r._id), _id: undefined })))
      }
      if (method === 'POST') {
        const b = req.body || {}
        const doc = {
          userId: auth.userId, userEmail: auth.email, type: b.type, cityId: b.cityId || null,
          title: b.title, priceUsd: Number(b.priceUsd), details: b.details || {}, createdAt: new Date().toISOString(),
        }
        await col.insertOne(doc)
        return json(res, 200, { ok: true })
      }
      if (method === 'DELETE' && id && toId(id)) {
        const filter = auth.isAdmin ? { _id: toId(id) } : { _id: toId(id), userId: auth.userId }
        await col.deleteOne(filter)
        return json(res, 200, { ok: true })
      }
    }

    return json(res, 404, { error: 'Not found' })
  } catch (e) {
    console.error(e)
    return json(res, 500, { error: e.message || 'Server error' })
  }
}

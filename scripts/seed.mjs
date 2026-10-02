// One-time migration: loads src/data/world-data.json + landmarks.json into MongoDB.
// Run locally (never in the browser):
//
//   MONGODB_URI="mongodb+srv://..." node scripts/seed.mjs
//
// Get the connection string from MongoDB Atlas → Connect → Drivers.
import { MongoClient } from 'mongodb'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('Set MONGODB_URI first, e.g.:\n  MONGODB_URI="mongodb+srv://..." node scripts/seed.mjs')
  process.exit(1)
}
const dbName = process.env.MONGODB_DB || 'travel_globe'

const world = JSON.parse(readFileSync(join(__dirname, '../src/data/world-data.json'), 'utf8'))
const landmarks = JSON.parse(readFileSync(join(__dirname, '../src/data/landmarks.json'), 'utf8'))

async function bulkUpsert(col, docs, chunkSize = 1000) {
  for (let i = 0; i < docs.length; i += chunkSize) {
    const chunk = docs.slice(i, i + chunkSize)
    const ops = chunk.map((d) => ({ replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true } }))
    await col.bulkWrite(ops)
    console.log(`${col.collectionName}: ${Math.min(i + chunkSize, docs.length)}/${docs.length}`)
  }
}

async function main() {
  const client = await new MongoClient(uri).connect()
  const db = client.db(dbName)

  const countries = world.countries.map((c) => ({
    _id: c.code, name: c.name, continent: c.continent, capital: c.capital,
  }))
  await bulkUpsert(db.collection('countries'), countries)

  const cities = world.cities.map((r) => ({
    _id: r[0], name: r[1], countryCode: r[2], lat: r[3], lng: r[4],
    population: r[5], isCapital: r[6] === 1, iata: r[7] || null,
    landmarks: landmarks[r[0]] || [],
  }))
  await bulkUpsert(db.collection('cities'), cities)

  await db.collection('cities').createIndex({ countryCode: 1 })
  await db.collection('hotelPackages').createIndex({ cityId: 1 })
  await db.collection('tourPackages').createIndex({ cityId: 1 })
  await db.collection('bookings').createIndex({ userId: 1 })
  await db.collection('users').createIndex({ email: 1 }, { unique: true })

  console.log('Done. Countries:', countries.length, '· Cities:', cities.length)
  await client.close()
}

main().catch((e) => { console.error(e); process.exit(1) })

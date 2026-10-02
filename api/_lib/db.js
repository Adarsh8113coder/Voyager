import { MongoClient } from 'mongodb'

let clientPromise = null

/** Reuses one connection across invocations (serverless-friendly). Throws if MONGODB_URI isn't set. */
export function getDb() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is not set')
  if (!clientPromise) {
    clientPromise = new MongoClient(uri).connect()
  }
  return clientPromise.then((client) => client.db(process.env.MONGODB_DB || 'travel_globe'))
}

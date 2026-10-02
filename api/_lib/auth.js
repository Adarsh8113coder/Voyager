import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

function secret() {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('JWT_SECRET is not set')
  return s
}

export const hashPassword = (pw) => bcrypt.hash(pw, 10)
export const verifyPassword = (pw, hash) => bcrypt.compare(pw, hash)

export function signToken(user) {
  return jwt.sign({ sub: String(user._id), email: user.email, isAdmin: !!user.isAdmin }, secret(), { expiresIn: '30d' })
}

/** Reads + verifies the Bearer token on a request. Returns null if absent/invalid. */
export function getAuth(req) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return null
  try {
    const payload = jwt.verify(token, secret())
    return { userId: payload.sub, email: payload.email, isAdmin: !!payload.isAdmin }
  } catch {
    return null
  }
}

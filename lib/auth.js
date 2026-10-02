import crypto from 'node:crypto'
import { cookies } from 'next/headers'

export const COOKIE = 'sb_admin'
export const MAX_AGE = 8 * 60 * 60 // seconds

const hmac = (s) => crypto.createHmac('sha256', process.env.SESSION_SECRET).update(s).digest('hex')
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest()

// Fails closed: with no ADMIN_PASSWORD / SESSION_SECRET nobody can log in.
export const configured = () => !!process.env.ADMIN_PASSWORD && (process.env.SESSION_SECRET || '').length >= 32

export const passwordOk = (pw) => configured() && crypto.timingSafeEqual(sha(pw), sha(process.env.ADMIN_PASSWORD))

export function makeToken() {
  const exp = String(Date.now() + MAX_AGE * 1000)
  return `${exp}.${hmac(exp)}`
}

export function checkToken(t) {
  if (!configured() || !t) return false
  const [exp, sig] = t.split('.')
  if (!exp || !sig) return false
  const good = Buffer.from(hmac(exp))
  const got = Buffer.from(sig)
  return got.length === good.length && crypto.timingSafeEqual(got, good) && Number(exp) > Date.now()
}

export async function isAdmin() {
  return checkToken((await cookies()).get(COOKIE)?.value)
}

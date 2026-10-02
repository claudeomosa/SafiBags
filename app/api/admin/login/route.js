import { COOKIE, MAX_AGE, makeToken, passwordOk, configured } from '../../../../lib/auth'

const fails = new Map() // ip -> { n, until }. ponytail: in-memory, per-process; use a shared store if you run several instances
const LIMIT = 5
const WINDOW = 15 * 60 * 1000

export async function POST(req) {
  if (!configured()) return Response.json({ error: 'Admin is not configured on the server' }, { status: 503 })
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local'
  const f = fails.get(ip)
  if (f && f.until > Date.now() && f.n >= LIMIT) return Response.json({ error: 'Too many attempts, try again later' }, { status: 429 })

  const { password } = await req.json().catch(() => ({}))
  if (typeof password !== 'string' || !passwordOk(password)) {
    fails.set(ip, { n: f && f.until > Date.now() ? f.n + 1 : 1, until: Date.now() + WINDOW })
    return Response.json({ error: 'Wrong password' }, { status: 401 })
  }
  fails.delete(ip)
  const res = Response.json({ ok: true })
  res.headers.append('Set-Cookie', `${COOKIE}=${makeToken()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${MAX_AGE}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`)
  return res
}

export async function DELETE() {
  const res = Response.json({ ok: true })
  res.headers.append('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`)
  return res
}

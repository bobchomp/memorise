import { createHash } from 'node:crypto'
import { verifyToken } from '@clerk/backend'
import type { Client } from '@libsql/client'
import { nowSec } from './time.js'

export class HttpError extends Error {
  constructor(public status: number, message: string, public extra?: Record<string, unknown>) {
    super(message)
  }
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data, (_k, v) => (typeof v === 'bigint' ? Number(v) : v)), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  })
}

/** Wraps a handler so thrown HttpErrors become JSON responses. */
export function route(fn: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    try {
      return await fn(req)
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message, ...e.extra }, e.status)
      console.error(e)
      return json({ error: 'Server error' }, 500)
    }
  }
}

export async function readJson<T>(req: Request, maxBytes = 300_000): Promise<T> {
  const text = await req.text()
  if (text.length > maxBytes) throw new HttpError(413, 'Request too large')
  try {
    return JSON.parse(text) as T
  } catch {
    throw new HttpError(400, 'Invalid JSON')
  }
}

function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  return (fwd?.split(',')[0] || req.headers.get('x-real-ip') || 'local').trim()
}

/**
 * Fixed-window rate limit per hashed IP. Raw IPs are never stored: the key is
 * hour(23 bits) | action(1 bit) | first 40 bits of sha256(secret + ip + hour).
 */
export async function rateLimit(db: Client, req: Request, action: 0 | 1, perHour: number) {
  const hour = Math.floor(nowSec() / 3600)
  const h = createHash('sha256')
    .update(`${process.env.RATE_LIMIT_SECRET ?? 'dev'}|${clientIp(req)}|${hour}`)
    .digest()
  const hash40 = BigInt(h.readUIntBE(0, 5))
  const key = (BigInt(hour) << 41n) | (BigInt(action) << 40n) | hash40
  const rs = await db.execute({
    sql: 'INSERT INTO rl (k, n) VALUES (?, 1) ON CONFLICT(k) DO UPDATE SET n = n + 1 RETURNING n',
    args: [key],
  })
  if (Number(rs.rows[0].n) > perHour) throw new HttpError(429, 'Too many requests, try again later')
}

/** Returns the internal user id for a signed-in request, or null if anonymous. */
export async function currentUser(db: Client, req: Request, required = false): Promise<bigint | null> {
  const auth = req.headers.get('authorization')
  const secretKey = process.env.CLERK_SECRET_KEY
  if (!auth?.startsWith('Bearer ') || !secretKey) {
    if (required) throw new HttpError(401, 'Sign in required')
    return null
  }
  let sub: string
  try {
    const payload = await verifyToken(auth.slice(7), { secretKey })
    sub = payload.sub
  } catch {
    throw new HttpError(401, 'Invalid session')
  }
  const find = () => db.execute({ sql: 'SELECT id FROM users WHERE ext = ?', args: [sub] })
  let rs = await find()
  if (!rs.rows.length) {
    await db.execute({
      sql: 'INSERT INTO users (ext, created) VALUES (?, ?) ON CONFLICT(ext) DO NOTHING',
      args: [sub, nowSec()],
    })
    rs = await find()
  }
  return rs.rows[0].id as bigint
}

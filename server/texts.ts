import type { Client } from '@libsql/client'
import { LANGUAGES, LIMITS, SPLIT_MODES } from '../shared/languages.js'
import { pack, unpack } from './codec.js'
import { formatId, newSalt, parseId } from './ids.js'
import { HttpError } from './http.js'
import { nowDay, nowSec, toUnixMs } from './time.js'

export interface TextInput {
  title: string
  lang: number
  split: number
  body: string
}

export interface TextDto extends TextInput {
  id: string
  ver: number
  updated: number // unix ms
  canUndo: boolean
}

export function validate(input: unknown): TextInput {
  const t = input as Partial<TextInput>
  const title = typeof t?.title === 'string' ? t.title.trim().slice(0, LIMITS.titleChars) : ''
  const body = typeof t?.body === 'string' ? t.body.replace(/\r\n?/g, '\n').trim() : ''
  const lang = Number(t?.lang)
  const split = Number(t?.split)
  if (!body) throw new HttpError(400, 'Text is empty')
  if (body.length > LIMITS.bodyChars) throw new HttpError(413, `Text is longer than ${LIMITS.bodyChars} characters`)
  if (!LANGUAGES.some((l) => l.id === lang)) throw new HttpError(400, 'Unknown language')
  if (!SPLIT_MODES.some((m) => m.id === split)) throw new HttpError(400, 'Unknown split mode')
  return { title: title || body.split('\n')[0].slice(0, 60), body, lang, split }
}

/** Looks up a row by public id; the salt check is what makes ids unguessable. */
async function findRow(db: Client, publicId: string) {
  const parsed = parseId(publicId)
  if (!parsed) throw new HttpError(404, 'Text not found')
  const rs = await db.execute({
    sql: 'SELECT id, salt, lang, split, title, body, prev IS NOT NULL AS canUndo, ver, updated, seen FROM texts WHERE id = ?',
    args: [parsed.rowid],
  })
  const row = rs.rows[0]
  if (!row || BigInt(row.salt as bigint) !== parsed.salt) throw new HttpError(404, 'Text not found')
  return row
}

function toDto(publicId: string, row: Record<string, unknown>): TextDto {
  return {
    id: publicId,
    title: row.title as string,
    lang: Number(row.lang),
    split: Number(row.split),
    body: unpack(row.body as ArrayBuffer),
    ver: Number(row.ver),
    updated: toUnixMs(Number(row.updated)),
    canUndo: Boolean(Number(row.canUndo)),
  }
}

export async function createText(db: Client, input: TextInput): Promise<TextDto> {
  const salt = newSalt()
  const now = nowSec()
  const rs = await db.execute({
    sql: `INSERT INTO texts (salt, lang, split, title, body, prev, ver, created, updated, seen)
          VALUES (?, ?, ?, ?, ?, NULL, 1, ?, ?, ?) RETURNING id`,
    args: [salt, input.lang, input.split, input.title, pack(input.body), now, now, nowDay()],
  })
  const id = formatId(rs.rows[0].id as bigint, salt)
  return { id, ...input, ver: 1, updated: toUnixMs(now), canUndo: false }
}

export async function getText(db: Client, publicId: string): Promise<TextDto> {
  const row = await findRow(db, publicId)
  // Only touch `seen` once a week, so reads stay reads.
  const today = nowDay()
  if (today - Number(row.seen) >= 7) {
    await db.execute({ sql: 'UPDATE texts SET seen = ? WHERE id = ?', args: [today, row.id] })
  }
  return toDto(publicId, row)
}

/**
 * Anyone with the link may edit. Optimistic concurrency: the client sends the
 * version it edited; a mismatch returns 409 with the current text so nobody
 * silently overwrites someone else. The previous body is kept for one-step undo.
 */
export async function updateText(db: Client, publicId: string, input: TextInput, baseVer: number): Promise<TextDto> {
  const row = await findRow(db, publicId)
  const now = nowSec()
  const rs = await db.execute({
    sql: `UPDATE texts SET prev = body, body = ?, title = ?, lang = ?, split = ?, ver = ver + 1, updated = ?, seen = ?
          WHERE id = ? AND ver = ? RETURNING ver`,
    args: [pack(input.body), input.title, input.lang, input.split, now, nowDay(), row.id, baseVer],
  })
  if (!rs.rows.length) {
    throw new HttpError(409, 'This text was changed by someone else', { current: toDto(publicId, row) })
  }
  return { id: publicId, ...input, ver: Number(rs.rows[0].ver), updated: toUnixMs(now), canUndo: true }
}

/** Swaps body and prev, so undo can itself be undone. Title/lang are kept. */
export async function undoText(db: Client, publicId: string, baseVer: number): Promise<TextDto> {
  const row = await findRow(db, publicId)
  const rs = await db.execute({
    sql: `UPDATE texts SET body = prev, prev = body, ver = ver + 1, updated = ?
          WHERE id = ? AND ver = ? AND prev IS NOT NULL RETURNING id`,
    args: [nowSec(), row.id, baseVer],
  })
  if (!rs.rows.length) throw new HttpError(409, 'Nothing to undo, or the text changed', { current: toDto(publicId, row) })
  return getText(db, publicId)
}

export function rowidOf(publicId: string): bigint {
  const p = parseId(publicId)
  if (!p) throw new HttpError(404, 'Text not found')
  return p.rowid
}

export { findRow }

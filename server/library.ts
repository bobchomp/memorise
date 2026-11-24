import type { Client } from '@libsql/client'
import { LIMITS } from '../shared/languages.js'
import { pack, unpack } from './codec.js'
import { HttpError } from './http.js'
import { formatId } from './ids.js'
import { findRow } from './texts.js'
import { EPOCH, toUnixMs } from './time.js'

export interface LibraryItemIn {
  id: string
  /** Opaque progress object from the client (FSRS cards per chunk, best scores). */
  progress: unknown
  /** Unix ms when the client last changed this progress. */
  updated: number
}

export interface LibraryItemOut {
  id: string
  title: string
  lang: number
  ver: number
  textUpdated: number
  progress: unknown
  updated: number
}

export async function listLibrary(db: Client, user: bigint): Promise<LibraryItemOut[]> {
  const rs = await db.execute({
    sql: `SELECT t.id, t.salt, t.title, t.lang, t.ver, t.updated AS tu, l.progress, l.updated
          FROM library l JOIN texts t ON t.id = l.text WHERE l.user = ?`,
    args: [user],
  })
  return rs.rows.map((r) => ({
    id: formatId(r.id as bigint, r.salt as bigint),
    title: r.title as string,
    lang: Number(r.lang),
    ver: Number(r.ver),
    textUpdated: toUnixMs(Number(r.tu)),
    progress: r.progress ? JSON.parse(unpack(r.progress as ArrayBuffer)) : null,
    updated: toUnixMs(Number(r.updated)),
  }))
}

/** Upserts progress; a stored row only loses to a newer client timestamp. */
export async function saveLibrary(db: Client, user: bigint, items: LibraryItemIn[]) {
  if (!Array.isArray(items) || items.length > 200) throw new HttpError(400, 'Send 1-200 items')
  const count = await db.execute({ sql: 'SELECT count(*) AS n FROM library WHERE user = ?', args: [user] })
  if (Number(count.rows[0].n) + items.length > LIMITS.libraryItems) {
    throw new HttpError(413, 'Library is full')
  }
  const stmts = []
  for (const it of items) {
    const row = await findRow(db, String(it.id))
    const progress = it.progress == null ? null : pack(JSON.stringify(it.progress))
    if (progress && progress.length > LIMITS.progressBytes) throw new HttpError(413, 'Progress too large')
    const updated = Math.floor(Number(it.updated) / 1000) - EPOCH
    stmts.push({
      sql: `INSERT INTO library (user, text, progress, updated) VALUES (?, ?, ?, ?)
            ON CONFLICT(user, text) DO UPDATE SET progress = excluded.progress, updated = excluded.updated
            WHERE excluded.updated > library.updated`,
      args: [user, row.id, progress, updated],
    })
  }
  if (stmts.length) await db.batch(stmts, 'write')
}

export async function removeFromLibrary(db: Client, user: bigint, publicId: string) {
  const row = await findRow(db, publicId)
  await db.execute({ sql: 'DELETE FROM library WHERE user = ? AND text = ?', args: [user, row.id] })
}

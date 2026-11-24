import { createClient, type Client } from '@libsql/client'

/**
 * Schema notes (every byte counts on a free tier):
 * - `texts.id` is SQLite's rowid alias, so there is no separate key index.
 *   The public link is derived from (id, salt), see ids.ts.
 * - `body`/`prev` are Brotli-compressed blobs with a 1-byte codec flag.
 * - `lang` and `split` are tiny integers (1 byte each on disk).
 * - Times use a 2026 epoch (4 bytes); `seen` is a day number (2 bytes).
 * - `library` is WITHOUT ROWID: the (user, text) key *is* the row, so
 *   there is no hidden rowid and no duplicate index for the primary key.
 * - `rl` packs hour + action + hashed IP into a single integer key.
 */
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
     id INTEGER PRIMARY KEY,
     ext TEXT NOT NULL UNIQUE,
     created INTEGER NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS texts (
     id INTEGER PRIMARY KEY,
     salt INTEGER NOT NULL,
     lang INTEGER NOT NULL,
     split INTEGER NOT NULL,
     title TEXT NOT NULL,
     body BLOB NOT NULL,
     prev BLOB,
     ver INTEGER NOT NULL,
     created INTEGER NOT NULL,
     updated INTEGER NOT NULL,
     seen INTEGER NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS library (
     user INTEGER NOT NULL,
     text INTEGER NOT NULL,
     progress BLOB,
     updated INTEGER NOT NULL,
     PRIMARY KEY (user, text)
   ) WITHOUT ROWID`,
  `CREATE INDEX IF NOT EXISTS library_text ON library(text)`,
  `CREATE TABLE IF NOT EXISTS rl (k INTEGER PRIMARY KEY, n INTEGER NOT NULL)`,
]

let client: Client | null = null
let ready: Promise<void> | null = null

export function db(): Client {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL || 'file:local.db',
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
      intMode: 'bigint',
    })
  }
  return client
}

/** Creates tables on first use in each server instance (cheap, idempotent). */
export async function getDb(): Promise<Client> {
  const c = db()
  if (!ready) {
    ready = c.batch(SCHEMA, 'write').then(() => undefined)
    ready.catch(() => (ready = null))
  }
  await ready
  return c
}

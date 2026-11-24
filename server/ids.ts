import { randomBytes } from 'node:crypto'

/**
 * Public text IDs are `base62(rowid) + base62(salt, 10 chars)`.
 *
 * The rowid is SQLite's own integer primary key, so the table needs no extra
 * unique index on a string column. The salt is ~59 random bits stored as a
 * plain INTEGER (8 bytes), which makes links impossible to guess while costing
 * far less than a separate 16+ byte UUID column plus its index.
 */
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const SALT_LEN = 10
const SALT_MAX = 62n ** BigInt(SALT_LEN) // 8.39e17, fits in a signed 64-bit int

function encode(n: bigint, pad = 0): string {
  let s = ''
  do {
    s = ALPHABET[Number(n % 62n)] + s
    n /= 62n
  } while (n > 0n)
  return s.padStart(pad, '0')
}

function decode(s: string): bigint | null {
  let n = 0n
  for (const ch of s) {
    const v = ALPHABET.indexOf(ch)
    if (v < 0) return null
    n = n * 62n + BigInt(v)
  }
  return n
}

export function newSalt(): bigint {
  // Rejection-free: 64 random bits mod SALT_MAX has negligible bias (<5%) for this use.
  return randomBytes(8).readBigUInt64BE() % SALT_MAX
}

export function formatId(rowid: number | bigint, salt: number | bigint): string {
  return encode(BigInt(rowid)) + encode(BigInt(salt), SALT_LEN)
}

export function parseId(id: string): { rowid: bigint; salt: bigint } | null {
  if (id.length <= SALT_LEN || id.length > SALT_LEN + 11) return null
  const rowid = decode(id.slice(0, -SALT_LEN))
  const salt = decode(id.slice(-SALT_LEN))
  if (rowid === null || salt === null || rowid <= 0n) return null
  return { rowid, salt }
}

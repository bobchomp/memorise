/**
 * Timestamps are stored as seconds since 2026-01-01 UTC rather than the Unix
 * epoch. SQLite stores integers in 1/2/3/4/6/8 bytes depending on magnitude,
 * so this keeps every timestamp at 4 bytes until 2094 (Unix seconds would
 * need 6 bytes after 2038). Days are used where coarse precision is enough.
 */
export const EPOCH = 1767225600

export const nowSec = () => Math.floor(Date.now() / 1000) - EPOCH
export const nowDay = () => Math.floor(nowSec() / 86400)
export const toUnixMs = (s: number) => (s + EPOCH) * 1000

import { LIMITS } from '../../shared/languages.js'
import { getDb } from '../../server/db.js'
import { json, route } from '../../server/http.js'
import { nowDay, nowSec } from '../../server/time.js'

/**
 * Daily job (vercel.json "crons"): drops old rate-limit buckets and deletes
 * texts nobody has opened for LIMITS.idleDays that are in no one's library.
 */
export const GET = route(async (req) => {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return json({ error: 'Forbidden' }, 403)
  }
  const db = await getDb()
  const hour = Math.floor(nowSec() / 3600)
  const [rl, texts] = await db.batch(
    [
      { sql: 'DELETE FROM rl WHERE k < ?', args: [BigInt(hour - 1) << 41n] },
      {
        sql: `DELETE FROM texts WHERE seen < ? AND NOT EXISTS (SELECT 1 FROM library WHERE library.text = texts.id)`,
        args: [nowDay() - LIMITS.idleDays],
      },
    ],
    'write',
  )
  return json({ rateLimitRows: rl.rowsAffected, texts: texts.rowsAffected })
})

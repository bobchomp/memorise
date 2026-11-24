import { getDb } from '../server/db.js'
import { currentUser, json, route } from '../server/http.js'

/**
 * DELETE /api/account: erases the signed-in user's library and progress
 * (UK/EU GDPR Art. 17). Shared texts stay, since others may use their links.
 * The Clerk account itself is deleted client-side through Clerk.
 */
export const DELETE = route(async (req) => {
  const db = await getDb()
  const user = (await currentUser(db, req, true))!
  await db.batch(
    [
      { sql: 'DELETE FROM library WHERE user = ?', args: [user] },
      { sql: 'DELETE FROM users WHERE id = ?', args: [user] },
    ],
    'write',
  )
  return json({ ok: true })
})

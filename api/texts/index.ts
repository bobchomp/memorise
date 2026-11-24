import { LIMITS } from '../../shared/languages.js'
import { getDb } from '../../server/db.js'
import { currentUser, json, rateLimit, readJson, route } from '../../server/http.js'
import { saveLibrary } from '../../server/library.js'
import { createText, validate } from '../../server/texts.js'

/** POST /api/texts: create a text. No account needed; returns its shareable id. */
export const POST = route(async (req) => {
  const db = await getDb()
  await rateLimit(db, req, 0, LIMITS.createsPerHour)
  const input = validate(await readJson(req))
  const text = await createText(db, input)
  const user = await currentUser(db, req)
  if (user) await saveLibrary(db, user, [{ id: text.id, progress: null, updated: Date.now() }])
  return json(text, 201)
})

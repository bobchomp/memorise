import { LIMITS } from '../../shared/languages.js'
import { getDb } from '../../server/db.js'
import { HttpError, json, rateLimit, readJson, route } from '../../server/http.js'
import { getText, undoText, updateText, validate } from '../../server/texts.js'

const idFrom = (req: Request) => decodeURIComponent(new URL(req.url).pathname.split('/').pop() ?? '')

/** GET /api/texts/:id */
export const GET = route(async (req) => {
  const db = await getDb()
  return json(await getText(db, idFrom(req)))
})

/** PUT /api/texts/:id  body: { ver, title, lang, split, body } or { ver, undo: true } */
export const PUT = route(async (req) => {
  const db = await getDb()
  await rateLimit(db, req, 1, LIMITS.editsPerHour)
  const data = await readJson<Record<string, unknown>>(req)
  const ver = Number(data.ver)
  if (!Number.isInteger(ver)) throw new HttpError(400, 'Missing version')
  if (data.undo === true) return json(await undoText(db, idFrom(req), ver))
  return json(await updateText(db, idFrom(req), validate(data), ver))
})

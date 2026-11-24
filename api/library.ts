import { getDb } from '../server/db.js'
import { currentUser, json, readJson, route } from '../server/http.js'
import { listLibrary, removeFromLibrary, saveLibrary, type LibraryItemIn } from '../server/library.js'

/** Signed-in users' saved texts and per-text practice progress. */
export const GET = route(async (req) => {
  const db = await getDb()
  const user = (await currentUser(db, req, true))!
  return json({ items: await listLibrary(db, user) })
})

export const PUT = route(async (req) => {
  const db = await getDb()
  const user = (await currentUser(db, req, true))!
  const { items } = await readJson<{ items: LibraryItemIn[] }>(req, 2_000_000)
  await saveLibrary(db, user, items)
  return json({ ok: true })
})

export const DELETE = route(async (req) => {
  const db = await getDb()
  const user = (await currentUser(db, req, true))!
  await removeFromLibrary(db, user, new URL(req.url).searchParams.get('id') ?? '')
  return json({ ok: true })
})

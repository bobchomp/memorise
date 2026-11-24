import { api, ApiError, isSignedIn, type TextDto } from './api'
import { getProgress, local, mergeProgress, type LocalText, type Progress } from './store'

type Input = Pick<TextDto, 'title' | 'lang' | 'split' | 'body'>

const toLocal = (t: TextDto, extra: Partial<LocalText> = {}): LocalText => ({ ...t, opened: Date.now(), ...extra })

/** Creates on the server (no account needed). Falls back to a local draft when offline. */
export async function createText(input: Input): Promise<LocalText> {
  try {
    const t = toLocal(await api.create(input))
    await local.texts.put(t)
    return t
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 0) throw e
    const t: LocalText = {
      id: 'local-' + crypto.randomUUID().slice(0, 8),
      ...input,
      ver: 0,
      updated: Date.now(),
      canUndo: false,
      opened: Date.now(),
      pending: true,
    }
    await local.texts.put(t)
    return t
  }
}

/** Uploads texts written while offline and moves their progress to the new id. */
export async function uploadPending(): Promise<Map<string, string>> {
  const moved = new Map<string, string>()
  for (const t of await local.texts.filter((t) => !!t.pending).toArray()) {
    try {
      const created = await api.create(t)
      const p = await local.progress.get(t.id)
      await local.transaction('rw', local.texts, local.progress, async () => {
        await local.texts.delete(t.id)
        await local.texts.put(toLocal(created, { opened: t.opened }))
        if (p) {
          await local.progress.delete(t.id)
          await local.progress.put({ ...p, textId: created.id, dirty: 1 })
        }
      })
      moved.set(t.id, created.id)
    } catch {
      break
    }
  }
  return moved
}

/** Local copy first (instant, offline), then refresh from the server. */
export async function loadText(id: string, onFresh?: (t: LocalText) => void): Promise<LocalText | null> {
  const cached = await local.texts.get(id)
  if (cached) {
    await local.texts.update(id, { opened: Date.now() })
    if (!cached.pending) refresh(id).then((t) => t && t.ver !== cached.ver && onFresh?.(t))
    return cached
  }
  return refresh(id)
}

async function refresh(id: string): Promise<LocalText | null> {
  try {
    const t = toLocal(await api.get(id))
    await local.texts.put(t)
    return t
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      const cached = await local.texts.get(id)
      if (cached) await local.texts.delete(id)
      return null
    }
    return (await local.texts.get(id)) ?? null
  }
}

export async function saveText(t: LocalText, input: Input): Promise<LocalText> {
  if (t.pending) {
    const next = { ...t, ...input, updated: Date.now() }
    await local.texts.put(next)
    return next
  }
  const saved = toLocal(await api.update(t.id, input, t.ver))
  await local.texts.put(saved)
  return saved
}

export async function undoText(t: LocalText): Promise<LocalText> {
  const saved = toLocal(await api.undo(t.id, t.ver))
  await local.texts.put(saved)
  return saved
}

export async function forgetText(id: string) {
  await local.transaction('rw', local.texts, local.progress, async () => {
    await local.texts.delete(id)
    await local.progress.delete(id)
  })
  if (isSignedIn() && !id.startsWith('local-')) await api.removeFromLibrary(id).catch(() => {})
}

let syncing: Promise<void> | null = null

/** Two-way sync of the signed-in user's library and progress. */
export function syncAccount(): Promise<void> {
  if (!isSignedIn()) return Promise.resolve()
  syncing ??= (async () => {
    await uploadPending()
    const { items } = await api.library()
    const remote = new Map(items.map((i) => [i.id, i]))
    for (const item of items) {
      if (!(await local.texts.get(item.id))) {
        const t = await api.get(item.id).catch(() => null)
        if (t) await local.texts.put(toLocal(t, { opened: item.updated }))
      }
      const theirs = item.progress as Progress | null
      const mine = await getProgress(item.id)
      const merged = mergeProgress(mine, theirs)
      const same = (x: Progress | null, y: Progress | null) =>
        JSON.stringify(x?.cards ?? {}) === JSON.stringify(y?.cards ?? {}) && (x?.sessions ?? 0) === (y?.sessions ?? 0)
      await local.progress.put({ ...merged, dirty: same(merged, theirs) ? 0 : 1 })
      if (!same(merged, mine)) window.dispatchEvent(new Event('memorise:progress'))
    }
    // Claim texts made on this device before signing in, and push changed progress.
    // The merge already happened here, so the push is stamped "now" and wins on the server.
    const push: { id: string; progress: unknown; updated: number }[] = []
    for (const t of await local.texts.toArray()) {
      if (t.pending) continue
      const p = await local.progress.get(t.id)
      if (remote.has(t.id) && !p?.dirty) continue
      let progress: unknown = null
      if (p) {
        const { dirty: _dirty, ...rest } = p
        progress = rest
      }
      push.push({ id: t.id, progress, updated: Date.now() })
    }
    for (let i = 0; i < push.length; i += 200) await api.saveLibrary(push.slice(i, i + 200))
    await local.progress.where('dirty').equals(1).modify({ dirty: 0 })
    window.dispatchEvent(new Event('memorise:texts'))
  })().finally(() => (syncing = null))
  return syncing
}

let timer: ReturnType<typeof setTimeout> | undefined
/** Debounced push after practice. */
export function scheduleSync() {
  clearTimeout(timer)
  timer = setTimeout(() => syncAccount().catch(() => {}), 4000)
}

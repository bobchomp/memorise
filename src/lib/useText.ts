import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { languageById } from '../../shared/languages'
import { chunkText } from './text'
import { local, type LocalText } from './store'
import { loadText } from './texts'

/** Loads a text (cache first, then server) and its chunks + progress, live. */
export function useText(id: string | undefined) {
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading')
  const [updatedElsewhere, setUpdatedElsewhere] = useState(false)
  useEffect(() => {
    if (!id) return
    let alive = true
    setState('loading')
    loadText(id, () => alive && setUpdatedElsewhere(true)).then((t) => alive && setState(t ? 'ready' : 'missing'))
    return () => {
      alive = false
    }
  }, [id])
  const text = useLiveQuery(() => (id ? local.texts.get(id) : undefined), [id]) as LocalText | undefined
  const progress = useLiveQuery(() => (id ? local.progress.get(id) : undefined), [id])
  const chunks = useMemo(() => (text ? chunkText(text.body, text.lang, text.split) : []), [text])
  const lang = text ? languageById(text.lang) : undefined
  return { state: text ? 'ready' : state, text, chunks, progress, lang, updatedElsewhere, clearUpdated: () => setUpdatedElsewhere(false) }
}

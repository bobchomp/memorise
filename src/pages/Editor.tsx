import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LANGUAGES, LIMITS, SPLIT_MODES } from '../../shared/languages'
import { useToast } from '../components/Toast'
import { ApiError } from '../lib/api'
import { chunkText } from '../lib/text'
import { createText, saveText } from '../lib/texts'
import { useText } from '../lib/useText'

export default function Editor() {
  const { id } = useParams()
  const existing = useText(id)
  const nav = useNavigate()
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [lang, setLang] = useState(() => Number(localStorage.getItem('memorise:lastLang') ?? 0))
  const [split, setSplit] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(!id)

  useEffect(() => {
    if (id && existing.text && !loaded) {
      setTitle(existing.text.title)
      setBody(existing.text.body)
      setLang(existing.text.lang)
      setSplit(existing.text.split)
      setLoaded(true)
    }
  }, [id, existing.text, loaded])

  const preview = useMemo(() => chunkText(body, lang, split), [body, lang, split])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      localStorage.setItem('memorise:lastLang', String(lang))
      const input = { title: title.trim() || body.trim().split('\n')[0].slice(0, 60), body, lang, split }
      const t = existing.text ? await saveText(existing.text, input) : await createText(input)
      if (t.pending) toast('Saved on this device. It will upload when you are back online.')
      nav(`/t/${t.id}`, { replace: !!id })
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('Someone else edited this text while you were working. Copy your changes, reload the page and apply them again.')
      } else setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="stack" onSubmit={submit} style={{ maxWidth: 760 }}>
      <h1 style={{ marginTop: 16 }}>{id ? 'Edit text' : 'New text'}</h1>
      {id && <p className="banner small">Anyone with this text's link can edit it. Your practice progress is yours and isn't shared.</p>}
      <label className="field">
        <span>Language of the text</span>
        <div className="seg" role="group" aria-label="Language">
          {LANGUAGES.map((l) => (
            <button type="button" key={l.id} aria-pressed={lang === l.id} onClick={() => setLang(l.id)}>{l.native}</button>
          ))}
        </div>
      </label>
      <label className="field">
        <span>Title <span className="muted">(optional)</span></span>
        <input className="input" value={title} maxLength={LIMITS.titleChars} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Sonnet 18" />
      </label>
      <label className="field">
        <span>Text</span>
        <textarea
          className="input"
          lang={LANGUAGES[lang]?.bcp47}
          value={body}
          maxLength={LIMITS.bodyChars}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Paste or type what you want to learn…"
          required
        />
        <span className="muted small" style={{ fontWeight: 400 }}>{body.length.toLocaleString()} / {LIMITS.bodyChars.toLocaleString()} characters</span>
      </label>
      <label className="field">
        <span>Practise it in</span>
        <div className="seg" role="group" aria-label="Split into">
          {SPLIT_MODES.map((m) => (
            <button type="button" key={m.id} aria-pressed={split === m.id} onClick={() => setSplit(m.id)} title={m.hint}>{m.name}</button>
          ))}
        </div>
        <span className="muted small" style={{ fontWeight: 400, display: 'block', marginTop: 6 }}>
          {SPLIT_MODES[split].hint}. {preview.length} part{preview.length === 1 ? '' : 's'}.
        </span>
      </label>
      {error && <div className="banner error">{error}</div>}
      <div className="row">
        <button type="button" className="btn ghost" onClick={() => nav(-1)}>Cancel</button>
        <span className="spacer" />
        <button className="btn primary" disabled={busy || !body.trim()}>{busy ? 'Saving…' : id ? 'Save changes' : 'Create & get link'}</button>
      </div>
    </form>
  )
}

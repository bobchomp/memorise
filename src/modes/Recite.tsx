import { useEffect, useMemo, useRef, useState } from 'react'
import { flatten, Passage, perChunk } from '../components/Passage'
import { diffWords, type DiffResult } from '../lib/diff'
import { canListen, listen } from '../lib/speech'
import { tokenize } from '../lib/text'
import type { ModeProps } from './types'
import { SelfGrade } from './Flashcards'

/**
 * Say it out loud. Where the browser supports speech recognition for the
 * language it checks you word by word; otherwise you recite, reveal and
 * mark yourself honestly.
 */
export default function Recite({ chunks, lang, bcp47, paragraphs, settings, onDone }: ModeProps) {
  const words = useMemo(() => flatten(chunks), [chunks])
  const [heard, setHeard] = useState('')
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DiffResult | null>(null)
  const [selfMode, setSelfMode] = useState(!canListen())
  const [revealed, setRevealed] = useState(false)
  const stopRef = useRef<() => void>(() => {})
  useEffect(() => () => stopRef.current(), [])

  function start() {
    setHeard('')
    setError(null)
    setListening(true)
    stopRef.current = listen(lang, setHeard, (err) => {
      setListening(false)
      if (err) {
        setError(err)
        if (/language|not supported|not-allowed|service/i.test(err)) setSelfMode(true)
      }
    })
  }

  function check() {
    stopRef.current()
    const typed = tokenize(heard, lang).filter((t) => t.w).map((t) => t.t)
    setResult(diffWords(words.map((w) => w.text), typed, lang))
  }

  if (selfMode) {
    return (
      <div className="stack">
        {error && <div className="banner">{error}. Recite it aloud, then check yourself.</div>}
        {!revealed ? (
          <div className="card center stack">
            <p>Recite the passage aloud from memory: {chunks.length} part{chunks.length > 1 ? 's' : ''}, {words.length} words.</p>
            <button className="btn primary" autoFocus onClick={() => setRevealed(true)}>Reveal the text</button>
          </div>
        ) : (
          <>
            <Passage chunks={chunks} lang={bcp47} paragraphs={paragraphs} />
            <SelfGrade onGrade={(s) => onDone(chunks.map(() => s))} />
          </>
        )}
      </div>
    )
  }

  if (result) {
    const credit = result.results.map((r) => (r === 'exact' ? 1 : r === 'accent' && !settings.strictAccents ? 0.75 : 0))
    return (
      <div className="stack">
        <p className="small muted">Speech recognition isn't perfect, so if a word is marked wrong but you said it right, use “Try again”.</p>
        <Passage
          chunks={chunks}
          lang={bcp47}
          paragraphs={paragraphs}
          word={(w) => {
            const r = result.results[w.i]
            return <span className={`w ${r === 'exact' ? 'ok' : r === 'accent' ? 'near' : r === 'wrong' ? 'bad' : 'miss'}`}>{w.text}</span>
          }}
        />
        <div className="row">
          <button className="btn" onClick={() => { setResult(null); setHeard('') }}>Try again</button>
          <span className="spacer" />
          <button className="btn primary" onClick={() => onDone(perChunk(words, credit, chunks.length))}>Continue</button>
        </div>
      </div>
    )
  }

  return (
    <div className="stack">
      <div className="card center stack">
        <p>Press start and recite the passage ({words.length} words) from memory.</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          {!listening ? (
            <button className="btn primary" onClick={start}>🎙 Start</button>
          ) : (
            <button className="btn primary" onClick={check}>■ Finish & check</button>
          )}
          <button className="btn ghost small" onClick={() => setSelfMode(true)}>Mark myself instead</button>
        </div>
        {listening && <p className="muted small">Listening…</p>}
        {error && <p className="small" style={{ color: 'var(--bad)' }}>{error}</p>}
      </div>
      {heard && <p className="passage muted" lang={bcp47}>{heard}</p>}
      {!listening && heard && <div className="row"><span className="spacer" /><button className="btn primary" onClick={check}>Check</button></div>}
    </div>
  )
}

import { useMemo, useState } from 'react'
import { flatten, Passage, perChunk } from '../components/Passage'
import { diffWords, type DiffResult } from '../lib/diff'
import { tokenize } from '../lib/text'
import type { ModeProps } from './types'

/** Write the whole passage from memory, then see a word-by-word comparison. */
export default function TypeAll({ chunks, lang, bcp47, paragraphs, settings, onDone }: ModeProps) {
  const words = useMemo(() => flatten(chunks), [chunks])
  const [typed, setTyped] = useState('')
  const [result, setResult] = useState<DiffResult | null>(null)

  function check() {
    const typedWords = tokenize(typed, lang).filter((t) => t.w).map((t) => t.t)
    setResult(diffWords(words.map((w) => w.text), typedWords, lang))
  }

  if (result) {
    const credit = result.results.map((r) => (r === 'exact' ? 1 : r === 'accent' ? (settings.strictAccents ? 0 : 0.5) : 0))
    return (
      <div className="stack">
        <p className="small">
          <span className="w ok">green</span> correct · <span className="w near">amber</span> accent slip ·{' '}
          <span className="w bad">red</span> wrong · <span className="w miss">underlined</span> missed
          {result.extra ? ` · ${result.extra} extra word${result.extra > 1 ? 's' : ''}` : ''}
        </p>
        <Passage
          chunks={chunks}
          lang={bcp47}
          paragraphs={paragraphs}
          word={(w) => {
            const r = result.results[w.i]
            const cls = r === 'exact' ? 'ok' : r === 'accent' ? 'near' : r === 'wrong' ? 'bad' : 'miss'
            return <span className={`w ${cls}`} title={r === 'wrong' || r === 'accent' ? `You wrote “${result.typed[w.i]}”` : undefined}>{w.text}</span>
          }}
        />
        <div className="row">
          <button className="btn" onClick={() => setResult(null)}>Edit my answer</button>
          <span className="spacer" />
          <button className="btn primary" onClick={() => onDone(perChunk(words, credit, chunks.length))}>Continue</button>
        </div>
      </div>
    )
  }

  return (
    <div className="stack">
      <p className="muted small">Write it all out from memory. Punctuation and capitals don't matter.</p>
      <textarea
        className="input"
        lang={bcp47}
        autoFocus
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder="Start typing…"
      />
      <div className="row">
        <span className="muted small">{tokenize(typed, lang).filter((t) => t.w).length} / {words.length} words</span>
        <span className="spacer" />
        <button className="btn primary" onClick={check} disabled={!typed.trim()}>Check</button>
      </div>
    </div>
  )
}

import { useMemo, useRef, useState } from 'react'
import { flatten, Passage, perChunk } from '../components/Passage'
import { matchWord, rng, shuffle, type Match } from '../lib/text'
import { Progress } from './session'
import type { ModeProps } from './types'

/**
 * Cloze test: a share of words (favouring longer, content-carrying words) are
 * replaced with blanks to type in.
 */
export default function Blanks({ chunks, lang, bcp47, paragraphs, settings, onDone }: ModeProps) {
  const words = useMemo(() => flatten(chunks), [chunks])
  const [density, setDensity] = useState(0.3)
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9))
  const blanks = useMemo(() => {
    const rand = rng(seed)
    const cands = shuffle(words.filter((w) => w.text.length > 2), rand)
      .sort((a, b) => b.text.length - a.text.length + (rand() - 0.5) * 6)
    const n = Math.max(1, Math.round(words.length * density))
    return new Set((cands.length >= n ? cands : shuffle(words, rand)).slice(0, n).map((w) => w.i))
  }, [words, density, seed])
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [checked, setChecked] = useState<Record<number, Match> | null>(null)
  const inputs = useRef<Map<number, HTMLInputElement>>(new Map())
  const order = [...blanks].sort((a, b) => a - b)

  function check() {
    const res: Record<number, Match> = {}
    for (const i of blanks) res[i] = matchWord(words[i].text, answers[i] ?? '', lang)
    setChecked(res)
  }

  function finish() {
    const scores = words.map((w) => {
      if (!blanks.has(w.i)) return 1
      const r = checked![w.i]
      return r === 'exact' ? 1 : r === 'accent' && !settings.strictAccents ? 0.5 : 0
    })
    // Only blanked words were tested, so average over those per chunk.
    const tested = words.filter((w) => blanks.has(w.i))
    onDone(perChunk(tested, tested.map((w) => scores[w.i]), chunks.length))
  }

  return (
    <div className="stack">
      <Progress done={[...blanks].filter((i) => (answers[i] ?? '').trim()).length} total={blanks.size} label={`${[...blanks].filter((i) => (answers[i] ?? '').trim()).length} of ${blanks.size} blanks filled`} />
      {!checked && (
        <div className="row">
          <span className="muted small">Blanks:</span>
          <div className="seg" role="group">
            {[0.15, 0.3, 0.5, 0.75].map((d) => (
              <button key={d} aria-pressed={density === d} onClick={() => { setDensity(d); setAnswers({}) }}>{Math.round(d * 100)}%</button>
            ))}
          </div>
          <button className="btn small ghost" onClick={() => { setSeed(seed + 1); setAnswers({}) }}>↻ New blanks</button>
        </div>
      )}
      <Passage
        chunks={chunks}
        lang={bcp47}
        paragraphs={paragraphs}
        word={(w) => {
          if (!blanks.has(w.i)) return <span className="w">{w.text}</span>
          const r = checked?.[w.i]
          if (r === 'exact') return <span className="w ok">{w.text}</span>
          if (r) return <span className={`w ${r === 'accent' ? 'near' : 'bad'}`} title={`You wrote “${answers[w.i] ?? ''}”`}>{w.text}</span>
          return (
            <input
              ref={(el) => { if (el) inputs.current.set(w.i, el); else inputs.current.delete(w.i) }}
              className="blank"
              style={{ ['--len' as string]: w.text.length }}
              lang={bcp47}
              aria-label={`Blank ${order.indexOf(w.i) + 1}`}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              value={answers[w.i] ?? ''}
              onChange={(e) => setAnswers({ ...answers, [w.i]: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || (e.key === ' ' && (answers[w.i] ?? '').length)) {
                  e.preventDefault()
                  const next = order[order.indexOf(w.i) + 1]
                  if (next !== undefined) inputs.current.get(next)?.focus()
                  else check()
                }
              }}
            />
          )
        }}
      />
      <div className="row">
        <span className="spacer" />
        {checked ? (
          <button className="btn primary" onClick={finish}>Continue</button>
        ) : (
          <button className="btn primary" onClick={check}>Check</button>
        )}
      </div>
    </div>
  )
}

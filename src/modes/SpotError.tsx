import { useMemo, useState } from 'react'
import { flatten } from '../components/Passage'
import { baseForm, rng, shuffle } from '../lib/text'
import { Progress } from './session'
import type { ModeProps } from './types'

interface Line {
  chunk: number
  tokens: { t: string; w: boolean; swapped?: string }[]
  hasError: boolean
}

/**
 * One word in most lines has been swapped for another from the same text.
 * Tap the impostor, or say the line is correct. This trains precise recall:
 * near-misses are what usually slip into a performance.
 */
export default function SpotError({ chunks, lang, bcp47, onDone }: ModeProps) {
  const [seed] = useState(() => Math.floor(Math.random() * 1e9))
  const lines = useMemo(() => {
    const rand = rng(seed)
    const pool = [...new Set(flatten(chunks).map((w) => w.text))]
    const out: Line[] = []
    chunks.forEach((c, ci) =>
      c.lines.forEach((l) => {
        const wordIdx = l.map((t, i) => (t.w ? i : -1)).filter((i) => i >= 0)
        const tokens: Line["tokens"] = l.map((t) => ({ ...t }))
        const hasError = wordIdx.length > 1 && rand() < 0.75
        if (hasError) {
          const target = wordIdx[Math.floor(rand() * wordIdx.length)]
          const orig = tokens[target].t
          const inLine = new Set(l.filter((t) => t.w).map((t) => baseForm(t.t, lang)))
          // A plausible impostor: not already in the line, and a similar length.
          const alts = shuffle(pool.filter((p) => !inLine.has(baseForm(p, lang))), rand).sort(
            (a, b) => Math.abs(a.length - orig.length) - Math.abs(b.length - orig.length),
          )
          if (alts.length) {
            tokens[target] = { t: alts[0], w: true, swapped: orig }
          }
        }
        out.push({ chunk: ci, tokens, hasError: tokens.some((t) => t.swapped) })
      }),
    )
    return out
  }, [chunks, lang, seed])

  const [li, setLi] = useState(0)
  const [answer, setAnswer] = useState<{ ok: boolean; tapped?: number } | null>(null)
  const [results, setResults] = useState<number[]>([])
  const line = lines[li]

  function choose(tokenIdx: number | null) {
    if (answer) return
    const ok = tokenIdx === null ? !line.hasError : !!line.tokens[tokenIdx]?.swapped
    setAnswer({ ok, tapped: tokenIdx ?? undefined })
    setResults([...results, ok ? 1 : 0])
  }

  function next() {
    if (li + 1 >= lines.length) {
      const scores = chunks.map((_, ci) => {
        const mine = lines.map((l, i) => ({ l, i })).filter((x) => x.l.chunk === ci)
        return mine.length ? mine.reduce((s, x) => s + results[x.i], 0) / mine.length : 1
      })
      return onDone(scores)
    }
    setLi(li + 1)
    setAnswer(null)
  }

  return (
    <div className="stack">
      <Progress done={li} total={lines.length} label={`Line ${li + 1} of ${lines.length}`} />
      <div className="card passage spot-line" lang={bcp47}>
        {line.tokens.map((t, i) =>
          t.w ? (
            <span
              key={i}
              className={`w tappable${answer && t.swapped ? ' picked-bad' : ''}${answer && answer.tapped === i && !t.swapped ? ' picked-bad' : ''}`}
              onClick={() => choose(i)}
            >
              {answer && t.swapped ? <><s>{t.t}</s> <strong className="w ok">{t.swapped}</strong></> : t.t}
            </span>
          ) : (
            <span key={i}>{t.t}</span>
          ),
        )}
      </div>
      <div className="row">
        {!answer ? (
          <button className="btn" onClick={() => choose(null)}>✓ This line is correct</button>
        ) : (
          <>
            <strong style={{ color: answer.ok ? 'var(--good)' : 'var(--bad)' }}>
              {answer.ok ? 'Right!' : line.hasError ? 'Not quite. The swapped word is shown.' : 'That line was actually correct.'}
            </strong>
            <span className="spacer" />
            <button className="btn primary" autoFocus onClick={next}>Next</button>
          </>
        )}
      </div>
    </div>
  )
}

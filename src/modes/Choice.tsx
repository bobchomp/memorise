import { useMemo, useState } from 'react'
import { flatten, Passage, perChunk } from '../components/Passage'
import { baseForm, rng, shuffle } from '../lib/text'
import { Progress } from './session'
import type { ModeProps } from './types'

/** "What comes next?" Pick the right word from four, moving through the text. */
export default function Choice({ chunks, lang, bcp47, paragraphs, onDone }: ModeProps) {
  const words = useMemo(() => flatten(chunks), [chunks])
  const [seed] = useState(() => Math.floor(Math.random() * 1e9))
  const { questions, options } = useMemo(() => {
    const rand = rng(seed)
    const pool = new Map<string, string>()
    for (const w of words) if (!pool.has(baseForm(w.text, lang))) pool.set(baseForm(w.text, lang), w.text)
    const qs = new Set<number>()
    let sinceLast = 0
    for (const w of words) {
      sinceLast++
      if ((w.text.length > 2 && rand() < 0.45) || sinceLast > 4) {
        qs.add(w.i)
        sinceLast = 0
      }
    }
    const opts = new Map<number, string[]>()
    for (const i of qs) {
      const key = baseForm(words[i].text, lang)
      const others = [...pool.entries()].filter(([k]) => k !== key).map(([, v]) => v)
      others.sort((a, b) => Math.abs(a.length - words[i].text.length) - Math.abs(b.length - words[i].text.length) + (rand() - 0.5) * 4)
      opts.set(i, shuffle([words[i].text, ...others.slice(0, 3)], rand))
    }
    return { questions: [...qs].sort((a, b) => a - b), options: opts }
  }, [words, lang, seed])

  const [q, setQ] = useState(0)
  const [wrong, setWrong] = useState<Set<string>>(new Set())
  const [scores] = useState(() => words.map(() => 1))
  const current = questions[q]
  const revealedUpTo = current ?? words.length

  function pick(opt: string) {
    if (baseForm(opt, lang) === baseForm(words[current].text, lang)) {
      scores[current] = wrong.size === 0 ? 1 : wrong.size === 1 ? 0.4 : 0
      setWrong(new Set())
      if (q + 1 >= questions.length) {
        const tested = questions.map((i) => words[i])
        setQ(q + 1)
        setTimeout(() => onDone(perChunk(tested, questions.map((i) => scores[i]), chunks.length)), 400)
      } else setQ(q + 1)
    } else setWrong(new Set(wrong).add(opt))
  }

  return (
    <div className="stack">
      <Progress done={q} total={questions.length} />
      <Passage
        chunks={chunks}
        lang={bcp47}
        paragraphs={paragraphs}
        word={(w) => {
          if (w.i < revealedUpTo) {
            const tested = options.has(w.i)
            return <span className={`w${tested ? (scores[w.i] === 1 ? ' ok' : scores[w.i] > 0 ? ' near' : ' bad') : ''}`}>{w.text}</span>
          }
          return <span className={`w pending${w.i === current ? ' current' : ''}`}>{w.text}</span>
        }}
      />
      {current !== undefined && (
        <div className="options" lang={bcp47}>
          {options.get(current)!.map((o) => (
            <button key={o} className={`tile${wrong.has(o) ? ' wrong' : ''}`} disabled={wrong.has(o)} onClick={() => pick(o)}>{o}</button>
          ))}
        </div>
      )}
    </div>
  )
}

import { useMemo, useState } from 'react'
import { flatten, Passage } from '../components/Passage'
import { rng, shuffle } from '../lib/text'
import { Progress } from './session'
import type { ModeProps } from './types'

const LEVELS = [0, 0.2, 0.4, 0.6, 0.8, 1]

/**
 * Words disappear a step at a time ("vanishing cues"). Each level hides a
 * superset of the previous one, so you rebuild the same gaps from memory.
 */
export default function Fade({ chunks, bcp47, paragraphs, onDone }: ModeProps) {
  const words = useMemo(() => flatten(chunks), [chunks])
  const order = useMemo(() => shuffle(words.map((w) => w.i), rng(words.length * 7919 + 17)), [words])
  const [level, setLevel] = useState(1)
  const [peek, setPeek] = useState<Set<number>>(new Set())
  const hidden = useMemo(() => new Set(order.slice(0, Math.round(order.length * LEVELS[level]))), [order, level])

  return (
    <div className="stack">
      <Progress done={level} total={LEVELS.length - 1} label={`${Math.round(LEVELS[level] * 100)}% hidden`} />
      <div className="row">
        <span className="muted small">Hidden:</span>
        <div className="seg" role="group" aria-label="Level">
          {LEVELS.map((l, i) => (
            <button key={i} aria-pressed={level === i} onClick={() => { setLevel(i); setPeek(new Set()) }}>
              {Math.round(l * 100)}%
            </button>
          ))}
        </div>
      </div>
      <Passage
        chunks={chunks}
        lang={bcp47}
        paragraphs={paragraphs}
        word={(w) =>
          hidden.has(w.i) && !peek.has(w.i) ? (
            <span className="w hidden" onClick={() => setPeek((p) => new Set(p).add(w.i))} title="Tap to peek">{w.text}</span>
          ) : (
            <span className="w">{w.text}</span>
          )
        }
      />
      <div className="row">
        <span className="muted small">Say it through, then hide more.</span>
        <span className="spacer" />
        {level < LEVELS.length - 1 ? (
          <button className="btn primary" onClick={() => { setLevel(level + 1); setPeek(new Set()) }}>Hide more</button>
        ) : (
          <button className="btn primary" onClick={() => onDone(null)}>Done</button>
        )}
      </div>
    </div>
  )
}

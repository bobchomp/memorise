import { useState } from 'react'
import { Passage } from '../components/Passage'
import { initialOf } from '../lib/text'
import type { ModeProps } from './types'

/**
 * Only the first letter of each word is shown. Reading the full text from
 * these cues is the classic "first-letter" technique used by actors and
 * for scripture memory. Tap a word to peek.
 */
export default function FirstLetters({ chunks, bcp47, paragraphs, onDone }: ModeProps) {
  const [shown, setShown] = useState<Set<number>>(new Set())
  const [all, setAll] = useState(false)
  const toggle = (i: number) =>
    setShown((s) => {
      const n = new Set(s)
      n.has(i) ? n.delete(i) : n.add(i)
      return n
    })
  return (
    <div className="stack">
      <p className="muted small">Say each word in your head from its first letter. Tap a word if you're stuck.</p>
      <Passage
        chunks={chunks}
        lang={bcp47}
        paragraphs={paragraphs}
        word={(w) => {
          if (all || shown.has(w.i)) return <span className="w tappable" onClick={() => toggle(w.i)}>{w.text}</span>
          const cue = initialOf(w.text)
          return (
            <span className="w cue" onClick={() => toggle(w.i)} title="Tap to reveal">
              {cue}
              <span className="rest">{w.text.slice(cue.length).replace(/./gu, ' ')}</span>
            </span>
          )
        }}
      />
      <div className="row">
        <button className="btn" onClick={() => setAll((a) => !a)}>{all ? 'Hide words' : 'Show all'}</button>
        <span className="spacer" />
        <button className="btn primary" onClick={() => onDone(null)}>Done</button>
      </div>
    </div>
  )
}

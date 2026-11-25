import { useState } from 'react'
import { Passage } from '../components/Passage'
import { initialOf } from '../lib/text'
import { Progress } from './session'
import type { ModeProps } from './types'

const GRADES = [
  { label: 'Forgot', score: 0.3, hint: 'Couldn’t recall it' },
  { label: 'Hard', score: 0.75, hint: 'Got there with effort' },
  { label: 'Good', score: 0.92, hint: 'A slip or two' },
  { label: 'Easy', score: 1, hint: 'Word perfect' },
]

export function SelfGrade({ onGrade }: { onGrade: (score: number) => void }) {
  return (
    <div className="stack">
      <p className="center muted small">How did you do?</p>
      <div className="options" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', maxWidth: 640 }}>
        {GRADES.map((g) => (
          <button key={g.label} className="tile center" onClick={() => onGrade(g.score)} title={g.hint}>
            <strong>{g.label}</strong>
            <div className="muted small" style={{ fontFamily: 'var(--font-ui)' }}>{g.hint}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Cue → recall: you see the part before (or the start of the text) and
 * recall the next part, then mark yourself. Learns the links between parts,
 * which is where people get stuck when reciting.
 */
export default function Flashcards({ chunks, bcp47, paragraphs, onDone }: ModeProps) {
  const [i, setI] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [hint, setHint] = useState(false)
  const [scores, setScores] = useState<number[]>([])
  const c = chunks[i]
  const prev = chunks[i - 1]

  function grade(s: number) {
    const next = [...scores, s]
    if (i + 1 >= chunks.length) return onDone(next)
    setScores(next)
    setI(i + 1)
    setRevealed(false)
    setHint(false)
  }

  return (
    <div className="stack">
      <Progress done={i} total={chunks.length} label={`Card ${i + 1} of ${chunks.length}`} />
      <div className="card stack">
        <div className="muted small">{prev ? 'After…' : 'How does it start?'}</div>
        {prev && <div style={{ opacity: 0.7 }}><Passage chunks={[prev]} lang={bcp47} /></div>}
        <hr style={{ border: 0, borderTop: '1px dashed var(--line)', width: '100%' }} />
        {revealed ? (
          <Passage chunks={[c]} lang={bcp47} paragraphs={paragraphs} />
        ) : hint ? (
          <Passage chunks={[c]} lang={bcp47} word={(w) => <span className="w cue">{initialOf(w.text)}</span>} gap={(g) => g.replace(/[^\s\n]/g, '')} />
        ) : (
          <div className="passage muted center">?</div>
        )}
      </div>
      {revealed ? (
        <SelfGrade onGrade={grade} />
      ) : (
        <div className="row">
          {!hint && <button className="btn" onClick={() => setHint(true)}>Hint: first letters</button>}
          <span className="spacer" />
          <button className="btn primary" autoFocus onClick={() => setRevealed(true)}>Show answer</button>
        </div>
      )}
    </div>
  )
}

import { useMemo, useState } from 'react'
import { KeyCatcher } from '../components/KeyCatcher'
import { flatten, Passage, perChunk } from '../components/Passage'
import { initialOf } from '../lib/text'
import type { ModeProps } from './types'
import { useInitialsTyper } from './useInitialsTyper'

/**
 * Type the first letter of every word, from memory. It's fast, works on a
 * phone and forces active recall of every single word, in order.
 */
export default function TypeInitials({ chunks, lang, bcp47, paragraphs, onDone }: ModeProps) {
  const words = useMemo(() => flatten(chunks), [chunks])
  const [cues, setCues] = useState<'none' | 'initials'>('none')
  const t = useInitialsTyper(words, lang, (s) => onDone(perChunk(words, s, chunks.length)))

  return (
    <div className="stack">
      <div className="practice-head">
        <div className="progress" aria-label="Progress"><div style={{ width: `${(t.pos / words.length) * 100}%` }} /></div>
        <span className="small muted">{t.pos}/{words.length}</span>
        <div className="seg" role="group" aria-label="Hints">
          <button aria-pressed={cues === 'none'} onClick={() => setCues('none')}>No hints</button>
          <button aria-pressed={cues === 'initials'} onClick={() => setCues('initials')}>Show initials</button>
        </div>
      </div>
      <Passage
        chunks={chunks}
        lang={bcp47}
        paragraphs={paragraphs}
        word={(w) => {
          const st = t.states[w.i]
          const cur = w.i === t.pos ? ' current' : ''
          if (st === 'pending') {
            return cues === 'initials' ? (
              <span className={`w cue${cur}`}>{initialOf(w.text)}<span className="rest">{w.text.slice(initialOf(w.text).length).replace(/./gu, ' ')}</span></span>
            ) : (
              <span className={`w pending${cur}`}>{w.text}</span>
            )
          }
          return <span className={`w ${st}`}>{w.text}</span>
        }}
      />
      <div className="row">
        <button className="btn small" onClick={t.reveal}>Reveal word</button>
        <span className="muted small">Wrong twice and the word is shown.</span>
      </div>
      <div style={{ height: 80 }} />
      <KeyCatcher onKey={t.press} shake={t.shake} />
    </div>
  )
}

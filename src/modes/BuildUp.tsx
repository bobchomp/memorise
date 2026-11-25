import { useMemo, useState } from 'react'
import { KeyCatcher } from '../components/KeyCatcher'
import { flatten, Passage, perChunk } from '../components/Passage'
import type { Chunk } from '../lib/text'
import { Progress } from './session'
import type { ModeProps } from './types'
import { useInitialsTyper } from './useInitialsTyper'

/**
 * The cumulative ("pyramid") method: learn line 1; then recall 1 → 2; then
 * 1 → 3… Each round you see the new chunk once, then type everything so far
 * from memory. Early chunks get the most retrieval practice.
 */
export default function BuildUp({ chunks, lang, bcp47, paragraphs, onDone }: ModeProps) {
  const [round, setRound] = useState(0) // chunks 0..round are in play
  const [phase, setPhase] = useState<'study' | 'recall'>('study')
  const sofar: Chunk[] = useMemo(() => chunks.slice(0, round + 1), [chunks, round])
  const words = useMemo(() => flatten(sofar), [sofar])

  const t = useInitialsTyper(words, lang, (s) => {
    // The final round covers every chunk, so its scores are the ones graded.
    if (round + 1 >= chunks.length) {
      onDone(perChunk(words, s, sofar.length))
    } else {
      setRound(round + 1)
      setPhase('study')
    }
  })

  return (
    <div className="stack">
      <Progress done={round} total={chunks.length} label={`Round ${round + 1} of ${chunks.length}`} />
      {phase === 'study' ? (
        <>
          <p className="muted small">{round === 0 ? 'Read this, then type it from memory.' : 'New part highlighted. Read it, then type everything from the start.'}</p>
          <Passage chunks={sofar} lang={bcp47} paragraphs={paragraphs} activeChunk={round} />
          <div className="row"><span className="spacer" /><button className="btn primary" autoFocus onClick={() => setPhase('recall')}>I'm ready</button></div>
        </>
      ) : (
        <>
          <p className="muted small">Type the first letter of each word, from the beginning.</p>
          <Passage
            chunks={sofar}
            lang={bcp47}
            paragraphs={paragraphs}
            word={(w) => {
              const st = t.states[w.i]
              const cur = w.i === t.pos ? ' current' : ''
              return <span className={`w ${st}${cur}`}>{w.text}</span>
            }}
          />
          <div className="row"><button className="btn small" onClick={t.reveal}>Reveal word</button></div>
          <KeyCatcher onKey={t.press} shake={t.shake} />
        </>
      )}
    </div>
  )
}

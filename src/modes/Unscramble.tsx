import { useMemo, useState } from 'react'
import { flatten, Passage } from '../components/Passage'
import { baseForm, shuffle } from '../lib/text'
import type { ModeProps } from './types'

interface Segment {
  chunk: number
  words: string[]
}

/** Each line's words are shuffled into tiles: tap them back into order. */
export default function Unscramble({ chunks, lang, bcp47, paragraphs, onDone }: ModeProps) {
  const segments = useMemo(() => {
    const segs: Segment[] = []
    const all = flatten(chunks)
    const byLine = new Map<string, string[]>()
    for (const w of all) {
      const k = `${w.chunk}:${w.line}`
      byLine.set(k, [...(byLine.get(k) ?? []), w.text])
    }
    for (const [k, ws] of byLine) {
      const chunk = Number(k.split(':')[0])
      for (let i = 0; i < ws.length; i += 10) segs.push({ chunk, words: ws.slice(i, i + 10) })
    }
    return segs
  }, [chunks])

  const [seg, setSeg] = useState(0)
  const [placed, setPlaced] = useState(0)
  const [mistakes, setMistakes] = useState<number[]>(() => segments.map(() => 0))
  const [flash, setFlash] = useState<number | null>(null)
  const tiles = useMemo(() => {
    const s = segments[seg]
    let order = shuffle(s.words.map((_, i) => i))
    if (s.words.length > 1 && order.every((v, i) => v === i)) order = order.reverse()
    return order
  }, [segments, seg])
  const [used, setUsed] = useState<Set<number>>(new Set())
  const current = segments[seg]

  function tap(tileIdx: number) {
    const word = current.words[tileIdx]
    if (baseForm(word, lang) === baseForm(current.words[placed], lang)) {
      setUsed(new Set(used).add(tileIdx))
      const next = placed + 1
      if (next >= current.words.length) {
        if (seg + 1 >= segments.length) {
          const scores = chunks.map((_, ci) => {
            const mine = segments.map((s, i) => ({ s, i })).filter((x) => x.s.chunk === ci)
            const total = mine.reduce((n, x) => n + x.s.words.length, 0)
            const miss = mine.reduce((n, x) => n + mistakes[x.i], 0)
            return total ? Math.max(0, 1 - miss / total) : 1
          })
          return onDone(scores)
        }
        setTimeout(() => {
          setSeg(seg + 1)
          setPlaced(0)
          setUsed(new Set())
        }, 300)
      }
      setPlaced(next)
    } else {
      setMistakes((m) => m.map((v, i) => (i === seg ? v + 1 : v)))
      setFlash(tileIdx)
      setTimeout(() => setFlash(null), 300)
    }
  }

  const doneChunks = chunks.slice(0, current.chunk)
  return (
    <div className="stack">
      <div className="practice-head">
        <div className="progress"><div style={{ width: `${(seg / segments.length) * 100}%` }} /></div>
        <span className="small muted">{seg + 1}/{segments.length}</span>
      </div>
      {doneChunks.length > 0 && <div style={{ opacity: 0.55 }}><Passage chunks={doneChunks.slice(-2)} lang={bcp47} paragraphs={paragraphs} /></div>}
      <div className="passage" lang={bcp47} style={{ minHeight: '2em' }}>
        {current.words.slice(0, placed).join(' ')}
        <span className="w current">{' '.repeat(3)}</span>
      </div>
      <div className="tiles" lang={bcp47}>
        {tiles.map((ti) => (
          <button key={`${seg}-${ti}`} className={`tile${used.has(ti) ? ' used' : ''}${flash === ti ? ' wrong' : ''}`} onClick={() => tap(ti)}>
            {current.words[ti]}
          </button>
        ))}
      </div>
    </div>
  )
}

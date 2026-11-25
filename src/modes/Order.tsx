import { useMemo, useState } from 'react'
import { shuffle, type Chunk } from '../lib/text'
import { Progress } from './session'
import type { ModeProps } from './types'

interface Unit {
  chunk: number
  text: string
}

/** Put the lines (or phrases, for a single line) back in the right order. */
export function orderUnits(chunks: Chunk[]): Unit[] {
  if (chunks.length > 1) return chunks.map((c, i) => ({ chunk: i, text: c.text }))
  const c = chunks[0]
  if (c.lines.length > 1) return c.lines.map((l) => ({ chunk: 0, text: l.map((t) => t.t).join('') }))
  // Single line: split into phrases of ~4 words.
  const toks = c.lines[0]
  const units: Unit[] = []
  let cur = ''
  let n = 0
  for (const t of toks) {
    cur += t.t
    if (t.w) n++
    if (n >= 4 && !t.w) {
      units.push({ chunk: 0, text: cur.trim() })
      cur = ''
      n = 0
    }
  }
  if (cur.trim()) units.push({ chunk: 0, text: cur.trim() })
  return units
}

export default function Order({ chunks, bcp47, onDone }: ModeProps) {
  const units = useMemo(() => orderUnits(chunks), [chunks])
  const order = useMemo(() => {
    let o = shuffle(units.map((_, i) => i))
    if (o.every((v, i) => v === i)) o = o.reverse()
    return o
  }, [units])
  const [placed, setPlaced] = useState<number[]>([])
  const [mistakes, setMistakes] = useState<number[]>(() => units.map(() => 0))
  const [flash, setFlash] = useState<number | null>(null)

  function tap(ui: number) {
    const expected = placed.length
    if (units[ui].text === units[expected].text) {
      const next = [...placed, ui]
      setPlaced(next)
      if (next.length === units.length) {
        const scores = chunks.map((_, ci) => {
          const idx = units.map((u, i) => ({ u, i })).filter((x) => x.u.chunk === ci)
          const miss = idx.reduce((n, x) => n + Math.min(mistakes[x.i], 2), 0)
          return idx.length ? Math.max(0, 1 - miss / (idx.length * 2)) : 1
        })
        setTimeout(() => onDone(scores), 400)
      }
    } else {
      setMistakes((m) => m.map((v, i) => (i === expected ? v + 1 : v)))
      setFlash(ui)
      setTimeout(() => setFlash(null), 300)
    }
  }

  return (
    <div className="stack" lang={bcp47}>
      <Progress done={placed.length} total={units.length} />
      <div className="passage">
        {placed.map((i) => <div key={i} className="line">{units[i].text}</div>)}
      </div>
      <div className="stack">
        {order.filter((i) => !placed.includes(i)).map((i) => (
          <button key={i} className={`tile block${flash === i ? ' wrong' : ''}`} onClick={() => tap(i)}>{units[i].text}</button>
        ))}
      </div>
    </div>
  )
}

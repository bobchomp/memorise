import { mastery, type CompactCard } from '../lib/srs'
import type { Chunk } from '../lib/text'

export function MasteryBar({ chunks, cards }: { chunks: Chunk[]; cards?: Record<string, CompactCard> }) {
  if (!chunks.length) return null
  return (
    <div className="mbar" aria-hidden>
      {chunks.map((c) => <span key={c.key} className={`m${mastery(cards?.[c.key])}`} style={{ flex: 1 }} />)}
    </div>
  )
}

export function masteryPercent(chunks: Chunk[], cards?: Record<string, CompactCard>): number {
  if (!chunks.length) return 0
  return Math.round((chunks.reduce((s, c) => s + mastery(cards?.[c.key]), 0) / (chunks.length * 4)) * 100)
}

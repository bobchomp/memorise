import { dueAt, isDue, mastery, type CompactCard } from './srs'
import type { Chunk } from './text'

export type NextStep =
  | { kind: 'review'; keys: string[] }
  | { kind: 'learn'; from: number; to: number; words: number }
  | { kind: 'test' }

const wordsIn = (c: Chunk) => c.lines.flat().filter((t) => t.w).length

/**
 * What to do next with a text:
 * 1. anything due → review it (spacing beats new learning);
 * 2. otherwise learn the next block of parts that aren't yet "familiar",
 *    sized to roughly 25–40 words (a comfortable working-memory load);
 * 3. everything familiar → test the whole text.
 */
export function nextStep(chunks: Chunk[], cards: Record<string, CompactCard> | undefined): NextStep {
  const due = chunks.filter((c) => isDue(cards?.[c.key]))
  if (due.length) return { kind: 'review', keys: due.map((c) => c.key) }
  const start = chunks.findIndex((c) => mastery(cards?.[c.key]) < 2)
  if (start < 0) return { kind: 'test' }
  let end = start
  let words = wordsIn(chunks[start])
  while (end + 1 < chunks.length && end - start < 3 && words < 25 && mastery(cards?.[chunks[end + 1].key]) < 2) {
    end++
    words += wordsIn(chunks[end])
  }
  return { kind: 'learn', from: start, to: end, words }
}

export interface TextStats {
  words: number
  /** Parts per mastery level 0..4. */
  levels: [number, number, number, number, number]
  percent: number
  dueCount: number
  nextDue: Date | null
  /** Rough time to say it aloud at ~140 words per minute. */
  sayMinutes: number
}

export function textStats(chunks: Chunk[], cards: Record<string, CompactCard> | undefined): TextStats {
  const levels: TextStats['levels'] = [0, 0, 0, 0, 0]
  let words = 0
  let dueCount = 0
  let nextDue: Date | null = null
  for (const c of chunks) {
    const card = cards?.[c.key]
    levels[mastery(card)]++
    words += wordsIn(c)
    if (isDue(card)) dueCount++
    else if (card && card[3] > 0) {
      const d = dueAt(card)
      if (!nextDue || d < nextDue) nextDue = d
    }
  }
  const percent = chunks.length
    ? Math.round((levels.reduce((s, n, i) => s + n * i, 0) / (chunks.length * 4)) * 100)
    : 0
  return { words, levels, percent, dueCount, nextDue, sayMinutes: Math.max(1, Math.round(words / 140)) }
}

export function relativeTime(d: Date): string {
  const mins = (d.getTime() - Date.now()) / 60000
  if (mins <= 0) return 'now'
  if (mins < 60) return `in ${Math.round(mins)} min`
  if (mins < 60 * 24) return `in ${Math.round(mins / 60)} h`
  const days = Math.round(mins / 1440)
  if (days < 45) return `in ${days} day${days === 1 ? '' : 's'}`
  return `in ${Math.round(days / 30)} months`
}

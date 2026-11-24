import { createEmptyCard, fsrs, Rating, State, type Card, type Grade } from 'ts-fsrs'

/**
 * FSRS (the scheduler used by Anki since 23.10) decides when each chunk is
 * next due. Cards are stored compactly as number arrays: minutes since
 * 2026-01-01 for dates, 2 d.p. for stability/difficulty. ~30 bytes per chunk.
 */
const EPOCH_MS = Date.UTC(2026, 0, 1)
const scheduler = fsrs({ enable_fuzz: true, request_retention: 0.9 })

export type CompactCard = [
  due: number,
  stability: number,
  difficulty: number,
  reps: number,
  lapses: number,
  state: number,
  last: number,
  learningSteps: number,
  scheduledDays: number,
]

const toMin = (d: Date) => Math.round((d.getTime() - EPOCH_MS) / 60000)
const fromMin = (m: number) => new Date(EPOCH_MS + m * 60000)
const r2 = (x: number) => Math.round(x * 100) / 100

export function pack(c: Card): CompactCard {
  return [
    toMin(c.due),
    r2(c.stability),
    r2(c.difficulty),
    c.reps,
    c.lapses,
    c.state,
    c.last_review ? toMin(c.last_review) : -1,
    c.learning_steps,
    c.scheduled_days,
  ]
}

export function unpack(c: CompactCard | undefined): Card {
  if (!c) return createEmptyCard(new Date())
  return {
    due: fromMin(c[0]),
    stability: c[1],
    difficulty: c[2],
    reps: c[3],
    lapses: c[4],
    state: c[5] as State,
    last_review: c[6] >= 0 ? fromMin(c[6]) : undefined,
    learning_steps: c[7],
    scheduled_days: c[8],
    elapsed_days: 0,
  }
}

/** Accuracy (0..1) from a retrieval exercise → FSRS grade. */
export function gradeFor(score: number): Grade {
  if (score < 0.6) return Rating.Again
  if (score < 0.85) return Rating.Hard
  if (score < 0.97) return Rating.Good
  return Rating.Easy
}

export function review(card: CompactCard | undefined, grade: Grade, now = new Date()): CompactCard {
  // A perfect first attempt right after studying is mostly short-term memory,
  // so a brand-new part can't jump straight to a long "Easy" interval.
  const g = (!card || card[3] === 0) && grade === Rating.Easy ? Rating.Good : grade
  return pack(scheduler.next(unpack(card), now, g).card)
}

export function lastReview(card: CompactCard | undefined): number {
  return card && card[6] >= 0 ? card[6] : -1
}

export function dueAt(card: CompactCard): Date {
  return fromMin(card[0])
}

export function isDue(card: CompactCard | undefined, now = new Date()): boolean {
  return !!card && card[3] > 0 && fromMin(card[0]) <= now
}

/** 0..1 chance you'd recall it right now (FSRS retrievability). */
export function recall(card: CompactCard | undefined, now = new Date()): number {
  if (!card || card[3] === 0) return 0
  return scheduler.get_retrievability(unpack(card), now, false) as number
}

/** Rough mastery label from stability (days until recall drops to 90%). */
export function mastery(card: CompactCard | undefined): 0 | 1 | 2 | 3 | 4 {
  if (!card || card[3] === 0) return 0
  const s = card[1]
  if (s < 1) return 1
  if (s < 7) return 2
  if (s < 30) return 3
  return 4
}

export const MASTERY_LABELS = ['New', 'Learning', 'Familiar', 'Strong', 'Mastered'] as const

export { Rating }

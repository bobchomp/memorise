import Dexie, { type Table } from 'dexie'
import type { CompactCard } from './srs'

/** A text as cached on this device. `id` is the public link id. */
export interface LocalText {
  id: string
  title: string
  lang: number
  split: number
  body: string
  ver: number
  updated: number
  canUndo: boolean
  /** Last time it was opened here (ms), for sorting. */
  opened: number
  /** Created offline and not yet uploaded: id starts with "local-". */
  pending?: boolean
}

export interface Progress {
  textId: string
  /** FSRS card per chunk key. */
  cards: Record<string, CompactCard>
  /** Best score (0..1) per mode id. */
  best: Record<string, number>
  /** Total practice sessions. */
  sessions: number
  /** Last change (ms). */
  updated: number
  /** Needs pushing to the account. */
  dirty: 0 | 1
}

class MemoriseDb extends Dexie {
  texts!: Table<LocalText, string>
  progress!: Table<Progress, string>
  constructor() {
    super('memorise')
    this.version(1).stores({
      texts: 'id, opened',
      progress: 'textId, dirty',
    })
  }
}

export const local = new MemoriseDb()

export async function getProgress(textId: string): Promise<Progress> {
  return (
    (await local.progress.get(textId)) ?? {
      textId,
      cards: {},
      best: {},
      sessions: 0,
      updated: 0,
      dirty: 0,
    }
  )
}

export async function saveProgress(p: Progress) {
  await local.progress.put({ ...p, updated: Date.now(), dirty: 1 })
  window.dispatchEvent(new Event('memorise:progress'))
}

/** Merge two progress records card by card, keeping the most recently reviewed. */
export function mergeProgress(a: Progress, b: Omit<Progress, 'dirty'> | null): Progress {
  if (!b) return a
  const cards = { ...a.cards }
  for (const [k, card] of Object.entries(b.cards ?? {})) {
    const mine = cards[k]
    if (!mine || card[6] > mine[6]) cards[k] = card
  }
  const best = { ...a.best }
  for (const [k, v] of Object.entries(b.best ?? {})) best[k] = Math.max(best[k] ?? 0, v)
  return {
    ...a,
    cards,
    best,
    sessions: Math.max(a.sessions, b.sessions ?? 0),
    updated: Math.max(a.updated, b.updated ?? 0),
  }
}

export interface Settings {
  strictAccents: boolean
  voiceRate: number
  showMastery: boolean
}

const DEFAULT_SETTINGS: Settings = { strictAccents: false, voiceRate: 0.95, showMastery: true }

export function loadSettings(): Settings {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('memorise:settings') ?? '{}') }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem('memorise:settings', JSON.stringify(s))
  } catch {
    /* private mode */
  }
}

import { languageById, type Language } from '../../shared/languages'

export interface Token {
  /** Original text of the token. */
  t: string
  /** True for words; false for spaces/punctuation between them. */
  w: boolean
}

export interface Chunk {
  index: number
  /** Paragraph (blank-line-separated block) the chunk belongs to, for display. */
  para: number
  /** Stable key for progress: survives edits elsewhere in the text. */
  key: string
  text: string
  /** Lines inside the chunk (one line for sentence chunks). */
  lines: Token[][]
}

const L = String.raw`[\p{L}\p{M}\p{N}]`
const wordRe = (lang: Language) =>
  lang.apostropheEdges
    ? // Gaelic: 's, a', t-àite, na h-oidhche, b' fhearr
      new RegExp(String.raw`['’]?${L}+(?:['’-]${L}+)*['’]?`, 'gu')
    : new RegExp(String.raw`${L}+(?:['’-]${L}+)*`, 'gu')

export function tokenize(line: string, langId: number): Token[] {
  const lang = languageById(langId)
  const out: Token[] = []
  let last = 0
  for (const m of line.matchAll(wordRe(lang))) {
    const i = m.index!
    // A Gaelic trailing apostrophe followed directly by a letter is a closing quote, not elision.
    if (i > last) out.push({ t: line.slice(last, i), w: false })
    out.push({ t: m[0], w: true })
    last = i + m[0].length
  }
  if (last < line.length) out.push({ t: line.slice(last), w: false })
  return out
}

function sentences(paragraph: string, lang: Language): string[] {
  const flat = paragraph.replace(/\s*\n\s*/g, ' ')
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const seg = new Intl.Segmenter(lang.bcp47, { granularity: 'sentence' })
    return [...seg.segment(flat)].map((s) => s.segment.trim()).filter(Boolean)
  }
  return flat.match(/[^.!?…]+[.!?…]*["'”’»)]*\s*/g)?.map((s) => s.trim()).filter(Boolean) ?? [flat]
}

/** FNV-1a, base36. Used only as a progress key, not for security. */
export function hash(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

export function chunkText(body: string, langId: number, split: number): Chunk[] {
  const lang = languageById(langId)
  // Each group is the chunk's lines plus the paragraph it came from.
  let groups: { lines: string[]; para: number }[]
  const paras = body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  if (split === 0) {
    groups = paras.flatMap((p, para) =>
      p.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => ({ lines: [l], para })),
    )
  } else if (split === 1) {
    groups = paras.flatMap((p, para) => sentences(p, lang).map((s) => ({ lines: [s], para })))
  } else {
    groups = paras.map((p, para) => ({ lines: p.split('\n').map((l) => l.trim()).filter(Boolean), para }))
  }
  const seen = new Map<string, number>()
  return groups.map(({ lines: g, para }, index) => {
    const text = g.join('\n')
    const base = hash(normalize(text, langId))
    const n = seen.get(base) ?? 0 // repeated lines (choruses) get distinct keys
    seen.set(base, n + 1)
    return { index, para, key: n ? `${base}.${n}` : base, text, lines: g.map((l) => tokenize(l, langId)) }
  })
}

/** Lowercase, unify apostrophes/quotes, ß→ss, strip punctuation. Keeps accents. */
export function normalize(s: string, langId: number): string {
  const lang = languageById(langId)
  return s
    .normalize('NFC')
    .toLocaleLowerCase(lang.bcp47)
    .replace(/[’‘ʼ`´]/g, "'")
    .replace(/ß/g, 'ss')
    .replace(/[^\p{L}\p{M}\p{N}'\s-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Normalised and with all diacritics removed (à→a, ü→u, ñ→n). */
export function baseForm(s: string, langId: number): string {
  return normalize(s, langId).normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC')
}

export type Match = 'exact' | 'accent' | 'wrong'

export function matchWord(expected: string, typed: string, langId: number): Match {
  const a = normalize(expected, langId).replace(/^'|'$/g, '')
  const b = normalize(typed, langId).replace(/^'|'$/g, '')
  if (a === b) return 'exact'
  if (baseForm(a, langId) === baseForm(b, langId)) return 'accent'
  return 'wrong'
}

const ELISION = /^(?:[ldjmnstc]|qu|jusqu|lorsqu|puisqu|b|d|m|t|h|n)['’-]/i

/**
 * The cue letters shown for a word in first-letter mode: "l'homme" → "l'h",
 * "t-sràid" → "t-s", "'s" → "'s", otherwise the first letter.
 */
export function initialOf(word: string): string {
  const el = word.match(ELISION)
  if (el && word.length > el[0].length) return el[0] + firstLetter(word.slice(el[0].length))
  if (/^['’]/.test(word)) return word.slice(0, 2)
  return firstLetter(word)
}

function firstLetter(w: string): string {
  const m = w.match(/^\P{M}\p{M}*/u)
  return m ? m[0] : w.slice(0, 1)
}

/** Letters accepted when typing the first letter of a word. */
export function acceptedKeys(word: string, langId: number): string[] {
  const keys = new Set<string>()
  const add = (s: string) => {
    const ch = s.replace(/^['’-]+/, '')[0]
    if (ch) keys.add(baseForm(ch, langId))
  }
  add(word)
  const el = word.match(ELISION)
  if (el) add(word.slice(el[0].length))
  return [...keys]
}

export function wordCount(chunks: Chunk[]): number {
  return chunks.reduce((n, c) => n + c.lines.flat().filter((t) => t.w).length, 0)
}

/** Deterministic PRNG so "hide 40%" hides the same words each time at a level. */
export function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

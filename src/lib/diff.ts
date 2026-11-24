import { matchWord, type Match } from './text'

export type WordResult = Match | 'missing'

export interface DiffResult {
  /** One entry per expected word. */
  results: WordResult[]
  /** What the user typed in place of each expected word ('' if missing). */
  typed: string[]
  extra: number
  score: number
}

/**
 * Word-level alignment (weighted edit distance) between expected and typed
 * words. Accent-only slips cost less than wrong words, so "ecole" for "école"
 * earns half credit instead of being marked wrong.
 */
export function diffWords(expected: string[], typedWords: string[], langId: number): DiffResult {
  const n = expected.length
  const m = typedWords.length
  const cost = (i: number, j: number) => {
    const r = matchWord(expected[i], typedWords[j], langId)
    return r === 'exact' ? 0 : r === 'accent' ? 0.4 : 1.2
  }
  const d: number[][] = Array.from({ length: n + 1 }, (_, i) => {
    const row = new Array(m + 1).fill(0)
    row[0] = i
    return row
  })
  for (let j = 1; j <= m; j++) d[0][j] = j
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost(i - 1, j - 1))

  const results: WordResult[] = new Array(n).fill('missing')
  const typed: string[] = new Array(n).fill('')
  let extra = 0
  let i = n
  let j = m
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + cost(i - 1, j - 1)) {
      results[i - 1] = matchWord(expected[i - 1], typedWords[j - 1], langId)
      typed[i - 1] = typedWords[j - 1]
      i--
      j--
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
      i--
    } else {
      extra++
      j--
    }
  }
  const credit = results.reduce((s, r) => s + (r === 'exact' ? 1 : r === 'accent' ? 0.5 : 0), 0)
  const score = n ? Math.max(0, (credit - extra * 0.5) / n) : 1
  return { results, typed, extra, score }
}

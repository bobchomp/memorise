import { Fragment, type ReactNode } from 'react'
import type { Chunk } from '../lib/text'

export interface Word {
  /** Index across the whole selection. */
  i: number
  chunk: number
  line: number
  text: string
}

/** All words in the selection, in reading order. */
export function flatten(chunks: Chunk[]): Word[] {
  const out: Word[] = []
  chunks.forEach((c, ci) =>
    c.lines.forEach((line, li) =>
      line.forEach((tok) => {
        if (tok.w) out.push({ i: out.length, chunk: ci, line: li, text: tok.t })
      }),
    ),
  )
  return out
}

/**
 * Averages per-word scores (0..1) into a score per chunk. Chunks with no
 * tested words get `null`, so they're left out of the schedule.
 */
export function perChunk(words: Word[], scores: number[], chunkCount: number): (number | null)[] {
  const sum = new Array(chunkCount).fill(0)
  const n = new Array(chunkCount).fill(0)
  words.forEach((w, k) => {
    sum[w.chunk] += scores[k] ?? 0
    n[w.chunk]++
  })
  return sum.map((s, i) => (n[i] ? s / n[i] : null))
}

interface Props {
  chunks: Chunk[]
  /** Render a word; defaults to plain text. */
  word?: (w: Word) => ReactNode
  /** Render punctuation/space between words; return null to hide. */
  gap?: (text: string, chunk: number) => ReactNode
  activeChunk?: number
  paragraphs?: boolean
  onChunkClick?: (ci: number) => void
  /** BCP 47 tag, for screen readers and hyphenation. */
  lang?: string
}

export function Passage({ chunks, word, gap, activeChunk, paragraphs, onChunkClick, lang }: Props) {
  let k = 0
  return (
    <div className="passage" lang={lang}>
      {chunks.map((c, ci) => (
        <div
          key={c.key}
          className={`chunk${ci === activeChunk ? ' active' : ''}${paragraphs ? ' para' : ''}`}
          onClick={onChunkClick ? () => onChunkClick(ci) : undefined}
        >
          {c.lines.map((line, li) => (
            <span className="line" key={li}>
              {line.map((tok, ti) => {
                if (!tok.w) return <Fragment key={ti}>{gap ? gap(tok.t, ci) : tok.t}</Fragment>
                const w: Word = { i: k++, chunk: ci, line: li, text: tok.t }
                return <Fragment key={ti}>{word ? word(w) : <span className="w">{tok.t}</span>}</Fragment>
              })}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

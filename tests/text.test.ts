import { describe, expect, it } from 'vitest'
import { diffWords } from '../src/lib/diff'
import { gradeFor, review, isDue, mastery } from '../src/lib/srs'
import { acceptedKeys, chunkText, initialOf, matchWord, tokenize } from '../src/lib/text'

const words = (s: string, lang: number) => tokenize(s, lang).filter((t) => t.w).map((t) => t.t)

describe('tokenize', () => {
  it('keeps French elisions and hyphens inside words', () => {
    expect(words("L'homme qu'il a vu, c'est-à-dire…", 1)).toEqual(["L'homme", "qu'il", 'a', 'vu', "c'est-à-dire"])
  })
  it('handles Gaelic apostrophes and prefixes', () => {
    expect(words("Tha a' chlann 's an t-sràid, na h-oidhche", 2)).toEqual(['Tha', "a'", 'chlann', "'s", 'an', 't-sràid', 'na', 'h-oidhche'])
  })
  it('does not glue English quotes onto words', () => {
    expect(words("'Hello,' she said.", 0)).toEqual(['Hello', 'she', 'said'])
  })
  it('handles German and Spanish', () => {
    expect(words('Größe süß', 3)).toEqual(['Größe', 'süß'])
    expect(words('¿Qué tal, señor?', 4)).toEqual(['Qué', 'tal', 'señor'])
  })
})

describe('matching', () => {
  it('grades accents as near misses', () => {
    expect(matchWord('école', 'ecole', 1)).toBe('accent')
    expect(matchWord('sràid', 'sràid', 2)).toBe('exact')
    expect(matchWord('Straße', 'strasse', 3)).toBe('exact')
    expect(matchWord('Qué', 'que', 4)).toBe('accent')
    expect(matchWord('hello', 'yellow', 0)).toBe('wrong')
  })
  it('first-letter cues and keys', () => {
    expect(initialOf("l'homme")).toBe("l'h")
    expect(initialOf('t-sràid')).toBe('t-s')
    expect(initialOf('Àite')).toBe('À')
    expect(acceptedKeys("l'homme", 1).sort()).toEqual(['h', 'l'])
    expect(acceptedKeys('Àite', 2)).toEqual(['a'])
    expect(acceptedKeys("'s", 2)).toEqual(['s'])
  })
})

describe('chunking', () => {
  it('splits by lines, sentences and paragraphs with stable keys', () => {
    const body = 'One two.\nThree four.\n\nFive six. Seven.'
    expect(chunkText(body, 0, 0).map((c) => c.text)).toEqual(['One two.', 'Three four.', 'Five six. Seven.'])
    expect(chunkText(body, 0, 1).map((c) => c.text)).toEqual(['One two.', 'Three four.', 'Five six.', 'Seven.'])
    expect(chunkText(body, 0, 2).length).toBe(2)
    const a = chunkText('A\nB\nC', 0, 0)
    const b = chunkText('A\nX\nB\nC', 0, 0)
    expect(b.find((c) => c.text === 'C')!.key).toBe(a[2].key)
    const chorus = chunkText('La la\nVerse\nLa la', 0, 0)
    expect(new Set(chorus.map((c) => c.key)).size).toBe(3)
  })
})

describe('diff', () => {
  it('aligns missing, extra and accent slips', () => {
    const r = diffWords(['le', 'petit', 'école', 'est', 'là'], ['le', 'ecole', 'est', 'très', 'là'], 1)
    expect(r.results).toEqual(['exact', 'missing', 'accent', 'exact', 'exact'])
    expect(r.extra).toBe(1)
    expect(r.score).toBeCloseTo((3.5 - 0.5) / 5)
  })
})

describe('srs', () => {
  it('schedules and grades', () => {
    expect(gradeFor(0.3)).toBe(1)
    expect(gradeFor(1)).toBe(4)
    const now = new Date()
    const c = review(undefined, gradeFor(1), now)
    expect(c[3]).toBe(1)
    expect(isDue(c, now)).toBe(false)
    expect(isDue(c, new Date(now.getTime() + 60 * 86400000))).toBe(true)
    expect(mastery(c)).toBeGreaterThan(0)
  })
})

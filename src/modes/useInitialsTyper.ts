import { useCallback, useEffect, useRef, useState } from 'react'
import type { Word } from '../components/Passage'
import { acceptedKeys, baseForm } from '../lib/text'

export type WordState = 'pending' | 'ok' | 'near' | 'bad'

/**
 * Typing the first letter of each word from memory. A word scores 1 on the
 * first try, 0.5 on the second, 0 if it had to be revealed.
 */
export function useInitialsTyper(words: Word[], lang: number, onFinish: (scores: number[]) => void) {
  const [pos, setPos] = useState(0)
  const [states, setStates] = useState<WordState[]>(() => words.map(() => 'pending'))
  const [shake, setShake] = useState(0)
  const misses = useRef<number[]>(words.map(() => 0))
  const scores = useRef<number[]>(words.map(() => 0))
  const start = useRef(Date.now())
  const finished = useRef(false)

  useEffect(() => {
    setPos(0)
    setStates(words.map(() => 'pending'))
    misses.current = words.map(() => 0)
    scores.current = words.map(() => 0)
    start.current = Date.now()
    finished.current = false
  }, [words])

  const settle = useCallback(
    (i: number, state: WordState, score: number) => {
      scores.current[i] = score
      setStates((s) => {
        const n = s.slice()
        n[i] = state
        return n
      })
      const next = i + 1
      setPos(next)
      if (next >= words.length && !finished.current) {
        finished.current = true
        setTimeout(() => onFinish(scores.current.slice()), 350)
      }
    },
    [words, onFinish],
  )

  const press = useCallback(
    (key: string) => {
      if (pos >= words.length || !key.trim()) return
      const k = baseForm(key, lang)
      if (!k) return
      const w = words[pos]
      if (acceptedKeys(w.text, lang).includes(k)) {
        settle(pos, misses.current[pos] ? 'near' : 'ok', misses.current[pos] ? 0.5 : 1)
      } else {
        misses.current[pos]++
        setShake((s) => s + 1)
        if (misses.current[pos] >= 2) settle(pos, 'bad', 0)
      }
    },
    [pos, words, lang, settle],
  )

  const reveal = useCallback(() => {
    if (pos < words.length) settle(pos, 'bad', 0)
  }, [pos, words, settle])

  const correct = states.filter((s) => s === 'ok').length
  return { pos, states, press, reveal, shake, correct, elapsed: () => (Date.now() - start.current) / 1000 }
}

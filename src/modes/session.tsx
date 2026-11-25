import { createContext, useContext, useEffect } from 'react'

export interface SessionProgress {
  done: number
  total: number
  /** e.g. "Round 2 of 4"; defaults to "done / total". */
  label?: string
}

export const SessionCtx = createContext<(p: SessionProgress | null) => void>(() => {})

/** Modes render this to report progress to the practice shell's top bar. */
export function Progress({ done, total, label }: SessionProgress) {
  const set = useContext(SessionCtx)
  useEffect(() => {
    set({ done, total, label })
  }, [set, done, total, label])
  useEffect(() => () => set(null), [set])
  return null
}

import { useEffect, useRef } from 'react'

/**
 * A focused input that turns each typed character into `onKey`. Works with
 * mobile keyboards (which don't send reliable keydown events) and with
 * dead keys / IME composition for accented letters.
 */
export function KeyCatcher({ onKey, placeholder, shake }: { onKey: (k: string) => void; placeholder?: string; shake?: number }) {
  const ref = useRef<HTMLInputElement>(null)
  const composing = useRef(false)
  useEffect(() => {
    ref.current?.focus()
  }, [])
  useEffect(() => {
    const el = ref.current
    if (!el || !shake) return
    el.classList.remove('shake')
    void el.offsetWidth
    el.classList.add('shake')
  }, [shake])
  return (
    <input
      ref={ref}
      className="keyinput"
      autoCapitalize="off"
      autoCorrect="off"
      autoComplete="off"
      spellCheck={false}
      enterKeyHint="next"
      aria-label="Type the first letter of the next word"
      placeholder={placeholder ?? 'Type first letters…'}
      onCompositionStart={() => (composing.current = true)}
      onCompositionEnd={(e) => {
        composing.current = false
        const v = e.currentTarget.value
        for (const ch of v) onKey(ch)
        e.currentTarget.value = ''
      }}
      onChange={(e) => {
        if (composing.current) return
        const v = e.target.value
        for (const ch of v) onKey(ch)
        e.target.value = ''
      }}
    />
  )
}

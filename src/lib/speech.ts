import { languageById } from '../../shared/languages'

/** Text-to-speech using the browser's own voices (free, works offline on most devices). */
export function voiceFor(langId: number): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === 'undefined') return null
  const lang = languageById(langId)
  const voices = speechSynthesis.getVoices()
  const prefix = lang.code
  return (
    voices.find((v) => v.lang === lang.bcp47) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(prefix + '-') || v.lang.toLowerCase() === prefix) ??
    null
  )
}

export function canSpeak(langId: number): boolean {
  return voiceFor(langId) !== null
}

/** Voices load asynchronously in Chrome; resolve once they're available. */
export function voicesReady(): Promise<void> {
  if (typeof speechSynthesis === 'undefined') return Promise.resolve()
  if (speechSynthesis.getVoices().length) return Promise.resolve()
  return new Promise((resolve) => {
    const done = () => resolve()
    speechSynthesis.addEventListener('voiceschanged', done, { once: true })
    setTimeout(done, 1500)
  })
}

export function speak(text: string, langId: number, rate = 1, onBoundary?: (charIndex: number) => void): Promise<void> {
  return new Promise((resolve) => {
    const voice = voiceFor(langId)
    if (!voice) return resolve()
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.voice = voice
    u.lang = voice.lang
    u.rate = rate
    u.onboundary = (e) => onBoundary?.(e.charIndex)
    u.onend = () => resolve()
    u.onerror = () => resolve()
    speechSynthesis.speak(u)
  })
}

export function stopSpeaking() {
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
}

type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  onresult: ((e: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}

function RecognitionCtor(): (new () => Recognition) | null {
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => Recognition) | null
}

export const canListen = () => typeof window !== 'undefined' && RecognitionCtor() !== null

/** Starts speech recognition; returns a stop function. */
export function listen(
  langId: number,
  onText: (full: string) => void,
  onEnd: (error?: string) => void,
): () => void {
  const Ctor = RecognitionCtor()
  if (!Ctor) {
    onEnd('Speech recognition is not supported in this browser')
    return () => {}
  }
  const r = new Ctor()
  r.lang = languageById(langId).bcp47
  r.continuous = true
  r.interimResults = true
  let stopped = false
  r.onresult = (e) => {
    let s = ''
    for (let i = 0; i < e.results.length; i++) s += e.results[i][0].transcript + ' '
    onText(s.trim())
  }
  r.onerror = (e) => onEnd(e.error === 'language-not-supported' ? 'Your browser cannot recognise this language' : e.error)
  r.onend = () => {
    if (!stopped) onEnd()
  }
  r.start()
  return () => {
    stopped = true
    r.stop()
    onEnd()
  }
}

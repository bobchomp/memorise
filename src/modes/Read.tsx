import { useEffect, useRef, useState } from 'react'
import { Passage } from '../components/Passage'
import { canSpeak, speak, stopSpeaking, voicesReady } from '../lib/speech'
import type { ModeProps } from './types'

/** Read the text (aloud if a voice exists). Tap a chunk to hear just that part. */
export default function Read({ chunks, lang, bcp47, paragraphs, settings, onDone }: ModeProps) {
  const [voice, setVoice] = useState(false)
  const [playing, setPlaying] = useState<number | null>(null)
  const [rate, setRate] = useState(settings.voiceRate)
  const [loop, setLoop] = useState(false)
  const stop = useRef(false)

  useEffect(() => {
    voicesReady().then(() => setVoice(canSpeak(lang)))
    return () => stopSpeaking()
  }, [lang])

  async function play(from: number, only = false) {
    stop.current = false
    do {
      for (let ci = from; ci < chunks.length; ci++) {
        if (stop.current) return setPlaying(null)
        setPlaying(ci)
        await speak(chunks[ci].text, lang, rate)
        if (only) break
      }
    } while (loop && !only && !stop.current)
    setPlaying(null)
  }

  function halt() {
    stop.current = true
    stopSpeaking()
    setPlaying(null)
  }

  return (
    <div className="stack">
      {voice ? (
        <div className="row">
          {playing === null ? (
            <button className="btn primary" onClick={() => play(0)}>▶ Play all</button>
          ) : (
            <button className="btn primary" onClick={halt}>■ Stop</button>
          )}
          <div className="seg" role="group" aria-label="Speed">
            {[0.7, 0.85, 1, 1.15].map((r) => (
              <button key={r} aria-pressed={rate === r} onClick={() => setRate(r)}>{r}×</button>
            ))}
          </div>
          <label className="row small"><input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} /> Loop</label>
          <span className="muted small">Tap any part to hear it</span>
        </div>
      ) : (
        <p className="muted small">No voice for this language in your browser, so read it aloud to yourself. Hearing your own voice helps it stick.</p>
      )}
      <Passage
        chunks={chunks}
        lang={bcp47}
        paragraphs={paragraphs}
        activeChunk={playing ?? undefined}
        onChunkClick={voice ? (ci) => { halt(); play(ci, true) } : undefined}
      />
      <div className="row">
        <span className="spacer" />
        <button className="btn primary" onClick={() => { halt(); onDone(null) }}>I've read it</button>
      </div>
    </div>
  )
}

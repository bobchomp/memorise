import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowRight, Check, Clock, Lightbulb, RotateCcw, Target, TextQuote, Trophy, X } from 'lucide-react'
import { GUIDED_PATH, modeById, type ModeInfo } from '../modes'
import { SessionCtx, type SessionProgress } from '../modes/session'
import { relativeTime } from '../lib/plan'
import { dueAt, gradeFor, review } from '../lib/srs'
import { getProgress, loadSettings, saveProgress } from '../lib/store'
import { scheduleSync } from '../lib/texts'
import { useText } from '../lib/useText'
import type { Chunk } from '../lib/text'
import { practiceUrl } from './TextPage'

interface Outcome {
  scores: (number | null)[] | null
  next: (Date | null)[]
  seconds: number
  previousBest: number | undefined
}

export default function Practice() {
  const { id = '', mode = '' } = useParams()
  const [q] = useSearchParams()
  const nav = useNavigate()
  const { text, chunks, lang, state } = useText(id)
  const info = modeById(mode)
  const settings = useMemo(loadSettings, [])
  const [run, setRun] = useState(0)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [progress, setProgress] = useState<SessionProgress | null>(null)
  const started = useRef(Date.now())

  const from = Number(q.get('from') ?? 0)
  const to = Number(q.get('to') ?? chunks.length - 1)
  const keysParam = q.get('keys')
  const inPath = q.get('path') === '1'
  const fromReview = q.get('review') === '1'
  const selected: Chunk[] = useMemo(() => {
    const keys = keysParam?.split(',')
    return keys ? chunks.filter((c) => keys.includes(c.key)) : chunks.slice(from, to + 1)
  }, [chunks, from, to, keysParam])
  const backTo = fromReview ? '/review' : `/t/${id}`

  // Fresh timer and progress whenever the exercise (re)starts.
  useEffect(() => {
    started.current = Date.now()
    setProgress(null)
    setOutcome(null)
  }, [mode, run, keysParam, from, to])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !(e.target as HTMLElement)?.closest('input, textarea')) nav(backTo)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nav, backTo])

  const report = useCallback((p: SessionProgress | null) => setProgress(p), [])

  if (state === 'loading' || !text || !lang) return <p className="muted" style={{ marginTop: 32 }}>Loading…</p>
  if (!info) return <p>Unknown exercise. <Link to={`/t/${id}`}>Back</Link></p>
  if (!selected.length) return <p>Nothing selected. <Link to={`/t/${id}`}>Back</Link></p>

  async function done(scores: (number | null)[] | null) {
    const seconds = Math.round((Date.now() - started.current) / 1000)
    const p = await getProgress(id)
    const previousBest = p.best[mode]
    const next: (Date | null)[] = selected.map(() => null)
    if (scores) {
      const now = new Date()
      selected.forEach((c, i) => {
        const s = scores[i]
        if (s === null || s === undefined) return
        const card = review(p.cards[c.key], gradeFor(s), now)
        p.cards[c.key] = card
        next[i] = dueAt(card)
      })
      const avg = mean(scores)
      if (avg !== null) p.best[mode] = Math.max(p.best[mode] ?? 0, Math.round(avg * 100) / 100)
    }
    p.sessions++
    await saveProgress(p)
    scheduleSync()
    setOutcome({ scores, next, seconds, previousBest })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const pathIdx = GUIDED_PATH.indexOf(mode)
  const nextInPath = inPath && pathIdx >= 0 ? GUIDED_PATH[pathIdx + 1] : undefined
  const rangeQs = keysParam ? `?keys=${keysParam}` : `?from=${from}&to=${to}`
  const scope = keysParam
    ? `${selected.length} part${selected.length > 1 ? 's' : ''} to review`
    : selected.length === chunks.length
      ? `All ${chunks.length} parts`
      : `Part${to > from ? 's' : ''} ${from + 1}${to > from ? `–${to + 1}` : ''} of ${chunks.length}`
  const Component = info.Component
  const pct = outcome ? 100 : progress && progress.total ? (progress.done / progress.total) * 100 : 0

  return (
    <div className="session">
      <div className="session-bar">
        <Link to={backTo} className="btn icon-only ghost" aria-label="Stop and go back"><X size={20} aria-hidden /></Link>
        <div className="session-title">
          <span className="session-ico"><info.icon size={18} aria-hidden /></span>
          <span className="session-name">{info.name}</span>
        </div>
        <div className="session-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
          <div style={{ width: `${pct}%` }} />
        </div>
        <span className="session-count small muted">
          {outcome ? 'Done' : progress ? progress.label ?? `${progress.done} / ${progress.total}` : ''}
        </span>
      </div>

      {inPath && pathIdx >= 0 && <PathSteps current={pathIdx} finished={!!outcome} />}

      {!outcome && (
        <div className="session-intro">
          <div className="small muted">
            <Link to={`/t/${id}`} className="session-text">{text.title}</Link> · {scope}
          </div>
          <p className="howto"><Lightbulb size={16} aria-hidden /> {info.howto}</p>
        </div>
      )}

      {outcome ? (
        <Results
          info={info}
          outcome={outcome}
          chunks={selected}
          bcp47={lang.bcp47}
          onAgain={() => setRun(run + 1)}
          backTo={backTo}
          primary={
            nextInPath ? (
              <Link className="btn primary big" autoFocus to={`/t/${id}/practice/${nextInPath}${rangeQs}&path=1`}>
                Next: {modeById(nextInPath)!.name} <ArrowRight size={18} aria-hidden />
              </Link>
            ) : fromReview ? (
              <Link className="btn primary big" to="/review">Continue review <ArrowRight size={18} aria-hidden /></Link>
            ) : !keysParam && to < chunks.length - 1 ? (
              <Link
                className="btn primary big"
                to={practiceUrl(id, inPath ? GUIDED_PATH[0] : mode, to + 1, Math.min(chunks.length - 1, to + 1 + (to - from)), inPath ? '&path=1' : '')}
              >
                {inPath ? 'Learn the next parts' : 'Next parts'} <ArrowRight size={18} aria-hidden />
              </Link>
            ) : (
              <Link className="btn primary big" to={`/t/${id}`}>Done <Check size={18} aria-hidden /></Link>
            )
          }
          nextHint={nextInPath ? modeById(nextInPath)!.blurb : undefined}
        />
      ) : (
        <div className="paper">
          <SessionCtx.Provider value={report}>
            <Suspense fallback={<p className="muted">Loading…</p>}>
              <Component
                key={`${mode}-${run}-${rangeQs}`}
                chunks={selected}
                lang={text.lang}
                bcp47={lang.bcp47}
                paragraphs={text.split === 2}
                settings={settings}
                onDone={done}
              />
            </Suspense>
          </SessionCtx.Provider>
        </div>
      )}
    </div>
  )
}

function PathSteps({ current, finished }: { current: number; finished: boolean }) {
  return (
    <ol className="pathsteps" aria-label="Guided path">
      {GUIDED_PATH.map((mid, i) => {
        const m = modeById(mid)!
        const done = i < current || (i === current && finished)
        return (
          <li key={mid} className={`${done ? 'done' : ''}${i === current ? ' current' : ''}`} aria-current={i === current ? 'step' : undefined}>
            <span className="ps-dot">{done ? <Check size={12} aria-hidden /> : i + 1}</span>
            <span className="ps-name">{m.name}</span>
          </li>
        )
      })}
    </ol>
  )
}

function ScoreRing({ value }: { value: number }) {
  const r = 52
  const c = 2 * Math.PI * r
  const tone = value >= 0.85 ? 'good' : value >= 0.6 ? 'near' : 'bad'
  return (
    <svg className={`score-ring ${tone}`} viewBox="0 0 120 120" width="132" height="132" role="img" aria-label={`${Math.round(value * 100)}%`}>
      <circle cx="60" cy="60" r={r} className="sr-track" />
      <circle cx="60" cy="60" r={r} className="sr-fill" strokeDasharray={c} strokeDashoffset={c * (1 - value)} />
      <text x="60" y="68" textAnchor="middle" className="sr-text">{Math.round(value * 100)}%</text>
    </svg>
  )
}

function Results({ info, outcome, chunks, bcp47, onAgain, backTo, primary, nextHint }: {
  info: ModeInfo; outcome: Outcome; chunks: Chunk[]; bcp47: string; onAgain: () => void; backTo: string
  primary: ReactNode; nextHint?: string
}) {
  const { scores, seconds, previousBest } = outcome
  const avg = scores ? mean(scores) : null
  const tested = scores ? scores.filter((s) => s !== null && s !== undefined).length : 0
  const words = chunks.reduce((n, c) => n + c.lines.flat().filter((t) => t.w).length, 0)
  const newBest = avg !== null && previousBest !== undefined && avg > previousBest + 0.005
  const firstTime = avg !== null && previousBest === undefined
  const verdict =
    avg === null ? 'Nicely done.'
      : avg >= 0.97 ? 'Word perfect!'
        : avg >= 0.85 ? 'Very good.'
          : avg >= 0.6 ? 'Getting there.'
            : 'A tough one. That effort is what makes it stick.'
  const sub =
    avg === null ? "Study steps don't change your review schedule. Test yourself when you feel ready."
      : avg >= 0.85 ? 'Reviews for these parts have been pushed further out.'
        : 'These parts will come back soon, so you can strengthen them.'

  return (
    <div className="paper results">
      <div className="results-hero">
        {avg !== null ? <ScoreRing value={avg} /> : <span className="results-check"><Check size={44} aria-hidden /></span>}
        <div>
          {(newBest || firstTime) && (
            <span className="chip gold"><Trophy size={14} aria-hidden /> {newBest ? 'New best' : 'First score'}</span>
          )}
          <h2 className="results-title">{verdict}</h2>
          <p className="muted" style={{ margin: 0 }}>{sub}</p>
        </div>
      </div>

      <div className="stat-tiles">
        <div className="stat"><Clock size={16} aria-hidden /><strong>{fmtTime(seconds)}</strong><span>time</span></div>
        <div className="stat"><TextQuote size={16} aria-hidden /><strong>{words}</strong><span>words</span></div>
        {avg !== null && <div className="stat"><Target size={16} aria-hidden /><strong>{tested}</strong><span>part{tested === 1 ? '' : 's'} graded</span></div>}
        {previousBest !== undefined && info.kind === 'test' && (
          <div className="stat"><Trophy size={16} aria-hidden /><strong>{Math.round(Math.max(previousBest, avg ?? 0) * 100)}%</strong><span>best</span></div>
        )}
      </div>

      {scores && (
        <ul className="part-results" lang={bcp47}>
          {chunks.map((c, i) => {
            const s = scores[i]
            const tone = s == null ? '' : s >= 0.85 ? 'good' : s >= 0.6 ? 'near' : 'bad'
            return (
              <li key={c.key}>
                <span className="pr-text">{c.text}</span>
                <span className="pr-meta">
                  {s == null ? (
                    <span className="muted small">not tested</span>
                  ) : (
                    <>
                      <span className={`pr-bar ${tone}`}><span style={{ width: `${Math.round(s * 100)}%` }} /></span>
                      <span className={`pr-score ${tone}`}>{Math.round(s * 100)}%</span>
                    </>
                  )}
                  {outcome.next[i] && <span className="chip">next {relativeTime(outcome.next[i]!)}</span>}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      <div className="results-actions">
        <Link to={backTo} className="btn ghost">Back</Link>
        <span className="spacer" />
        <button className="btn" onClick={onAgain}><RotateCcw size={16} aria-hidden /> Try again</button>
        {primary}
      </div>
      {nextHint && <p className="muted small results-next">Up next: {nextHint}</p>}
    </div>
  )
}

function mean(xs: (number | null)[]): number | null {
  const v = xs.filter((x): x is number => x !== null && x !== undefined)
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

function fmtTime(s: number): string {
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`
}

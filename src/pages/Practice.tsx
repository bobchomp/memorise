import { Suspense, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { GUIDED_PATH, modeById } from '../modes'
import { dueAt, gradeFor, review } from '../lib/srs'
import { getProgress, loadSettings, saveProgress } from '../lib/store'
import { scheduleSync } from '../lib/texts'
import { useText } from '../lib/useText'
import type { Chunk } from '../lib/text'
import { practiceUrl } from './TextPage'

interface Outcome {
  scores: (number | null)[] | null
  next: (Date | null)[]
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

  const from = Number(q.get('from') ?? 0)
  const to = Number(q.get('to') ?? chunks.length - 1)
  const keys = q.get('keys')?.split(',')
  const inPath = q.get('path') === '1'
  const fromReview = q.get('review') === '1'
  const selected: Chunk[] = useMemo(
    () => (keys ? chunks.filter((c) => keys.includes(c.key)) : chunks.slice(from, to + 1)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chunks, from, to, q.get('keys')],
  )

  if (state === 'loading' || !text || !lang) return <p className="muted" style={{ marginTop: 32 }}>Loading…</p>
  if (!info) return <p>Unknown mode. <Link to={`/t/${id}`}>Back</Link></p>
  if (!selected.length) return <p>Nothing selected. <Link to={`/t/${id}`}>Back</Link></p>

  async function done(scores: (number | null)[] | null) {
    const p = await getProgress(id)
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
    setOutcome({ scores, next })
  }

  const pathIdx = GUIDED_PATH.indexOf(mode)
  const nextInPath = inPath && pathIdx >= 0 ? GUIDED_PATH[pathIdx + 1] : undefined
  const rangeQs = keys ? `?keys=${keys.join(',')}` : `?from=${from}&to=${to}`
  const Component = info.Component

  return (
    <div>
      <div className="row" style={{ marginTop: 12 }}>
        <Link to={fromReview ? '/review' : `/t/${id}`} className="btn small ghost">← {fromReview ? 'Review' : text.title}</Link>
        <span className="spacer" />
        {inPath && pathIdx >= 0 && <span className="small muted">Step {pathIdx + 1} of {GUIDED_PATH.length}</span>}
      </div>
      <h1 style={{ marginTop: 8 }}>{info.icon} {info.name}</h1>
      <p className="muted small" style={{ marginTop: -4 }}>
        {keys ? `${selected.length} part${selected.length > 1 ? 's' : ''} to review` : `Part ${from + 1}${to > from ? `–${to + 1}` : ''} of ${chunks.length}`}
      </p>

      {outcome ? (
        <Results
          outcome={outcome}
          chunks={selected}
          onAgain={() => { setOutcome(null); setRun(run + 1) }}
          next={
            nextInPath ? (
              <button className="btn primary" autoFocus onClick={() => { setOutcome(null); nav(`/t/${id}/practice/${nextInPath}${rangeQs}&path=1`) }}>
                Next step: {modeById(nextInPath)!.name} →
              </button>
            ) : fromReview ? (
              <Link className="btn primary" to="/review">Continue review</Link>
            ) : (
              <Link className="btn primary" to={`/t/${id}`}>Done</Link>
            )
          }
          moreLink={!keys && to < chunks.length - 1 ? practiceUrl(id, inPath ? GUIDED_PATH[0] : mode, to + 1, Math.min(chunks.length - 1, to + 1 + (to - from)), inPath ? '&path=1' : '') : undefined}
        />
      ) : (
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
      )}
    </div>
  )
}

function Results({ outcome, chunks, onAgain, next, moreLink }: { outcome: Outcome; chunks: Chunk[]; onAgain: () => void; next: React.ReactNode; moreLink?: string }) {
  const { scores } = outcome
  const avg = scores ? mean(scores) : null
  const verdict = avg === null ? 'Nice work.' : avg >= 0.97 ? 'Word perfect!' : avg >= 0.85 ? 'Very good.' : avg >= 0.6 ? 'Getting there.' : 'Keep at it. Mistakes now mean memories later.'
  return (
    <div className="card stack center">
      {avg !== null && <div className="result-score">{Math.round(avg * 100)}%</div>}
      <h2>{verdict}</h2>
      {scores && (
        <table style={{ width: '100%', maxWidth: 560, margin: '0 auto', borderCollapse: 'collapse', textAlign: 'left' }} className="small">
          <tbody>
            {chunks.map((c, i) => (
              <tr key={c.key} style={{ borderTop: '1px solid var(--line)' }}>
                <td style={{ padding: '6px 4px', fontFamily: 'var(--font-text)' }}>{c.text.length > 60 ? c.text.slice(0, 60) + '…' : c.text}</td>
                <td style={{ padding: '6px 4px', textAlign: 'right', whiteSpace: 'nowrap' }}>{scores[i] == null ? <span className="muted">not tested</span> : `${Math.round(scores[i]! * 100)}%`}</td>
                <td style={{ padding: '6px 4px', textAlign: 'right', whiteSpace: 'nowrap' }} className="muted">
                  {outcome.next[i] ? `next ${fmtDue(outcome.next[i]!)}` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!scores && <p className="muted small">Study modes don't affect your schedule. Test yourself when you're ready.</p>}
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn" onClick={onAgain}>Try again</button>
        {moreLink && <Link className="btn" to={moreLink}>Next parts</Link>}
        {next}
      </div>
    </div>
  )
}

function mean(xs: (number | null)[]): number | null {
  const v = xs.filter((x): x is number => x !== null && x !== undefined)
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

function fmtDue(d: Date): string {
  const mins = (d.getTime() - Date.now()) / 60000
  if (mins < 60) return `in ${Math.max(1, Math.round(mins))} min`
  if (mins < 1440) return `in ${Math.round(mins / 60)} h`
  return `in ${Math.round(mins / 1440)} d`
}

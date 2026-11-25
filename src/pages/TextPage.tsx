import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, CalendarClock, Check, ChevronRight, Copy, Ellipsis, Pencil, Play, Share2, Sparkles, Trash2, Trophy, Undo2,
} from 'lucide-react'
import { useToast } from '../components/Toast'
import { GUIDED_PATH, MODES, modeById, REVIEW_MODE, type ModeInfo } from '../modes'
import { orderUnits } from '../modes/Order'
import { nextStep, relativeTime, textStats } from '../lib/plan'
import { isDue, mastery, MASTERY_LABELS } from '../lib/srs'
import { initialOf, type Chunk } from '../lib/text'
import { forgetText, undoText } from '../lib/texts'
import { useText } from '../lib/useText'

export function practiceUrl(id: string, mode: string, from: number, to: number, extra = '') {
  return `/t/${id}/practice/${mode}?from=${from}&to=${to}${extra}`
}

type View = 'full' | 'initials' | 'hidden'

export default function TextPage() {
  const { id = '' } = useParams()
  const { state, text, chunks, progress, lang, updatedElsewhere, clearUpdated } = useText(id)
  const cards = progress?.cards
  const best = progress?.best ?? {}
  const stats = useMemo(() => textStats(chunks, cards), [chunks, cards])
  const step = useMemo(() => nextStep(chunks, cards), [chunks, cards])
  const [sel, setSel] = useState<[number, number] | null>(null)
  const [anchor, setAnchor] = useState<number | null>(null)
  const [view, setView] = useState<View>('full')
  const textRef = useRef<HTMLDivElement>(null)

  // Until someone picks parts themselves, the selection follows the suggestion.
  const suggested: [number, number] =
    step.kind === 'learn' ? [step.from, step.to] : [0, Math.max(0, chunks.length - 1)]
  const [from, to] = sel ?? suggested

  useEffect(() => setSel(null), [id])

  if (state === 'loading') return <p className="muted" style={{ marginTop: 32 }}>Loading…</p>
  if (state === 'missing' || !text || !lang)
    return (
      <div className="card center stack" style={{ marginTop: 32 }}>
        <h2>Text not found</h2>
        <p className="muted">The link may be mistyped, or the text was removed after a long time unused.</p>
        <Link to="/" className="btn">Go home</Link>
      </div>
    )

  const selected = chunks.slice(from, to + 1)
  const selWords = selected.reduce((n, c) => n + c.lines.flat().filter((t) => t.w).length, 0)
  const isAll = from === 0 && to === chunks.length - 1

  function pick(i: number, shift: boolean) {
    if ((shift || anchor !== null) && anchor !== null && i !== anchor) {
      setSel([Math.min(anchor, i), Math.max(anchor, i)])
      setAnchor(null)
    } else {
      setSel([i, i])
      setAnchor(i)
    }
  }

  return (
    <div className="textpage">
      <Link to="/" className="crumb"><ArrowLeft size={16} aria-hidden /> Your texts</Link>

      {updatedElsewhere && (
        <div className="banner row" style={{ marginTop: 12 }}>
          Someone with the link just updated this text.
          <span className="spacer" />
          <button className="btn small" onClick={clearUpdated}>OK</button>
        </div>
      )}

      <Header id={id} title={text.title} langName={lang.native} pending={!!text.pending} canUndo={text.canUndo} text={text} stats={stats} parts={chunks.length} />

      <Overview
        chunks={chunks}
        stats={stats}
        step={step}
        id={id}
        cards={cards}
        onSegment={(i) => {
          setSel([i, i])
          setAnchor(i)
          textRef.current?.querySelector(`[data-part="${i}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }}
      />

      <div className="tp-grid">
        <section className="card tp-text" ref={textRef} aria-label="Text">
          <div className="tp-text-head">
            <h2>The text</h2>
            <span className="spacer" />
            <div className="seg" role="group" aria-label="How to show the text">
              <button aria-pressed={view === 'full'} onClick={() => setView('full')}>Full</button>
              <button aria-pressed={view === 'initials'} onClick={() => setView('initials')}>First letters</button>
              <button aria-pressed={view === 'hidden'} onClick={() => setView('hidden')}>Hidden</button>
            </div>
          </div>
          <p className="muted small tp-hint">
            {anchor !== null
              ? 'Now tap another part to select a range, or start practising.'
              : 'Tap a part to practise it. Tap a second part to select everything in between.'}
          </p>
          <TextView
            chunks={chunks}
            cards={cards}
            view={view}
            bcp47={lang.bcp47}
            split={text.split}
            from={from}
            to={to}
            anchor={anchor}
            onPick={pick}
          />
          <Legend />
        </section>

        <aside className="tp-side">
          <PracticePanel
            id={id}
            from={from}
            to={to}
            total={chunks.length}
            words={selWords}
            isAll={isAll}
            isSuggested={!sel}
            best={best}
            selected={selected}
            onSelectAll={() => { setSel([0, chunks.length - 1]); setAnchor(null) }}
            onReset={() => { setSel(null); setAnchor(null) }}
          />
        </aside>
        {!text.pending && <div className="tp-sharewrap"><ShareCard id={id} /></div>}
      </div>
    </div>
  )
}

/* ───────────────────────── Header ───────────────────────── */

function Header({ id, title, langName, pending, canUndo, text, stats, parts }: {
  id: string; title: string; langName: string; pending: boolean; canUndo: boolean
  text: NonNullable<ReturnType<typeof useText>['text']>; stats: ReturnType<typeof textStats>; parts: number
}) {
  const nav = useNavigate()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const link = `${location.origin}/t/${id}`

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  async function copy() {
    setOpen(false)
    try {
      await navigator.clipboard.writeText(link)
      toast('Link copied')
    } catch {
      toast('Copy the link from the box below')
    }
  }
  async function share() {
    if (navigator.share) await navigator.share({ title, url: link }).catch(() => {})
    else copy()
  }
  async function undo() {
    setOpen(false)
    if (!confirm('Restore the previous version of this text?')) return
    try {
      await undoText(text)
      toast('Previous version restored')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not undo')
    }
  }
  async function forget() {
    setOpen(false)
    if (!confirm('Remove this text and your progress from this device? Anyone with the link can still open it.')) return
    await forgetText(id)
    nav('/')
  }

  return (
    <header className="tp-head">
      <div className="tp-title">
        <div className="row tp-tags">
          <span className="tag">{langName}</span>
          {pending && <span className="tag">On this device only</span>}
        </div>
        <h1>{title}</h1>
        <p className="muted small tp-meta">
          {parts} part{parts === 1 ? '' : 's'} · {stats.words} words · about {stats.sayMinutes} min to say
        </p>
      </div>
      <div className="row tp-actions">
        {!pending && <button className="btn small" onClick={share}><Share2 size={16} aria-hidden /> Share</button>}
        <Link className="btn small" to={`/t/${id}/edit`}><Pencil size={16} aria-hidden /> Edit</Link>
        <div className="menu" ref={menuRef}>
          <button className="btn small icon-only" aria-label="More actions" aria-expanded={open} onClick={() => setOpen(!open)}>
            <Ellipsis size={18} aria-hidden />
          </button>
          {open && (
            <div className="menu-pop" role="menu">
              {!pending && <button role="menuitem" onClick={copy}><Copy size={16} aria-hidden /> Copy link</button>}
              {canUndo && <button role="menuitem" onClick={undo}><Undo2 size={16} aria-hidden /> Undo last edit</button>}
              <button role="menuitem" className="danger" onClick={forget}><Trash2 size={16} aria-hidden /> Remove from this device</button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

/* ───────────────────────── Overview ───────────────────────── */

function Ring({ percent }: { percent: number }) {
  const r = 34
  const c = 2 * Math.PI * r
  return (
    <svg className="ring" viewBox="0 0 80 80" width="88" height="88" role="img" aria-label={`${percent}% memorised`}>
      <circle cx="40" cy="40" r={r} className="ring-track" />
      <circle cx="40" cy="40" r={r} className="ring-fill" strokeDasharray={c} strokeDashoffset={c * (1 - percent / 100)} />
      <text x="40" y="44" textAnchor="middle" className="ring-text">{percent}%</text>
    </svg>
  )
}

function Overview({ chunks, stats, step, id, cards, onSegment }: {
  chunks: Chunk[]; stats: ReturnType<typeof textStats>; step: ReturnType<typeof nextStep>; id: string
  cards: Record<string, import('../lib/srs').CompactCard> | undefined; onSegment: (i: number) => void
}) {
  const levelNames = ['New', 'Learning', 'Familiar', 'Strong', 'Mastered']
  return (
    <section className="card tp-overview" aria-label="Progress">
      <div className="tp-progress">
        <Ring percent={stats.percent} />
        <div className="tp-progress-body">
          <div className="tp-levels">
            {[4, 3, 2, 1, 0].map((lvl) => (
              <span key={lvl} className="lvl"><span className={`dot m${lvl}`} />{stats.levels[lvl]} {levelNames[lvl].toLowerCase()}</span>
            ))}
          </div>
          <div className="segbar" role="list" aria-label="Parts by how well you know them">
            {chunks.map((c, i) => {
              const m = mastery(cards?.[c.key])
              const due = isDue(cards?.[c.key])
              return (
                <button
                  key={c.key}
                  role="listitem"
                  className={`m${m}${due ? ' is-due' : ''}`}
                  title={`Part ${i + 1}: ${MASTERY_LABELS[m]}${due ? ' (due)' : ''}`}
                  aria-label={`Part ${i + 1}, ${MASTERY_LABELS[m]}${due ? ', due for review' : ''}`}
                  onClick={() => onSegment(i)}
                />
              )
            })}
          </div>
          <p className="muted small" style={{ margin: 0 }}>
            <CalendarClock size={14} aria-hidden style={{ verticalAlign: '-2px' }} />{' '}
            {stats.dueCount > 0
              ? `${stats.dueCount} part${stats.dueCount > 1 ? 's' : ''} due for review now`
              : stats.nextDue
                ? `Next review ${relativeTime(stats.nextDue)}`
                : 'Reviews are scheduled once you test yourself'}
          </p>
        </div>
      </div>

      <div className="tp-next">
        {step.kind === 'review' && (
          <>
            <div className="tp-next-label"><Sparkles size={16} aria-hidden /> Up next</div>
            <div className="tp-next-title">Review {step.keys.length} part{step.keys.length > 1 ? 's' : ''}</div>
            <p className="muted small">A quick recall just as you start to forget does the most good.</p>
            <Link className="btn primary big" to={`/t/${id}/practice/${REVIEW_MODE}?keys=${step.keys.join(',')}`}>
              <Play size={18} aria-hidden /> Review now
            </Link>
          </>
        )}
        {step.kind === 'learn' && (
          <>
            <div className="tp-next-label"><Sparkles size={16} aria-hidden /> Up next</div>
            <div className="tp-next-title">
              {stats.levels[0] === chunks.length ? 'Start with ' : 'Learn '}part{step.to > step.from ? 's' : ''} {step.from + 1}
              {step.to > step.from ? `–${step.to + 1}` : ''}
            </div>
            <p className="muted small">{step.words} words · guided, about {Math.max(3, Math.round(step.words / 8))} min</p>
            <Link className="btn primary big" to={practiceUrl(id, GUIDED_PATH[0], step.from, step.to, '&path=1')}>
              <Play size={18} aria-hidden /> Start learning
            </Link>
          </>
        )}
        {step.kind === 'test' && (
          <>
            <div className="tp-next-label"><Trophy size={16} aria-hidden /> Every part learned</div>
            <div className="tp-next-title">Test the whole text</div>
            <p className="muted small">Nothing's due. Prove you can do it start to finish.</p>
            <div className="row">
              <Link className="btn primary big" to={practiceUrl(id, 'type-all', 0, chunks.length - 1)}><Play size={18} aria-hidden /> Write it out</Link>
              <Link className="btn" to={practiceUrl(id, 'recite', 0, chunks.length - 1)}>Recite</Link>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

/* ───────────────────────── Text ───────────────────────── */

function TextView({ chunks, cards, view, bcp47, split, from, to, anchor, onPick }: {
  chunks: Chunk[]; cards: Record<string, import('../lib/srs').CompactCard> | undefined; view: View; bcp47: string
  split: number; from: number; to: number; anchor: number | null; onPick: (i: number, shift: boolean) => void
}) {
  const [peek, setPeek] = useState<Set<string>>(new Set())
  useEffect(() => setPeek(new Set()), [view])
  const paras = useMemo(() => {
    const out: Chunk[][] = []
    for (const c of chunks) (out[c.para] ??= []).push(c)
    return out.filter(Boolean)
  }, [chunks])
  const block = split !== 1 // lines and paragraphs each start on a new line

  function words(c: Chunk) {
    if (view === 'full') return c.lines.map((l, li) => <Fragment key={li}>{li > 0 && <br />}{l.map((t) => t.t).join('')}</Fragment>)
    return c.lines.map((l, li) => (
      <Fragment key={li}>
        {li > 0 && <br />}
        {l.map((t, ti) => {
          if (!t.w) return <Fragment key={ti}>{t.t}</Fragment>
          const k = `${c.key}:${li}:${ti}`
          if (peek.has(k)) return <span key={ti} className="w">{t.t}</span>
          const reveal = (e: React.MouseEvent) => { e.stopPropagation(); setPeek((p) => new Set(p).add(k)) }
          if (view === 'initials') {
            const cue = initialOf(t.t)
            return <span key={ti} className="w cue" onClick={reveal}>{cue}<span className="rest">{t.t.slice(cue.length).replace(/./gu, ' ')}</span></span>
          }
          return <span key={ti} className="w hidden" onClick={reveal}>{t.t}</span>
        })}
      </Fragment>
    ))
  }

  return (
    <div className="tp-passage" lang={bcp47}>
      {paras.map((p, pi) => (
        <p key={pi}>
          {p.map((c) => {
            const m = mastery(cards?.[c.key])
            const due = isDue(cards?.[c.key])
            const inSel = c.index >= from && c.index <= to
            return (
              <Fragment key={c.key}>
                <span
                  data-part={c.index}
                  className={`part lv${m}${inSel ? ' sel' : ''}${c.index === anchor ? ' anchor' : ''}${due ? ' is-due' : ''}${block ? ' block' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={inSel}
                  aria-label={`Part ${c.index + 1}, ${MASTERY_LABELS[m]}`}
                  onClick={(e) => onPick(c.index, e.shiftKey)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onPick(c.index, e.shiftKey))}
                >
                  <span className="part-no" aria-hidden>{c.index + 1}</span>
                  {words(c)}
                </span>
                {!block && ' '}
              </Fragment>
            )
          })}
        </p>
      ))}
    </div>
  )
}

function Legend() {
  return (
    <div className="legend small muted" aria-hidden>
      {MASTERY_LABELS.map((l, i) => <span key={l}><span className={`dash m${i}`} />{l}</span>)}
      <span><span className="due-dot" />Due</span>
    </div>
  )
}

/* ───────────────────────── Practice ───────────────────────── */

function PracticePanel({ id, from, to, total, words, isAll, isSuggested, best, selected, onSelectAll, onReset }: {
  id: string; from: number; to: number; total: number; words: number; isAll: boolean; isSuggested: boolean
  best: Record<string, number>; selected: Chunk[]; onSelectAll: () => void; onReset: () => void
}) {
  const range = `Part${to > from ? 's' : ''} ${from + 1}${to > from ? `–${to + 1}` : ''}`
  const url = (m: string, extra = '') => practiceUrl(id, m, from, to, extra)
  const disabled = (m: ModeInfo) => m.id === 'order' && orderUnits(selected).length < 2

  return (
    <section className="card tp-practice" aria-label="Practise">
      <div className="tp-sel">
        <div>
          <div className="tp-sel-label">{isSuggested ? 'Suggested' : 'Selected'}</div>
          <div className="tp-sel-range">{isAll ? `All ${total} parts` : range}<span className="muted"> · {words} words</span></div>
        </div>
        <span className="spacer" />
        {!isAll && <button className="btn small ghost" onClick={onSelectAll}>All</button>}
        {!isSuggested && <button className="btn small ghost" onClick={onReset}>Reset</button>}
      </div>

      <h3 className="tp-h3">Learn it, step by step</h3>
      <ol className="path">
        {GUIDED_PATH.map((mid, i) => {
          const m = modeById(mid)!
          const b = best[mid]
          return (
            <li key={mid}>
              <Link to={url(mid, '&path=1')} className="path-step">
                <span className={`path-num${b ? ' done' : ''}`}>{b ? <Check size={14} aria-hidden /> : i + 1}</span>
                <span className="path-name">{m.name}</span>
                {b !== undefined && m.kind === 'test' && <span className="score">{Math.round(b * 100)}%</span>}
              </Link>
            </li>
          )
        })}
      </ol>
      <Link to={url(GUIDED_PATH[0], '&path=1')} className="btn primary full"><Play size={16} aria-hidden /> Start the guided path</Link>

      <h3 className="tp-h3">Test yourself <span className="muted small">schedules reviews</span></h3>
      <ModeList modes={MODES.filter((m) => m.group === 'recall')} url={url} best={best} disabled={disabled} />

      <h3 className="tp-h3">Games</h3>
      <ModeList modes={MODES.filter((m) => m.group === 'game')} url={url} best={best} disabled={disabled} />

      <h3 className="tp-h3">Study aids</h3>
      <ModeList modes={MODES.filter((m) => m.group === 'study')} url={url} best={best} disabled={disabled} />
    </section>
  )
}

function ModeList({ modes, url, best, disabled }: {
  modes: ModeInfo[]; url: (m: string) => string; best: Record<string, number>; disabled: (m: ModeInfo) => boolean
}) {
  return (
    <ul className="modelist">
      {modes.map((m) => {
        const Icon = m.icon
        const off = disabled(m)
        const inner = (
          <>
            <span className="ml-ico"><Icon size={18} aria-hidden /></span>
            <span className="ml-body">
              <span className="ml-name">{m.name}</span>
              <span className="ml-blurb">{off ? 'Select more text for this one.' : m.blurb}</span>
            </span>
            {best[m.id] !== undefined && m.kind === 'test' ? <span className="score">{Math.round(best[m.id] * 100)}%</span> : <ChevronRight size={16} className="ml-chev" aria-hidden />}
          </>
        )
        return (
          <li key={m.id}>
            {off ? <span className="ml-row" aria-disabled="true">{inner}</span> : <Link className="ml-row" to={url(m.id)}>{inner}</Link>}
          </li>
        )
      })}
    </ul>
  )
}

function ShareCard({ id }: { id: string }) {
  const toast = useToast()
  const link = `${location.origin}/t/${id}`
  return (
    <section className="card tp-share" aria-label="Share">
      <h3 className="tp-h3" style={{ marginTop: 0 }}>Link to this text</h3>
      <div className="share">
        <input className="input" readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Link to this text" />
        <button
          className="btn small icon-only"
          aria-label="Copy link"
          onClick={() => navigator.clipboard.writeText(link).then(() => toast('Link copied'), () => toast('Copy the link from the box'))}
        >
          <Copy size={16} aria-hidden />
        </button>
      </div>
      <p className="muted small" style={{ margin: '8px 0 0' }}>Bookmark it to come back. Anyone with the link can see and edit the text, but not your progress.</p>
    </section>
  )
}

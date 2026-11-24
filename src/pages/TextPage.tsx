import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MasteryBar, masteryPercent } from '../components/MasteryBar'
import { useToast } from '../components/Toast'
import { GUIDED_PATH, MODES, REVIEW_MODE } from '../modes'
import { orderUnits } from '../modes/Order'
import { dueAt, isDue, mastery, MASTERY_LABELS } from '../lib/srs'
import { forgetText, undoText } from '../lib/texts'
import { useText } from '../lib/useText'

export function practiceUrl(id: string, mode: string, from: number, to: number, extra = '') {
  return `/t/${id}/practice/${mode}?from=${from}&to=${to}${extra}`
}

function relative(d: Date): string {
  const days = (d.getTime() - Date.now()) / 86400000
  if (days < 0) return 'now'
  if (days < 1 / 24) return 'within the hour'
  if (days < 1) return `in ${Math.round(days * 24)} h`
  if (days < 45) return `in ${Math.round(days)} day${Math.round(days) === 1 ? '' : 's'}`
  return `in ${Math.round(days / 30)} months`
}

export default function TextPage() {
  const { id = '' } = useParams()
  const { state, text, chunks, progress, lang, updatedElsewhere, clearUpdated } = useText(id)
  const nav = useNavigate()
  const toast = useToast()
  const cards = progress?.cards
  const [sel, setSel] = useState<[number, number] | null>(null)
  const [anchor, setAnchor] = useState<number | null>(null)

  // Default selection: first chunk that isn't at least "familiar", in a block of up to 4.
  useEffect(() => {
    if (sel || !chunks.length) return
    const first = Math.max(0, chunks.findIndex((c) => mastery(cards?.[c.key]) < 2))
    setSel([first, Math.min(chunks.length - 1, first + Math.min(3, Math.max(0, chunks.length - 1)))])
  }, [chunks, cards, sel])

  const due = useMemo(() => chunks.filter((c) => isDue(cards?.[c.key])), [chunks, cards])
  const link = typeof window !== 'undefined' ? `${location.origin}/t/${id}` : ''

  if (state === 'loading') return <p className="muted" style={{ marginTop: 32 }}>Loading…</p>
  if (state === 'missing' || !text || !lang)
    return (
      <div className="card center stack" style={{ marginTop: 32 }}>
        <h2>Text not found</h2>
        <p className="muted">The link may be mistyped, or the text was removed after a long time unused.</p>
        <Link to="/" className="btn">Go home</Link>
      </div>
    )

  const [from, to] = sel ?? [0, Math.max(0, chunks.length - 1)]
  const selected = chunks.slice(from, to + 1)

  function pick(i: number, e: React.MouseEvent) {
    if (e.shiftKey && anchor !== null) {
      setSel([Math.min(anchor, i), Math.max(anchor, i)])
    } else if (anchor !== null && sel && sel[0] === sel[1] && sel[0] === anchor && i !== anchor) {
      setSel([Math.min(anchor, i), Math.max(anchor, i)])
      setAnchor(null)
    } else {
      setSel([i, i])
      setAnchor(i)
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      toast('Link copied')
    } catch {
      toast('Copy the link from the box')
    }
  }

  async function share() {
    if (navigator.share) await navigator.share({ title: text!.title, url: link }).catch(() => {})
    else copy()
  }

  async function undo() {
    if (!confirm('Restore the previous version of this text?')) return
    try {
      await undoText(text!)
      toast('Previous version restored')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not undo')
    }
  }

  async function forget() {
    if (!confirm('Remove this text and your progress from this device? Anyone with the link can still open it.')) return
    await forgetText(id)
    nav('/')
  }

  return (
    <div>
      {updatedElsewhere && (
        <div className="banner row" style={{ marginTop: 12 }}>
          This text was just updated by someone with the link.
          <span className="spacer" />
          <button className="btn small" onClick={clearUpdated}>OK</button>
        </div>
      )}
      <div className="row" style={{ marginTop: 16 }}>
        <span className="tag">{lang.native}</span>
        <span className="muted small">{chunks.length} parts · {masteryPercent(chunks, cards)}% learned</span>
        <span className="spacer" />
        <Link className="btn small ghost" to={`/t/${id}/edit`}>Edit</Link>
        {text.canUndo && <button className="btn small ghost" onClick={undo}>Undo last edit</button>}
        <button className="btn small ghost" onClick={forget}>Remove</button>
      </div>
      <h1 style={{ marginTop: 8, fontFamily: 'var(--font-text)' }}>{text.title}</h1>
      <MasteryBar chunks={chunks} cards={cards} />

      {text.pending ? (
        <p className="banner small" style={{ marginTop: 16 }}>Saved on this device only. You'll get a shareable link once you're back online.</p>
      ) : (
        <div className="share card" style={{ marginTop: 16, padding: 12 }}>
          <input className="input" readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Share link" />
          <button className="btn small" onClick={copy}>Copy link</button>
          <button className="btn small primary" onClick={share}>Share</button>
        </div>
      )}
      {!text.pending && <p className="muted small" style={{ marginTop: 6 }}>Bookmark this link to come back. Anyone with it can view and edit the text, but not your progress.</p>}

      {due.length > 0 && (
        <div className="card row" style={{ marginTop: 16, background: 'var(--near-soft)' }}>
          <div>
            <strong>{due.length} part{due.length > 1 ? 's' : ''} due for review</strong>
            <div className="small muted">A quick recall now strengthens the memory most.</div>
          </div>
          <span className="spacer" />
          <Link className="btn primary" to={`/t/${id}/practice/${REVIEW_MODE}?keys=${due.map((c) => c.key).join(',')}`}>Review now</Link>
        </div>
      )}

      <div className="section-title">
        <h2>Parts</h2>
        <span className="muted small">Tap to select, tap another to select a range</span>
      </div>
      <ul className="chunklist" lang={lang.bcp47}>
        {chunks.map((c, i) => {
          const card = cards?.[c.key]
          const m = mastery(card)
          return (
            <li key={c.key} className={i >= from && i <= to ? 'sel' : ''} onClick={(e) => pick(i, e)} aria-selected={i >= from && i <= to}>
              <span className={`dot m${m}`} title={MASTERY_LABELS[m]} />
              <span className="txt">{c.text}</span>
              {card && card[3] > 0 && <span className="small muted" style={{ fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap' }}>{relative(dueAt(card))}</span>}
            </li>
          )
        })}
      </ul>
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn small ghost" onClick={() => setSel([0, chunks.length - 1])}>Select all</button>
        <span className="muted small">Selected: part {from + 1}{to > from ? `–${to + 1}` : ''}</span>
      </div>

      <div className="card row" style={{ marginTop: 20 }}>
        <div>
          <strong>Learn the selected part{to > from ? 's' : ''}</strong>
          <div className="small muted">A guided path: read → first letters → fade → type initials → write it out.</div>
        </div>
        <span className="spacer" />
        <Link className="btn primary" to={practiceUrl(id, GUIDED_PATH[0], from, to, '&path=1')}>Start learning</Link>
      </div>

      <div className="section-title"><h2>Study</h2><span className="muted small">Get familiar</span></div>
      <div className="modes">
        {MODES.filter((m) => m.kind === 'study').map((m) => (
          <Link key={m.id} className="mode" to={practiceUrl(id, m.id, from, to)}>
            <span className="ico">{m.icon}</span>
            <span><strong>{m.name}</strong><span className="muted">{m.blurb}</span></span>
          </Link>
        ))}
      </div>
      <div className="section-title"><h2>Test yourself</h2><span className="muted small">These schedule your reviews</span></div>
      <div className="modes">
        {MODES.filter((m) => m.kind === 'test').map((m) => {
          const disabled = m.id === 'order' && orderUnits(selected).length < 2
          return disabled ? (
            <span key={m.id} className="mode" aria-disabled="true" title="Select more text for this game">
              <span className="ico">{m.icon}</span>
              <span><strong>{m.name}</strong><span className="muted">Select more text for this one.</span></span>
            </span>
          ) : (
            <Link key={m.id} className="mode" to={practiceUrl(id, m.id, from, to)}>
              <span className="ico">{m.icon}</span>
              <span><strong>{m.name}</strong><span className="muted">{m.blurb}</span></span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { languageById } from '../../shared/languages'
import { REVIEW_MODE } from '../modes'
import { isDue, recall } from '../lib/srs'
import { local } from '../lib/store'
import { chunkText } from '../lib/text'

/** Everything that's due, across all texts, weakest first. */
export default function Review() {
  const groups = useLiveQuery(async () => {
    const out = []
    for (const p of await local.progress.toArray()) {
      const t = await local.texts.get(p.textId)
      if (!t) continue
      const due = chunkText(t.body, t.lang, t.split).filter((c) => isDue(p.cards[c.key]))
      if (due.length) out.push({ t, due, weakest: Math.min(...due.map((c) => recall(p.cards[c.key]))) })
    }
    return out.sort((a, b) => a.weakest - b.weakest)
  })
  if (!groups) return null
  const total = groups.reduce((n, g) => n + g.due.length, 0)

  return (
    <div className="stack" style={{ marginTop: 16 }}>
      <h1>Review</h1>
      {total === 0 ? (
        <div className="card center stack">
          <h2>All caught up 🎉</h2>
          <p className="muted">Nothing is due. Reviews appear here just before you'd start to forget something. Come back tomorrow, or learn something new.</p>
          <Link to="/" className="btn">Your texts</Link>
        </div>
      ) : (
        <>
          <p className="muted">{total} part{total > 1 ? 's' : ''} due across {groups.length} text{groups.length > 1 ? 's' : ''}. Each review is a quick first-letter recall.</p>
          {groups.map(({ t, due, weakest }) => (
            <div key={t.id} className="card row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row"><span className="tag">{languageById(t.lang).native}</span><strong>{t.title}</strong></div>
                <div className="small muted">{due.length} due · recall now about {Math.round(weakest * 100)}% at worst</div>
              </div>
              <Link className="btn primary" to={`/t/${t.id}/practice/${REVIEW_MODE}?keys=${due.map((c) => c.key).join(',')}&review=1`}>Review</Link>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

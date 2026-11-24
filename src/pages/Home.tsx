import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { languageById, LANGUAGES } from '../../shared/languages'
import { MasteryBar, masteryPercent } from '../components/MasteryBar'
import { isDue } from '../lib/srs'
import { local } from '../lib/store'
import { chunkText } from '../lib/text'

export default function Home() {
  const rows = useLiveQuery(async () => {
    const texts = await local.texts.orderBy('opened').reverse().toArray()
    const progress = new Map((await local.progress.toArray()).map((p) => [p.textId, p]))
    return texts.map((t) => {
      const chunks = chunkText(t.body, t.lang, t.split)
      const cards = progress.get(t.id)?.cards
      return { t, chunks, cards, due: chunks.filter((c) => isDue(cards?.[c.key])).length }
    })
  })
  if (!rows) return null
  const totalDue = rows.reduce((n, r) => n + r.due, 0)

  return (
    <div>
      {rows.length === 0 ? (
        <section className="hero">
          <h1>Learn anything by heart.</h1>
          <p>
            Poems, speeches, lines for a play, songs, prayers. Paste a text in English, French, Scottish Gaelic, German or
            Spanish and practise it with games built on how memory works. No account needed.
          </p>
          <div className="row">
            <Link to="/new" className="btn primary">+ Add your first text</Link>
            <Link to="/how-it-works" className="btn">How it works</Link>
          </div>
          <div className="steps">
            <div className="card"><h3>1 · Paste</h3><p className="muted small">Add a text and choose its language. You get a link to it right away, and you can share or bookmark it.</p></div>
            <div className="card"><h3>2 · Learn</h3><p className="muted small">Go from reading, to first letters, to fading words, to typing it all from memory, one part at a time.</p></div>
            <div className="card"><h3>3 · Keep it</h3><p className="muted small">Short reviews are scheduled just before you'd forget, so it stays learned for months.</p></div>
          </div>
          <div className="flags">{LANGUAGES.map((l) => <span className="tag" key={l.id}>{l.native}</span>)}</div>
        </section>
      ) : (
        <>
          <div className="row" style={{ margin: '16px 0' }}>
            <h1 style={{ margin: 0 }}>Your texts</h1>
            <span className="spacer" />
            {totalDue > 0 && <Link to="/review" className="btn">Review {totalDue} due</Link>}
            <Link to="/new" className="btn primary">+ New text</Link>
          </div>
          <div className="grid">
            {rows.map(({ t, chunks, cards, due }) => (
              <Link to={`/t/${t.id}`} key={t.id} className="card text-card">
                <div className="row">
                  <span className="tag">{languageById(t.lang).native}</span>
                  {due > 0 && <span className="tag due">{due} due</span>}
                  {t.pending && <span className="tag">not uploaded yet</span>}
                  <span className="spacer" />
                  <span className="small muted">{masteryPercent(chunks, cards)}%</span>
                </div>
                <h3 style={{ marginTop: 10 }}>{t.title}</h3>
                <div className="preview" lang={languageById(t.lang).bcp47}>{t.body}</div>
                <MasteryBar chunks={chunks} cards={cards} />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

import { lazy, Suspense, useEffect } from 'react'
import { Link, NavLink, Route, Routes } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Library, Plus, Repeat } from 'lucide-react'
import { AccountButton } from './components/Account'
import { isDue } from './lib/srs'
import { local } from './lib/store'
import { chunkText } from './lib/text'
import { uploadPending } from './lib/texts'
import Home from './pages/Home'

const Editor = lazy(() => import('./pages/Editor'))
const TextPage = lazy(() => import('./pages/TextPage'))
const Practice = lazy(() => import('./pages/Practice'))
const Review = lazy(() => import('./pages/Review'))
const HowItWorks = lazy(() => import('./pages/HowItWorks'))
const Privacy = lazy(() => import('./pages/Privacy'))

function useDueCount() {
  return (
    useLiveQuery(async () => {
      let n = 0
      for (const p of await local.progress.toArray()) {
        const t = await local.texts.get(p.textId)
        if (t) n += chunkText(t.body, t.lang, t.split).filter((c) => isDue(p.cards[c.key])).length
      }
      return n
    }) ?? 0
  )
}

export default function App() {
  const due = useDueCount()
  useEffect(() => {
    const up = () => uploadPending().catch(() => {})
    up()
    window.addEventListener('online', up)
    return () => window.removeEventListener('online', up)
  }, [])
  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand"><img src="/icon.svg" alt="" />Memorise</Link>
        <nav>
          <NavLink to="/" end className="navlink"><Library size={18} aria-hidden /><span className="label">Texts</span></NavLink>
          <NavLink to="/review" className="navlink">
            <Repeat size={18} aria-hidden /><span className="label">Review</span>
            {due > 0 && <span className="pill" aria-label={`${due} due`}>{due}</span>}
          </NavLink>
          <NavLink to="/new" className="navlink"><Plus size={18} aria-hidden /><span className="label">New</span></NavLink>
          <AccountButton />
        </nav>
      </header>
      <main>
        <Suspense fallback={<p className="muted">Loading…</p>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/new" element={<Editor />} />
            <Route path="/review" element={<Review />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/t/:id" element={<TextPage />} />
            <Route path="/t/:id/edit" element={<Editor />} />
            <Route path="/t/:id/practice/:mode" element={<Practice />} />
            <Route path="*" element={<p>Page not found. <Link to="/">Go home</Link></p>} />
          </Routes>
        </Suspense>
      </main>
      <footer className="footer">
        <Link to="/how-it-works">How it works</Link>
        <Link to="/privacy">Privacy</Link>
        <span>Free forever. Your progress stays on your device unless you sign in.</span>
      </footer>
    </div>
  )
}

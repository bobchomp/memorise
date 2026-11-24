import { useState } from 'react'
import { api, isSignedIn } from '../lib/api'
import { local } from '../lib/store'

// TODO before launch: replace these with the real operator details.
const OPERATOR = '[Operator name]'
const CONTACT = '[contact email]'

export default function Privacy() {
  const [msg, setMsg] = useState<string | null>(null)

  async function clearDevice() {
    if (!confirm('Delete all texts and progress stored in this browser?')) return
    await local.delete()
    location.href = '/'
  }

  async function deleteSynced() {
    if (!confirm('Delete your synced library and progress from our servers? This cannot be undone.')) return
    try {
      await api.deleteAccount()
      setMsg('Your synced data has been deleted. You can also delete your sign-in account from the account menu.')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Something went wrong')
    }
  }

  return (
    <article className="prose" style={{ marginTop: 16 }}>
      <h1>Privacy</h1>
      <p className="muted small">Last updated 24 November 2026</p>
      <p>
        Memorise is run by {OPERATOR} (“we”), the data controller for this site. Contact: {CONTACT}. We collect as little
        as possible, and we don't sell data, show ads or use tracking cookies or analytics.
      </p>

      <h2>What we store, and why</h2>
      <ul>
        <li>
          <strong>Texts you add.</strong> Stored on our database so you get a link to them. <em>Anyone with a text's link can read and
          edit it</em>, so don't put private or sensitive information in a text. Legal basis: contract, i.e. providing the service
          you asked for (UK/EU GDPR Art. 6(1)(b)). Texts not opened for about 13 months and not saved in anyone's account are deleted
          automatically.
        </li>
        <li>
          <strong>Practice progress.</strong> Kept <em>in your browser</em> only. It leaves your device only if you sign in to
          sync it.
        </li>
        <li>
          <strong>Account (optional).</strong> If you sign in, our sign-in provider Clerk processes your email address and name. We
          store an internal ID, the texts in your library and your progress, so you can use them on any device. Legal basis:
          contract (Art. 6(1)(b)).
        </li>
        <li>
          <strong>Abuse prevention.</strong> To limit spam we count requests per hour using a one-way, salted hash of your IP
          address. We never store the IP address itself, and the counts are deleted after about two hours. Legal basis: legitimate
          interests in keeping the service working (Art. 6(1)(f)).
        </li>
        <li>
          <strong>Server logs.</strong> Our host, Vercel, keeps short-lived technical logs (which can include IP addresses) for
          security and operations.
        </li>
      </ul>

      <h2>Who processes data for us</h2>
      <ul>
        <li>Vercel Inc. (hosting)</li>
        <li>Turso / ChiselStrike Inc. (database)</li>
        <li>Clerk Inc. (sign-in, only if you use an account)</li>
      </ul>
      <p>
        These providers may process data outside the UK/EEA, including in the USA. Where they do, transfers are covered by
        safeguards such as the EU–US Data Privacy Framework (and its UK extension) or standard contractual clauses.
      </p>

      <h2>Cookies and storage</h2>
      <p>
        We use your browser's storage (IndexedDB and localStorage) to keep your texts, progress and settings on your device.
        If you sign in, Clerk sets cookies that are strictly necessary to keep you signed in. There are no advertising or
        analytics cookies.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask to access, correct, delete or export your data, object to processing, or restrict it. Email {CONTACT}.
        You can also complain to a data protection authority. In the UK that's the Information Commissioner's Office (ico.org.uk).
        The service isn't aimed at children under 13. If you're under 13, please don't create an account.
      </p>

      <h2>Delete your data now</h2>
      <div className="row">
        <button className="btn" onClick={clearDevice}>Clear this device</button>
        {isSignedIn() && <button className="btn" onClick={deleteSynced}>Delete my synced data</button>}
      </div>
      {msg && <p className="banner small" style={{ marginTop: 12 }}>{msg}</p>}
    </article>
  )
}

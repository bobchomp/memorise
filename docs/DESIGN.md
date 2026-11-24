# Design

## Product decisions (agreed with the owner)

- **Local-first, optional account.** Without an account, a text is uploaded once to get its share link, and progress
  stays in IndexedDB. Signing in syncs a library and progress across devices.
- **Turso** for the database (SQLite, ~5 GB free), **Clerk** for sign-in, **Vercel** for hosting.
- **The language is a property of each text**, not of the interface. The UI is in English. The language drives
  tokenising, accent tolerance, first-letter cues, text-to-speech and speech recognition.
- **Anyone with a text's link may edit it.** That's why IDs are unguessable, every write is versioned, and one previous
  version is kept for undo.
- Public launch, free forever, no ads, no analytics.

## Storage efficiency

Free-tier storage is the main limit, so the schema keeps bytes per row to a minimum:

| Technique | Saving |
|---|---|
| Text bodies are **Brotli-compressed** (quality 11, text mode) with a 1-byte codec flag. Very short texts are stored raw when compression wouldn't help. | Measured 34–49% smaller on short poems (French, Gaelic, English sonnet); longer texts with repetition do better |
| **Public ID = base62(rowid) + base62(59-bit salt)**. The salt is an 8-byte INTEGER, and lookups use the rowid primary key. | Avoids a 16–36 byte UUID column *and* its unique index on every row |
| Timestamps are **seconds since 2026-01-01**, so they stay 4 bytes until 2094. "Last seen" is a day number (2 bytes). | 2–4 bytes per timestamp |
| `lang` and `split` are tiny integers. | 1 byte each |
| `library` is a `WITHOUT ROWID` table keyed by `(user, text)`. | No hidden rowid or duplicate key index |
| Progress is **one compressed blob per (user, text)**, not a row per part. FSRS cards are packed as number arrays with minute-resolution dates. | ~30 bytes per part before compression, one row per text |
| Rate limiting packs hour + action + a 40-bit IP hash into **one INTEGER primary key**. Rows expire after about 2 hours. | No raw IPs, no extra index |
| `seen` is updated at most once a week per text. | Reads stay reads, so there are fewer writes (Turso bills writes) |
| Texts idle for 400 days and in nobody's library are deleted by a daily job. | Storage is reclaimed |

Rough capacity: a 1,500-character poem compresses to roughly 800–1,000 bytes. With row overhead (~60 bytes), 5 GB holds around 4–5 million texts of that size.

## Concurrency for shared editing

`PUT /api/texts/:id` must include the `ver` it was based on. The update is `WHERE id = ? AND ver = ?`. A mismatch
returns `409` with the current text, so an edit is never silently overwritten. Each successful edit moves the old body
into `prev`, and "Undo last edit" swaps `body` and `prev` (so an undo can itself be undone).

## Modes

| Mode | Kind | Research basis |
|---|---|---|
| Read & listen | study | Production effect (reading aloud), multimodal exposure |
| First letters | study | First-letter cueing |
| Fade out | study | Vanishing cues |
| Type first letters | test | Retrieval practice on every word, in order |
| Build up | test | Cumulative / serial learning, practising the joins |
| Fill the blanks | test | Cloze retrieval |
| What comes next? | test | Recognition (easiest retrieval) |
| Unscramble | test | Order and syntax recall |
| Put in order | test | Sequence recall |
| Spot the mistake | test | Precision, catching near misses |
| Cue cards | test | Paired-associate recall between parts |
| Write it out | test | Free recall of the full text |
| Recite aloud | test | Free recall plus production effect, using the Web Speech API where it's supported |

Test modes return a 0–1 score per part. These map to FSRS grades (<0.6 Again, <0.85 Hard, <0.97 Good, else Easy;
a brand-new part can't start at Easy). Parts a game didn't test are not graded.

## Language handling

- A word regex that keeps elisions and hyphenated forms together (`l'homme`, `c'est-à-dire`), plus Gaelic leading and
  trailing apostrophes (`'s`, `a'`) and prefixes (`t-sràid`, `h-oidhche`).
- Matching is case- and punctuation-insensitive, treats `ß` as `ss`, and counts an accent-only difference as a **near
  miss** worth half credit (or zero with strict accents).
- First-letter cues show the elision (`l'h…`), and either letter is accepted when typing.
- TTS uses browser voices. Most browsers have no Gaelic voice, so the app falls back to reading aloud yourself.

## API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /api/texts | optional | Create a text (rate limited per IP) |
| GET | /api/texts/:id | none | Read |
| PUT | /api/texts/:id | none | Edit with `ver`, or `{ver, undo:true}` |
| GET/PUT/DELETE | /api/library | required | Synced library and progress |
| DELETE | /api/account | required | Erase synced data (GDPR Art. 17) |
| GET | /api/cron/cleanup | CRON_SECRET | Daily cleanup |

## Still to do before launch

- Operator name and contact email in the privacy page.
- Create the Turso database, Clerk app and Vercel project (and set their environment variables).
- Optional: a self-hosted Gaelic voice, a PWA service worker for full offline use, and a public library of texts.

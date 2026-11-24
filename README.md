# Memorise

A free web app for learning texts by heart in **English, French, Scottish Gaelic, German and Spanish**.

- Paste a text, pick its language, and get a link straight away. No account needed.
- **Anyone with the link can view and edit the text.** Practice progress is personal and isn't shared.
- 13 study and test modes, with FSRS spaced repetition for every part of a text.
- Local-first: everything works from the browser's own storage. Signing in (optional) syncs your library and progress.

See [docs/DESIGN.md](docs/DESIGN.md) for the architecture and storage decisions, and the in-app
"How it works" page for the research behind the modes.

## Stack

| Part | Choice | Why |
|---|---|---|
| Front end | React 19 + Vite + TypeScript | Fast, static, deploys anywhere |
| Local storage | IndexedDB via Dexie | Works offline, no server cost for progress |
| API | Vercel Functions (`/api`) | Free tier, same repo |
| Database | Turso (libSQL / SQLite) | Largest free storage of the mainstream options (~5 GB), plain SQL |
| Sign-in | Clerk (optional) | Free tier, Google and email login |
| Scheduling | `ts-fsrs` (FSRS v6) | The algorithm Anki uses |

## Run locally

```bash
npm install
```

```bash
npm run dev
```

With no environment variables set, the API uses a local SQLite file (`local.db`) and sign-in is hidden.

```bash
npm test
```

## Deploy

1. **Turso:** create a database and a token:
   ```bash
   turso db create memorise
   ```
   ```bash
   turso db show memorise --url
   ```
   ```bash
   turso db tokens create memorise
   ```
   Tables are created automatically on first request.
2. **Clerk (optional):** create an application and copy the publishable and secret keys.
3. **Vercel:** import the repo and set the variables from `.env.example`:
   `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`,
   `RATE_LIMIT_SECRET` and `CRON_SECRET` (long random strings).
   `vercel.json` sets up the SPA routing and a daily cleanup job.
4. Fill in the operator name and contact email at the top of `src/pages/Privacy.tsx`.

## Project skills

`.claude/skills` contains the Governance, Risk & Compliance skills (GDPR, WCAG, etc.) and the humanizer skill,
installed for this project. See `.claude/skills/SOURCES.md`.

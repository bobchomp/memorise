import { defineConfig, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * In development, serve the Vercel-style functions in /api through Vite so a
 * single `npm run dev` runs everything (production uses Vercel's router).
 */
function devApi(): Plugin {
  return {
    name: 'dev-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()
        const path = req.url.split('?')[0]
        const parts = path.replace(/^\/api\//, '').split('/')
        const candidates = [`/api/${parts.join('/')}.ts`, `/api/${parts.join('/')}/index.ts`]
        if (parts.length > 1) candidates.push(`/api/${parts.slice(0, -1).join('/')}/[id].ts`)
        for (const file of candidates) {
          let mod: Record<string, (r: Request) => Promise<Response>>
          try {
            mod = await server.ssrLoadModule(file)
          } catch {
            continue
          }
          const handler = mod[req.method ?? 'GET']
          if (!handler) {
            res.statusCode = 405
            return res.end()
          }
          const chunks: Buffer[] = []
          for await (const c of req) chunks.push(c as Buffer)
          const headers = new Headers()
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
          const body = chunks.length ? Buffer.concat(chunks) : undefined
          const response = await handler(
            new Request(`http://localhost${req.url}`, { method: req.method, headers, body }),
          )
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          return res.end(Buffer.from(await response.arrayBuffer()))
        }
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), devApi()],
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
} as never)

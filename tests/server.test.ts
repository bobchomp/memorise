import { beforeAll, describe, expect, it } from 'vitest'
import { rmSync } from 'node:fs'
import { pack, unpack } from '../server/codec.js'
import { formatId, newSalt, parseId } from '../server/ids.js'

const DB = 'file:test.db'

describe('ids', () => {
  it('round-trips and rejects junk', () => {
    for (const rowid of [1n, 61n, 62n, 123456789n]) {
      const salt = newSalt()
      const id = formatId(rowid, salt)
      expect(parseId(id)).toEqual({ rowid, salt })
    }
    expect(parseId('short')).toBeNull()
    expect(parseId('1!!!!!!!!!!')).toBeNull()
  })
})

describe('codec', () => {
  it('compresses longer text and round-trips unicode', () => {
    const text = 'Mo chridhe sa Ghàidhealtachd, mo chridhe chan eil e seo. '.repeat(20)
    const blob = pack(text)
    expect(blob.length).toBeLessThan(Buffer.byteLength(text) / 4)
    expect(unpack(blob)).toBe(text)
    expect(unpack(pack('Ça va?'))).toBe('Ça va?')
  })
})

describe('api', () => {
  let POST: (r: Request) => Promise<Response>
  let GET: (r: Request) => Promise<Response>
  let PUT: (r: Request) => Promise<Response>
  beforeAll(async () => {
    rmSync('test.db', { force: true })
    process.env.TURSO_DATABASE_URL = DB
    ;({ POST } = await import('../api/texts/index.js'))
    ;({ GET, PUT } = await import('../api/texts/[id].js'))
  })
  const req = (url: string, method = 'GET', body?: unknown) =>
    new Request('http://x' + url, { method, body: body ? JSON.stringify(body) : undefined })

  it('creates, reads, edits with versioning, undoes', async () => {
    const res = await POST(req('/api/texts', 'POST', { title: 'Poem', lang: 2, split: 0, body: 'Line one\nLine two' }))
    expect(res.status).toBe(201)
    const t = await res.json()
    expect(t.id.length).toBeGreaterThan(10)

    const got = await (await GET(req('/api/texts/' + t.id))).json()
    expect(got.body).toBe('Line one\nLine two')

    const wrong = await GET(req('/api/texts/' + t.id.slice(0, -1) + (t.id.endsWith('a') ? 'b' : 'a')))
    expect(wrong.status).toBe(404)

    const ok = await PUT(req('/api/texts/' + t.id, 'PUT', { ...got, body: 'Edited', ver: 1 }))
    expect((await ok.json()).ver).toBe(2)
    const stale = await PUT(req('/api/texts/' + t.id, 'PUT', { ...got, body: 'Clash', ver: 1 }))
    expect(stale.status).toBe(409)
    expect((await stale.json()).current.body).toBe('Edited')

    const undone = await (await PUT(req('/api/texts/' + t.id, 'PUT', { ver: 2, undo: true }))).json()
    expect(undone.body).toBe('Line one\nLine two')
    expect(undone.ver).toBe(3)
  })

  it('validates input', async () => {
    expect((await POST(req('/api/texts', 'POST', { lang: 0, split: 0, body: '' }))).status).toBe(400)
    expect((await POST(req('/api/texts', 'POST', { lang: 9, split: 0, body: 'x' }))).status).toBe(400)
  })
})

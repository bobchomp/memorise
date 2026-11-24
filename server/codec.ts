import { brotliCompressSync, brotliDecompressSync, constants } from 'node:zlib'

/**
 * Stored blobs are one flag byte followed by the payload:
 *   0 = raw UTF-8, 1 = Brotli (text mode, max quality).
 * Short strings often grow when compressed, so we keep whichever is smaller.
 * Brotli's built-in dictionary covers English, French, German and Spanish
 * well; Gaelic still gains from repetition within a text.
 */
const RAW = 0
const BROTLI = 1

export function pack(text: string): Buffer {
  const raw = Buffer.from(text, 'utf8')
  if (raw.length < 48) return Buffer.concat([Buffer.of(RAW), raw])
  const br = brotliCompressSync(raw, {
    params: {
      [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
      [constants.BROTLI_PARAM_QUALITY]: 11,
      [constants.BROTLI_PARAM_SIZE_HINT]: raw.length,
    },
  })
  return br.length < raw.length
    ? Buffer.concat([Buffer.of(BROTLI), br])
    : Buffer.concat([Buffer.of(RAW), raw])
}

export function unpack(blob: ArrayBuffer | Uint8Array | Buffer): string {
  const buf = Buffer.isBuffer(blob) ? blob : Buffer.from(blob as ArrayBuffer)
  const flag = buf[0]
  const payload = buf.subarray(1)
  if (flag === RAW) return payload.toString('utf8')
  if (flag === BROTLI) return brotliDecompressSync(payload).toString('utf8')
  throw new Error(`Unknown blob encoding ${flag}`)
}

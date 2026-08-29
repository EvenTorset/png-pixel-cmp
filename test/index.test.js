import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const built = existsSync(new URL('../pkg/png_pixel_cmp.js', import.meta.url))
assert.ok(built, 'pkg is missing, run `npm run build` first')

const { comparePngPixels, ready$ } = await import('../js/index.js')

const table = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

const crc32 = bytes => {
  let c = 0xffffffff
  for (const b of bytes) c = table[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

/** colourType 0 grey, 2 truecolour, 3 indexed, 6 truecolour + alpha */
function png(width, height, colourType, rows, { palette, level } = {}) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = colourType
  const parts = [SIGNATURE, chunk('IHDR', ihdr)]
  if (palette) parts.push(chunk('PLTE', Buffer.from(palette)))
  parts.push(chunk('IDAT', deflateSync(Buffer.concat(rows), level === undefined ? {} : { level })))
  parts.push(chunk('IEND', Buffer.alloc(0)))
  return Buffer.concat(parts)
}

const solid = (w, h, [r, g, b], level) => png(w, h, 2, Array.from({ length: h }, () => {
  const row = Buffer.alloc(1 + w * 3)
  for (let x = 0; x < w; x++) { row[1 + x * 3] = r; row[2 + x * 3] = g; row[3 + x * 3] = b }
  return row
}), { level })

const solidIndexed = (w, h, [r, g, b]) => png(w, h, 3, Array.from({ length: h }, () => Buffer.alloc(1 + w)), {
  palette: [r, g, b],
})

const solidGrey = (w, h, v) => png(w, h, 0, Array.from({ length: h }, () => {
  const row = Buffer.alloc(1 + w)
  for (let x = 0; x < w; x++) row[1 + x] = v
  return row
}))

test('the module loads', async () => {
  await ready$()
})

test('same pixels compressed differently are equal', async () => {
  assert.equal(await comparePngPixels(solid(8, 8, [12, 34, 56], 9), solid(8, 8, [12, 34, 56], 1)), true)
})

test('a single changed channel is not equal', async () => {
  assert.equal(await comparePngPixels(solid(8, 8, [12, 34, 56]), solid(8, 8, [12, 34, 57])), false)
})

test('indexed and truecolour encodings of one image are equal', async () => {
  assert.equal(await comparePngPixels(solidIndexed(4, 4, [200, 100, 50]), solid(4, 4, [200, 100, 50])), true)
})

test('greyscale matches the same colour as truecolour', async () => {
  assert.equal(await comparePngPixels(solidGrey(4, 4, 128), solid(4, 4, [128, 128, 128])), true)
})

test('different dimensions are not equal, and do not throw', async () => {
  assert.equal(await comparePngPixels(solid(4, 4, [1, 2, 3]), solid(8, 8, [1, 2, 3])), false)
})

test('unreadable data rejects with a kind', async () => {
  await assert.rejects(
    () => comparePngPixels(Buffer.from([1, 2, 3, 4]), solid(4, 4, [1, 2, 3])),
    error => {
      assert.equal(error.name, 'PngCompareError')
      assert.equal(typeof error.kind, 'string')
      return true
    },
  )
})

import { PngCompareError } from './error'
import { classify, filterBpp, rowStrideBytes } from './header'
import { inflateIdat } from './inflate'
import { unfilter } from './filter'
import { normalizeToRgba8 } from './normalize'
import { ParsedPng, parsePng } from './parse'

export { PngCompareError, type PngCompareErrorKind } from './error'

export async function comparePngPixels(a: Uint8Array, b: Uint8Array): Promise<boolean> {
  const pngA = withLabel('a', () => parsePng(a))
  const pngB = withLabel('b', () => parsePng(b))

  if (pngA.header.width !== pngB.header.width || pngA.header.height !== pngB.header.height) {
    return false
  }
  const width = pngA.header.width
  const height = pngA.header.height

  const [pixelsA, pixelsB] = await Promise.all([
    withLabelAsync('a', () => decodeToRgba8(pngA, width, height)),
    withLabelAsync('b', () => decodeToRgba8(pngB, width, height)),
  ])

  return bytesEqual(pixelsA, pixelsB)
}

async function decodeToRgba8(png: ParsedPng, width: number, height: number): Promise<Uint8Array> {
  const format = classify(png.header)
  const stride = rowStrideBytes(format, width)
  const limit = safeLimit(height, stride)

  const raw = await inflateIdat(png.idat, limit)
  const rows = unfilter(raw, height, stride, filterBpp(format))
  return normalizeToRgba8(format, rows, width, height, stride, png.palette, png.trns)
}

function safeLimit(height: number, stride: number): number {
  const limit = height * (stride + 1)
  if (!Number.isSafeInteger(limit)) {
    throw new PngCompareError(
      'DecompressedSizeExceeded',
      'image dimensions imply a decompressed size too large to safely handle',
    )
  }
  return limit
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

function withLabel<T>(label: 'a' | 'b', fn: () => T): T {
  try {
    return fn()
  } catch (e) {
    throw relabel(e, label)
  }
}

async function withLabelAsync<T>(label: 'a' | 'b', fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    throw relabel(e, label)
  }
}

function relabel(e: unknown, label: 'a' | 'b'): unknown {
  if (e instanceof PngCompareError) {
    return new PngCompareError(e.kind, `image ${label}: ${e.message}`, e.details)
  }
  return e
}

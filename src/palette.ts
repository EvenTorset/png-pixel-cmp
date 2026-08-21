import { PngCompareError } from './error'

export function buildRgbaPalette(plte: Uint8Array | null, trns: Uint8Array | null): Uint32Array {
  if (!plte) {
    throw new PngCompareError('MissingPalette', 'indexed-color image is missing PLTE')
  }
  if (plte.length === 0 || plte.length % 3 !== 0) {
    throw new PngCompareError('InvalidPalette', 'PLTE chunk length must be a positive multiple of 3')
  }

  const entryCount = plte.length / 3
  const palette = new Uint32Array(entryCount)
  for (let i = 0; i < entryCount; i++) {
    const r = plte[i * 3]!
    const g = plte[i * 3 + 1]!
    const b = plte[i * 3 + 2]!
    palette[i] = ((r << 24) | (g << 16) | (b << 8) | 255) >>> 0
  }

  if (trns) {
    if (trns.length > palette.length) {
      throw new PngCompareError('InvalidPalette', 'tRNS has more entries than PLTE')
    }
    for (let i = 0; i < trns.length; i++) {
      const alpha = trns[i]!
      palette[i] = ((palette[i]! & 0xffffff00) | alpha) >>> 0
    }
  }

  return palette
}

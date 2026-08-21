import { PngCompareError } from './error'
import { Format, grayBitDepth, indexedBitDepth, isGray, isIndexed } from './header'
import { buildRgbaPalette } from './palette'
import { unpackSubByteSamples } from './bitpack'

export function normalizeToRgba8(
  format: Format,
  rows: Uint8Array,
  width: number,
  height: number,
  stride: number,
  palette: Uint8Array | null,
  trns: Uint8Array | null,
): Uint8Array {
  const out = new Uint8Array(width * height * 4)

  if (isIndexed(format)) {
    const indices = unpackSubByteSamples(rows, width, height, stride, indexedBitDepth(format))
    const rgbaPalette = buildRgbaPalette(palette, trns)
    for (let i = 0; i < indices.length; i++) {
      const packed = rgbaPalette[indices[i]!]
      if (packed === undefined) {
        throw new PngCompareError('InvalidPalette', 'palette index out of range for this image')
      }
      out[i * 4] = (packed >>> 24) & 0xff
      out[i * 4 + 1] = (packed >>> 16) & 0xff
      out[i * 4 + 2] = (packed >>> 8) & 0xff
      out[i * 4 + 3] = packed & 0xff
    }
    return out
  }

  if (isGray(format)) {
    const bitDepth = grayBitDepth(format)
    const rawSamples = unpackSubByteSamples(rows, width, height, stride, bitDepth)
    const maxValue = (1 << bitDepth) - 1 // 1, 3, 15, or 255
    const scale = 255 / maxValue // 255, 85, 17, or 1
    const transparentRaw = grayTrnsValue(trns)
    for (let i = 0; i < width * height; i++) {
      const raw = rawSamples[i]!
      const v = raw * scale
      out[i * 4] = v
      out[i * 4 + 1] = v
      out[i * 4 + 2] = v
      out[i * 4 + 3] = transparentRaw !== null && raw === transparentRaw ? 0 : 255
    }
    return out
  }

  switch (format) {
    case 'GrayAlpha8': {
      for (let i = 0; i < width * height; i++) {
        const v = rows[i * 2]!
        const a = rows[i * 2 + 1]!
        out[i * 4] = v
        out[i * 4 + 1] = v
        out[i * 4 + 2] = v
        out[i * 4 + 3] = a
      }
      return out
    }
    case 'Rgb8': {
      const transparentRgb = rgbTrnsValue(trns)
      for (let i = 0; i < width * height; i++) {
        const r = rows[i * 3]!
        const g = rows[i * 3 + 1]!
        const b = rows[i * 3 + 2]!
        const isTransparent =
          transparentRgb !== null && r === transparentRgb[0] && g === transparentRgb[1] && b === transparentRgb[2]
        out[i * 4] = r
        out[i * 4 + 1] = g
        out[i * 4 + 2] = b
        out[i * 4 + 3] = isTransparent ? 0 : 255
      }
      return out
    }
    case 'Rgba8': {
      out.set(rows)
      return out
    }
  }
}

function grayTrnsValue(trns: Uint8Array | null): number | null {
  if (!trns) return null
  if (trns.length < 2) {
    throw new PngCompareError('InvalidPalette', 'tRNS for grayscale must be at least 2 bytes')
  }
  return trns[1]!
}

function rgbTrnsValue(trns: Uint8Array | null): [number, number, number] | null {
  if (!trns) return null
  if (trns.length < 6) {
    throw new PngCompareError('InvalidPalette', 'tRNS for RGB must be at least 6 bytes')
  }
  return [trns[1]!, trns[3]!, trns[5]!]
}

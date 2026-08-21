import { PngCompareError } from './error'

export function unfilter(raw: Uint8Array, height: number, stride: number, filterBpp: number): Uint8Array {
  const out = new Uint8Array(stride * height)
  const prev = new Uint8Array(stride)

  let pos = 0
  for (let row = 0; row < height; row++) {
    if (pos >= raw.length) {
      throw new PngCompareError('Truncated', 'PNG data is truncated')
    }
    const filterType = raw[pos]!
    pos += 1

    const rowEnd = pos + stride
    if (rowEnd > raw.length) {
      throw new PngCompareError('Truncated', 'PNG data is truncated')
    }
    const src = raw.subarray(pos, rowEnd)
    pos = rowEnd

    const dstStart = row * stride
    const dst = out.subarray(dstStart, dstStart + stride)

    switch (filterType) {
      case 0: // None
        dst.set(src)
        break
      case 1: // Sub: + byte to the left in this row
        for (let i = 0; i < stride; i++) {
          const a = i >= filterBpp ? dst[i - filterBpp]! : 0
          dst[i] = (src[i]! + a) & 0xff
        }
        break
      case 2: // Up: + byte directly above in previous row
        for (let i = 0; i < stride; i++) {
          dst[i] = (src[i]! + prev[i]!) & 0xff
        }
        break
      case 3: // Average: + floor((left + above) / 2)
        for (let i = 0; i < stride; i++) {
          const a = i >= filterBpp ? dst[i - filterBpp]! : 0
          const b = prev[i]!
          dst[i] = (src[i]! + ((a + b) >> 1)) & 0xff
        }
        break
      case 4: { // Paeth predictor
        for (let i = 0; i < stride; i++) {
          const a = i >= filterBpp ? dst[i - filterBpp]! : 0
          const b = prev[i]!
          const c = i >= filterBpp ? prev[i - filterBpp]! : 0
          dst[i] = (src[i]! + paethPredictor(a, b, c)) & 0xff
        }
        break
      }
      default:
        throw new PngCompareError('InvalidFilterType', `invalid scanline filter type ${filterType}`, {
          filterType,
        })
    }

    prev.set(dst)
  }

  return out
}

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  if (pb <= pc) return b
  return c
}

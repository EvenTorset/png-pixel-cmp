export function unpackSubByteSamples(
  unfilteredRows: Uint8Array,
  width: number,
  height: number,
  stride: number,
  bitDepth: number,
): Uint8Array {
  if (bitDepth === 8) {
    return unfilteredRows
  }

  const out = new Uint8Array(width * height)
  const mask = (1 << bitDepth) - 1

  for (let row = 0; row < height; row++) {
    const rowStart = row * stride
    let bitPos = 0
    for (let x = 0; x < width; x++) {
      const byteIndex = rowStart + (bitPos >> 3)
      const bitOffset = bitPos & 7
      const shift = 8 - bitDepth - bitOffset
      out[row * width + x] = (unfilteredRows[byteIndex]! >> shift) & mask
      bitPos += bitDepth
    }
  }

  return out
}

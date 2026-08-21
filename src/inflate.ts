import { PngCompareError } from './error'

export async function inflateIdat(idatChunks: Uint8Array[], limit: number): Promise<Uint8Array> {
  const totalLen = idatChunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const combined = new Uint8Array(totalLen)
  let offset = 0
  for (const chunk of idatChunks) {
    combined.set(chunk, offset)
    offset += chunk.length
  }

  const stream = new Blob([combined]).stream().pipeThrough(new DecompressionStream('deflate'))
  const reader = stream.getReader()

  const parts: Uint8Array[] = []
  let total = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > limit) {
        await reader.cancel()
        throw new PngCompareError(
          'DecompressedSizeExceeded',
          'decompressed data exceeds size implied by image dimensions',
        )
      }
      parts.push(value)
    }
  } catch (err) {
    if (err instanceof PngCompareError) throw err
    throw new PngCompareError('DecompressionFailed', 'failed to inflate IDAT stream')
  }

  const out = new Uint8Array(total)
  let pos = 0
  for (const part of parts) {
    out.set(part, pos)
    pos += part.byteLength
  }
  return out
}

import { PngCompareError } from './error'

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

export interface RawChunk {
  kind: string
  data: Uint8Array
}

export function* readChunks(data: Uint8Array): Generator<RawChunk> {
  if (data.length < PNG_SIGNATURE.length || !PNG_SIGNATURE.every((b, i) => data[i] === b)) {
    throw new PngCompareError('InvalidSignature', 'not a PNG file (bad signature)')
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  let pos = 8

  while (true) {
    if (pos + 8 > data.length) {
      throw new PngCompareError('Truncated', 'PNG data is truncated')
    }

    const len = view.getUint32(pos, false)
    const kind = String.fromCharCode(data[pos + 4]!, data[pos + 5]!, data[pos + 6]!, data[pos + 7]!)

    const dataStart = pos + 8
    const dataEnd = dataStart + len
    // + 4 for the trailing CRC.
    if (!Number.isSafeInteger(dataEnd) || dataEnd + 4 > data.length) {
      throw new PngCompareError('Truncated', 'PNG data is truncated')
    }

    const chunkData = data.subarray(dataStart, dataEnd)
    pos = dataEnd + 4

    yield { kind, data: chunkData }

    if (kind === 'IEND') {
      return;
    }
  }
}

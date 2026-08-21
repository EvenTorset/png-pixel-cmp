import { readChunks } from './chunks'
import { PngCompareError } from './error'
import { Header, parseHeader } from './header'

export interface ParsedPng {
  header: Header
  palette: Uint8Array | null
  trns: Uint8Array | null
  idat: Uint8Array[]
}

export function parsePng(data: Uint8Array): ParsedPng {
  let header: Header | null = null
  let palette: Uint8Array | null = null
  let trns: Uint8Array | null = null
  const idat: Uint8Array[] = []
  let seenIend = false

  for (const chunk of readChunks(data)) {
    switch (chunk.kind) {
      case 'IHDR':
        if (header) throw new PngCompareError('InvalidChunkLayout', 'duplicate IHDR chunk')
        header = parseHeader(chunk.data)
        break
      case 'PLTE':
        if (!header || palette) {
          throw new PngCompareError('InvalidChunkLayout', 'PLTE before IHDR, or duplicated')
        }
        palette = chunk.data
        break
      case 'tRNS':
        if (!header) throw new PngCompareError('InvalidChunkLayout', 'tRNS before IHDR')
        trns = chunk.data
        break
      case 'IDAT':
        if (!header) throw new PngCompareError('InvalidChunkLayout', 'IDAT before IHDR')
        idat.push(chunk.data)
        break
      case 'IEND':
        seenIend = true
        break
      default:
        break
    }
  }

  if (!header) throw new PngCompareError('MissingIhdr', 'missing IHDR chunk')
  if (idat.length === 0) throw new PngCompareError('MissingIdat', 'missing IDAT chunk')
  if (!seenIend) throw new PngCompareError('InvalidChunkLayout', 'missing IEND chunk')

  return { header, palette, trns, idat }
}

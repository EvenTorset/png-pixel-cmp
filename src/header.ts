import { PngCompareError } from './error'

export interface Header {
  width: number
  height: number
  bitDepth: number
  colorType: number
  compression: number
  filterMethod: number
  interlace: number
}

export function parseHeader(data: Uint8Array): Header {
  if (data.length !== 13) {
    throw new PngCompareError('InvalidChunkLayout', 'IHDR chunk must be 13 bytes')
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  const width = view.getUint32(0, false)
  const height = view.getUint32(4, false)
  if (width === 0 || height === 0) {
    throw new PngCompareError('InvalidChunkLayout', 'width and height must be non-zero')
  }
  return {
    width,
    height,
    bitDepth: data[8]!,
    colorType: data[9]!,
    compression: data[10]!,
    filterMethod: data[11]!,
    interlace: data[12]!,
  }
}

export type Format =
  | 'Gray1'
  | 'Gray2'
  | 'Gray4'
  | 'Gray8'
  | 'GrayAlpha8'
  | 'Rgb8'
  | 'Rgba8'
  | 'Indexed1'
  | 'Indexed2'
  | 'Indexed4'
  | 'Indexed8'

export function isIndexed(format: Format): format is 'Indexed1' | 'Indexed2' | 'Indexed4' | 'Indexed8' {
  return format === 'Indexed1' || format === 'Indexed2' || format === 'Indexed4' || format === 'Indexed8'
}

export function isGray(format: Format): format is 'Gray1' | 'Gray2' | 'Gray4' | 'Gray8' {
  return format === 'Gray1' || format === 'Gray2' || format === 'Gray4' || format === 'Gray8'
}

export function indexedBitDepth(format: 'Indexed1' | 'Indexed2' | 'Indexed4' | 'Indexed8'): number {
  switch (format) {
    case 'Indexed1':
      return 1
    case 'Indexed2':
      return 2
    case 'Indexed4':
      return 4
    case 'Indexed8':
      return 8
  }
}

export function grayBitDepth(format: 'Gray1' | 'Gray2' | 'Gray4' | 'Gray8'): number {
  switch (format) {
    case 'Gray1':
      return 1
    case 'Gray2':
      return 2
    case 'Gray4':
      return 4
    case 'Gray8':
      return 8
  }
}

export function filterBpp(format: Format): number {
  switch (format) {
    case 'Gray1':
    case 'Gray2':
    case 'Gray4':
    case 'Gray8':
    case 'Indexed1':
    case 'Indexed2':
    case 'Indexed4':
    case 'Indexed8':
      return 1
    case 'GrayAlpha8':
      return 2
    case 'Rgb8':
      return 3
    case 'Rgba8':
      return 4
  }
}

export function rowStrideBytes(format: Format, width: number): number {
  switch (format) {
    case 'Gray1':
      return Math.ceil(width / 8)
    case 'Gray2':
      return Math.ceil(width / 4)
    case 'Gray4':
      return Math.ceil(width / 2)
    case 'Gray8':
      return width
    case 'GrayAlpha8':
      return width * 2
    case 'Rgb8':
      return width * 3
    case 'Rgba8':
      return width * 4
    case 'Indexed1':
      return Math.ceil(width / 8)
    case 'Indexed2':
      return Math.ceil(width / 4)
    case 'Indexed4':
      return Math.ceil(width / 2)
    case 'Indexed8':
      return width
  }
}

export function classify(h: Header): Format {
  if (h.compression !== 0) {
    throw new PngCompareError(
      'UnsupportedCompressionMethod',
      `unsupported PNG compression method ${h.compression}`,
      { compression: h.compression },
    )
  }
  if (h.filterMethod !== 0) {
    throw new PngCompareError(
      'UnsupportedFilterMethod',
      `unsupported PNG filter method ${h.filterMethod}`,
      { filterMethod: h.filterMethod },
    )
  }
  if (h.interlace !== 0) {
    throw unsupportedFormat(h)
  }

  if (h.colorType === 3) {
    switch (h.bitDepth) {
      case 1:
        return 'Indexed1'
      case 2:
        return 'Indexed2'
      case 4:
        return 'Indexed4'
      case 8:
        return 'Indexed8'
    }
  } else if (h.colorType === 0) {
    switch (h.bitDepth) {
      case 1:
        return 'Gray1'
      case 2:
        return 'Gray2'
      case 4:
        return 'Gray4'
      case 8:
        return 'Gray8'
    }
  } else if (h.bitDepth === 8) {
    switch (h.colorType) {
      case 4:
        return 'GrayAlpha8'
      case 2:
        return 'Rgb8'
      case 6:
        return 'Rgba8'
    }
  }

  throw unsupportedFormat(h)
}

function unsupportedFormat(h: Header): PngCompareError {
  return new PngCompareError(
    'UnsupportedFormat',
    `unsupported PNG format (colorType=${h.colorType}, bitDepth=${h.bitDepth}, interlace=${h.interlace})`,
    { colorType: h.colorType, bitDepth: h.bitDepth, interlace: h.interlace },
  )
}

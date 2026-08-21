export type PngCompareErrorKind =
  | 'InvalidSignature'
  | 'Truncated'
  | 'InvalidChunkLayout'
  | 'MissingIhdr'
  | 'MissingIdat'
  | 'MissingPalette'
  | 'InvalidPalette'
  | 'InvalidFilterType'
  | 'UnsupportedCompressionMethod'
  | 'UnsupportedFilterMethod'
  | 'UnsupportedFormat'
  | 'DecompressionFailed'
  | 'DecompressedSizeExceeded'

export class PngCompareError extends Error {
  readonly kind: PngCompareErrorKind
  readonly details?: Record<string, number>

  constructor(kind: PngCompareErrorKind, message: string, details?: Record<string, number>) {
    super(message)
    this.name = 'PngCompareError'
    this.kind = kind
    this.details = details
  }
}

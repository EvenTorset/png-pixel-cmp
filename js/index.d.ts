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

export interface PngCompareError extends Error {
  name: 'PngCompareError'
  kind: PngCompareErrorKind
}

/**
 * Resolves to whether the two PNGs decode to identical RGBA pixels.
 * Rejects with a {@link PngCompareError} if either image cannot be read.
 */
export function comparePngPixels(a: Uint8Array, b: Uint8Array): Promise<boolean>

/** Loads the wasm module up front, so the first comparison does not wait. */
export function ready$(): Promise<unknown>

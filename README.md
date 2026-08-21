# @cccode/png-pixel-cmp

A pure TypeScript library designed for comparing PNG files by decoded pixel value while ignoring encoding differences like compression level, filter choice, bit depth, and color type. Built for small pixel-art sprites (roughly 16x16 to 128x128) as a browser-native replacement for canvas-based pixel comparisons.

It relies on the web standard `DecompressionStream` API using the `deflate` format.

## Supported Formats

* Grayscale: 1, 2, 4, 8-bit (with `tRNS` support)
* Grayscale + alpha: 8-bit
* RGB: 8-bit (with `tRNS` support)
* RGBA: 8-bit
* Indexed color: 1, 2, 4, 8-bit (with `PLTE` and `tRNS` support)

16-bit depths and Adam7 interlacing are currently not supported.

## Usage

```ts
import { comparePngPixels, PngCompareError } from '@cccode/png-pixel-cmp'

try {
  const isIdentical = await comparePngPixels(bytesA, bytesB)
  console.log(isIdentical ? 'Pixels match' : 'Pixels differ')
} catch (e) {
  if (e instanceof PngCompareError) {
    console.error(`Comparison failed: ${e.message}`)
  }
}

```

### Return Values

* **`true`**: The pixel data in both PNGs is identical.
* **`false`**: The pixel data is not identical, or the image dimensions do not match.
* **Throws `PngCompareError`**: Either PNG file is invalid, corrupted, or uses unsupported features.

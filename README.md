# png-pixel-cmp

Compares two PNGs by decoded pixel values, ignoring encoding-only differences.

Two files that encode the same image are reported as identical even when their
bytes differ, so compression level, scanline filters, palette ordering, bit
depth and colour type are all ignored. Only the resulting RGBA pixels matter.

## Rust

```toml
[dependencies]
png-pixel-cmp = { git = "https://github.com/EvenTorset/png-pixel-cmp.git" }
```

```rust
use png_pixel_cmp::compare_png_pixels;

let same = compare_png_pixels(&a, &b)?;
```

`compare_png_pixels` returns `Result<bool, PngCompareError>`. Images with
different dimensions are `Ok(false)` rather than an error; only unreadable data
produces an error, and `PngCompareError::kind` says which of the thirteen
failure modes it was.

## JavaScript

```js
import { comparePngPixels } from '@cccode/png-pixel-cmp'

const same = await comparePngPixels(a, b)
```

## Supported formats

| Colour type | Bit depths |
|---|---|
| Greyscale | 1, 2, 4, 8 |
| Greyscale + alpha | 8 |
| Truecolour | 8 |
| Truecolour + alpha | 8 |
| Indexed | 1, 2, 4, 8 |

`tRNS` is honoured for all three of indexed, greyscale and truecolour. 16-bit
depths and interlaced images report `UnsupportedFormat`.

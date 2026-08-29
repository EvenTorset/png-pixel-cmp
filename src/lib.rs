//! Compares two PNGs by decoded pixel values, ignoring encoding-only
//! differences such as compression level, scanline filters, palette ordering
//! and colour type.
//!
//! ```no_run
//! # fn main() -> Result<(), png_pixel_cmp::PngCompareError> {
//! # let (a, b): (Vec<u8>, Vec<u8>) = (Vec::new(), Vec::new());
//! let same = png_pixel_cmp::compare_png_pixels(&a, &b)?;
//! # Ok(())
//! # }
//! ```

use std::borrow::Cow;

mod bitpack;
mod error;
mod filter;
mod header;
mod inflate;
mod normalize;
mod palette;
mod parse;

#[cfg(feature = "wasm")]
mod wasm;

pub use error::{PngCompareError, PngCompareErrorKind};

use error::{err, PngCompareErrorKind::*, Result};
use header::Header;
use parse::ParsedPng;

/// Returns whether the two PNGs decode to identical RGBA pixels.
///
/// Images of differing dimensions compare as different rather than as an error.
pub fn compare_png_pixels(a: &[u8], b: &[u8]) -> Result<bool> {
  let png_a = parse::parse_png(a).map_err(|e| e.labelled("a"))?;
  let png_b = parse::parse_png(b).map_err(|e| e.labelled("b"))?;

  if png_a.header.width != png_b.header.width || png_a.header.height != png_b.header.height {
    return Ok(false);
  }

  let raw_a = inflate_for(&png_a).map_err(|e| e.labelled("a"))?;
  let raw_b = inflate_for(&png_b).map_err(|e| e.labelled("b"))?;

  // identical formats and palettes mean identical encoded data can only
  // decode to identical pixels, so the decode can be skipped
  let same_shape = png_a.header.format == png_b.header.format
    && png_a.palette == png_b.palette
    && png_a.trns == png_b.trns;

  if same_shape && raw_a == raw_b {
    return Ok(true);
  }

  let rows_a = unfilter_for(&png_a, &raw_a).map_err(|e| e.labelled("a"))?;
  let rows_b = unfilter_for(&png_b, &raw_b).map_err(|e| e.labelled("b"))?;

  if same_shape && rows_a == rows_b {
    return Ok(true);
  }

  let pixels_a = normalize::normalize_to_rgba8(
    Cow::Owned(rows_a),
    &png_a.header,
    png_a.palette,
    png_a.trns,
  )
  .map_err(|e| e.labelled("a"))?;
  let pixels_b = normalize::normalize_to_rgba8(
    Cow::Owned(rows_b),
    &png_b.header,
    png_b.palette,
    png_b.trns,
  )
  .map_err(|e| e.labelled("b"))?;

  Ok(pixels_a == pixels_b)
}

fn safe_limit(header: &Header) -> Result<usize> {
  let stride = header.format.row_stride(header.width);
  match stride.checked_add(1).and_then(|s| header.height.checked_mul(s)) {
    Some(limit) => Ok(limit),
    None => err(
      DecompressedSizeExceeded,
      "image dimensions imply a decompressed size too large to safely handle",
    ),
  }
}

fn inflate_for(png: &ParsedPng<'_>) -> Result<Vec<u8>> {
  inflate::inflate_idat(&png.idat, safe_limit(&png.header)?)
}

fn unfilter_for(png: &ParsedPng<'_>, raw: &[u8]) -> Result<Vec<u8>> {
  let Header { height, format, width } = png.header;
  filter::unfilter(raw, height, format.row_stride(width), format.filter_bpp())
}

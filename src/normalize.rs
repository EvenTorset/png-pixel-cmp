use std::borrow::Cow;

use crate::bitpack::unpack_samples;
use crate::error::{err, PngCompareErrorKind::*, Result};
use crate::header::{Format, Header};
use crate::palette::build_rgba_palette;

pub fn normalize_to_rgba8<'a>(
  rows: Cow<'a, [u8]>,
  header: &Header,
  palette: Option<&[u8]>,
  trns: Option<&[u8]>,
) -> Result<Cow<'a, [u8]>> {
  let Header { width, height, format } = *header;
  let stride = format.row_stride(width);
  let pixels = width * height;

  match format {
    Format::Rgba8 => Ok(rows),
    Format::Indexed(depth) => {
      let indices = unpack_samples(&rows, width, height, stride, depth);
      let palette = build_rgba_palette(palette, trns)?;
      let entries = palette.len() / 4;
      let mut out = vec![0u8; pixels * 4];
      for i in 0..pixels {
        let index = indices[i] as usize;
        if index >= entries {
          return err(InvalidPalette, "palette index out of range for this image");
        }
        out[i * 4..i * 4 + 4].copy_from_slice(&palette[index * 4..index * 4 + 4]);
      }
      Ok(Cow::Owned(out))
    }
    Format::Gray(depth) => {
      let samples = unpack_samples(&rows, width, height, stride, depth);
      let max_value = (1u16 << depth) - 1;
      let scale = (255 / max_value) as u8;
      let transparent = match trns {
        Some(t) if t.len() >= 2 => Some(t[1]),
        Some(_) => {
          return err(InvalidPalette, "tRNS for grayscale must be at least 2 bytes")
        }
        None => None,
      };
      let mut out = vec![0u8; pixels * 4];
      for i in 0..pixels {
        let raw = samples[i];
        let v = raw.wrapping_mul(scale);
        out[i * 4] = v;
        out[i * 4 + 1] = v;
        out[i * 4 + 2] = v;
        out[i * 4 + 3] = if transparent == Some(raw) { 0 } else { 255 };
      }
      Ok(Cow::Owned(out))
    }
    Format::GrayAlpha8 => {
      let mut out = vec![0u8; pixels * 4];
      for i in 0..pixels {
        let v = rows[i * 2];
        out[i * 4] = v;
        out[i * 4 + 1] = v;
        out[i * 4 + 2] = v;
        out[i * 4 + 3] = rows[i * 2 + 1];
      }
      Ok(Cow::Owned(out))
    }
    Format::Rgb8 => {
      let transparent = match trns {
        Some(t) if t.len() >= 6 => Some([t[1], t[3], t[5]]),
        Some(_) => return err(InvalidPalette, "tRNS for RGB must be at least 6 bytes"),
        None => None,
      };
      let mut out = vec![0u8; pixels * 4];
      for i in 0..pixels {
        let rgb = [rows[i * 3], rows[i * 3 + 1], rows[i * 3 + 2]];
        out[i * 4..i * 4 + 3].copy_from_slice(&rgb);
        out[i * 4 + 3] = if transparent == Some(rgb) { 0 } else { 255 };
      }
      Ok(Cow::Owned(out))
    }
  }
}

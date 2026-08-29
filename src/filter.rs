use crate::error::{err, PngCompareErrorKind::*, Result};

/// Reverses the per-scanline filters. The previous row is read back out of the
/// output buffer, so no per-row copy is needed.
pub fn unfilter(raw: &[u8], height: usize, stride: usize, bpp: usize) -> Result<Vec<u8>> {
  let mut out = vec![0u8; stride * height];
  let lead = bpp.min(stride);
  let mut pos = 0usize;

  for row in 0..height {
    let Some(&filter) = raw.get(pos) else {
      return err(Truncated, "PNG data is truncated");
    };
    pos += 1;

    let Some(src) = raw.get(pos..pos + stride) else {
      return err(Truncated, "PNG data is truncated");
    };
    pos += stride;

    let dst = row * stride;
    let prev = dst.wrapping_sub(stride);

    match filter {
      0 => out[dst..dst + stride].copy_from_slice(src),
      1 => {
        out[dst..dst + lead].copy_from_slice(&src[..lead]);
        for i in bpp..stride {
          out[dst + i] = src[i].wrapping_add(out[dst + i - bpp]);
        }
      }
      2 => {
        if row == 0 {
          out[dst..dst + stride].copy_from_slice(src);
        } else {
          for i in 0..stride {
            out[dst + i] = src[i].wrapping_add(out[prev + i]);
          }
        }
      }
      3 => {
        if row == 0 {
          out[dst..dst + lead].copy_from_slice(&src[..lead]);
          for i in bpp..stride {
            out[dst + i] = src[i].wrapping_add(out[dst + i - bpp] >> 1);
          }
        } else {
          for i in 0..lead {
            out[dst + i] = src[i].wrapping_add(out[prev + i] >> 1);
          }
          for i in bpp..stride {
            let sum = out[dst + i - bpp] as u16 + out[prev + i] as u16;
            out[dst + i] = src[i].wrapping_add((sum >> 1) as u8);
          }
        }
      }
      4 => {
        if row == 0 {
          // with the row above all zero, Paeth reduces to Sub
          out[dst..dst + lead].copy_from_slice(&src[..lead]);
          for i in bpp..stride {
            out[dst + i] = src[i].wrapping_add(out[dst + i - bpp]);
          }
        } else {
          // with no byte to the left, Paeth reduces to Up
          for i in 0..lead {
            out[dst + i] = src[i].wrapping_add(out[prev + i]);
          }
          for i in bpp..stride {
            let a = out[dst + i - bpp] as i16;
            let b = out[prev + i] as i16;
            let c = out[prev + i - bpp] as i16;
            let p = a + b - c;
            let pa = (p - a).abs();
            let pb = (p - b).abs();
            let pc = (p - c).abs();
            let predictor = if pa <= pb && pa <= pc {
              a
            } else if pb <= pc {
              b
            } else {
              c
            };
            out[dst + i] = src[i].wrapping_add(predictor as u8);
          }
        }
      }
      other => {
        return err(
          InvalidFilterType,
          format!("invalid scanline filter type {other}"),
        )
      }
    }
  }

  Ok(out)
}

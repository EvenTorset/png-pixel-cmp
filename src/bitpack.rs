use std::borrow::Cow;

pub fn unpack_samples<'a>(
  rows: &'a [u8],
  width: usize,
  height: usize,
  stride: usize,
  depth: u8,
) -> Cow<'a, [u8]> {
  if depth == 8 {
    return Cow::Borrowed(rows);
  }

  let mut out = vec![0u8; width * height];
  let mask = ((1u16 << depth) - 1) as u8;

  for row in 0..height {
    let row_start = row * stride;
    let mut bit_pos = 0usize;
    for x in 0..width {
      let byte = rows[row_start + (bit_pos >> 3)];
      let shift = 8 - depth - (bit_pos & 7) as u8;
      out[row * width + x] = (byte >> shift) & mask;
      bit_pos += depth as usize;
    }
  }

  Cow::Owned(out)
}

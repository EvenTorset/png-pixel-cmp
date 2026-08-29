use crate::error::{err, PngCompareErrorKind::*, Result};
use crate::header::{parse_header, Header};

const SIGNATURE: [u8; 8] = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

pub struct ParsedPng<'a> {
  pub header: Header,
  pub palette: Option<&'a [u8]>,
  pub trns: Option<&'a [u8]>,
  pub idat: Vec<&'a [u8]>,
}

pub fn parse_png(data: &[u8]) -> Result<ParsedPng<'_>> {
  if data.len() < SIGNATURE.len() || data[..8] != SIGNATURE {
    return err(InvalidSignature, "not a PNG file (bad signature)");
  }

  let mut header: Option<Header> = None;
  let mut palette = None;
  let mut trns = None;
  let mut idat = Vec::new();
  let mut seen_iend = false;
  let mut pos = 8usize;

  while !seen_iend {
    if pos + 8 > data.len() {
      return err(Truncated, "PNG data is truncated");
    }
    let len = u32::from_be_bytes([data[pos], data[pos + 1], data[pos + 2], data[pos + 3]]) as usize;
    let kind = &data[pos + 4..pos + 8];

    let start = pos + 8;
    // + 4 for the trailing CRC
    let end = match start.checked_add(len).and_then(|e| e.checked_add(4)) {
      Some(e) if e <= data.len() => e,
      _ => return err(Truncated, "PNG data is truncated"),
    };
    let chunk = &data[start..start + len];
    pos = end;

    match kind {
      b"IHDR" => {
        if header.is_some() {
          return err(InvalidChunkLayout, "duplicate IHDR chunk");
        }
        header = Some(parse_header(chunk)?);
      }
      b"PLTE" => {
        if header.is_none() || palette.is_some() {
          return err(InvalidChunkLayout, "PLTE before IHDR, or duplicated");
        }
        palette = Some(chunk);
      }
      b"tRNS" => {
        if header.is_none() {
          return err(InvalidChunkLayout, "tRNS before IHDR");
        }
        trns = Some(chunk);
      }
      b"IDAT" => {
        if header.is_none() {
          return err(InvalidChunkLayout, "IDAT before IHDR");
        }
        idat.push(chunk);
      }
      b"IEND" => seen_iend = true,
      _ => {}
    }
  }

  let Some(header) = header else {
    return err(MissingIhdr, "missing IHDR chunk");
  };
  if idat.is_empty() {
    return err(MissingIdat, "missing IDAT chunk");
  }

  Ok(ParsedPng { header, palette, trns, idat })
}

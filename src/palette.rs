use crate::error::{err, PngCompareErrorKind::*, Result};

pub fn build_rgba_palette(plte: Option<&[u8]>, trns: Option<&[u8]>) -> Result<Vec<u8>> {
  let Some(plte) = plte else {
    return err(MissingPalette, "indexed-color image is missing PLTE");
  };
  if plte.is_empty() || plte.len() % 3 != 0 {
    return err(
      InvalidPalette,
      "PLTE chunk length must be a positive multiple of 3",
    );
  }

  let entries = plte.len() / 3;
  let mut palette = vec![255u8; entries * 4];
  for i in 0..entries {
    palette[i * 4..i * 4 + 3].copy_from_slice(&plte[i * 3..i * 3 + 3]);
  }

  if let Some(trns) = trns {
    if trns.len() > entries {
      return err(InvalidPalette, "tRNS has more entries than PLTE");
    }
    for (i, &alpha) in trns.iter().enumerate() {
      palette[i * 4 + 3] = alpha;
    }
  }

  Ok(palette)
}

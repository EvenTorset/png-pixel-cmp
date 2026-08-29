use zune_inflate::{DeflateDecoder, DeflateOptions};

use crate::error::{err, PngCompareErrorKind::*, Result};

pub fn inflate_idat(chunks: &[&[u8]], limit: usize) -> Result<Vec<u8>> {
  let joined: Vec<u8>;
  let data: &[u8] = if chunks.len() == 1 {
    chunks[0]
  } else {
    joined = chunks.concat();
    &joined
  };

  let options = DeflateOptions::default()
    .set_confirm_checksum(false)
    .set_limit(limit);

  let out = DeflateDecoder::new_with_options(data, options)
    .decode_zlib()
    .map_err(|_| crate::error::PngCompareError::new(
      DecompressionFailed,
      "failed to inflate IDAT stream",
    ))?;

  if out.len() > limit {
    return err(
      DecompressedSizeExceeded,
      "decompressed data exceeds size implied by image dimensions",
    );
  }

  Ok(out)
}

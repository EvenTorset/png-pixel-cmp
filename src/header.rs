use crate::error::{err, PngCompareErrorKind::*, Result};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Format {
  Gray(u8),
  GrayAlpha8,
  Rgb8,
  Rgba8,
  Indexed(u8),
}

impl Format {
  pub fn filter_bpp(self) -> usize {
    match self {
      Format::Gray(_) | Format::Indexed(_) => 1,
      Format::GrayAlpha8 => 2,
      Format::Rgb8 => 3,
      Format::Rgba8 => 4,
    }
  }

  pub fn row_stride(self, width: usize) -> usize {
    match self {
      Format::Gray(depth) | Format::Indexed(depth) => width.div_ceil(8 / depth as usize),
      Format::GrayAlpha8 => width * 2,
      Format::Rgb8 => width * 3,
      Format::Rgba8 => width * 4,
    }
  }
}

#[derive(Debug, Clone, Copy)]
pub struct Header {
  pub width: usize,
  pub height: usize,
  pub format: Format,
}

pub fn parse_header(data: &[u8]) -> Result<Header> {
  if data.len() != 13 {
    return err(InvalidChunkLayout, "IHDR chunk must be 13 bytes");
  }

  let width = u32::from_be_bytes([data[0], data[1], data[2], data[3]]) as usize;
  let height = u32::from_be_bytes([data[4], data[5], data[6], data[7]]) as usize;
  if width == 0 || height == 0 {
    return err(InvalidChunkLayout, "width and height must be non-zero");
  }

  let bit_depth = data[8];
  let color_type = data[9];
  let compression = data[10];
  let filter_method = data[11];
  let interlace = data[12];

  if compression != 0 {
    return err(
      UnsupportedCompressionMethod,
      format!("unsupported PNG compression method {compression}"),
    );
  }
  if filter_method != 0 {
    return err(
      UnsupportedFilterMethod,
      format!("unsupported PNG filter method {filter_method}"),
    );
  }

  let format = match (color_type, bit_depth, interlace) {
    (3, 1 | 2 | 4 | 8, 0) => Format::Indexed(bit_depth),
    (0, 1 | 2 | 4 | 8, 0) => Format::Gray(bit_depth),
    (4, 8, 0) => Format::GrayAlpha8,
    (2, 8, 0) => Format::Rgb8,
    (6, 8, 0) => Format::Rgba8,
    _ => {
      return err(
        UnsupportedFormat,
        format!(
          "unsupported PNG format (colorType={color_type}, bitDepth={bit_depth}, interlace={interlace})"
        ),
      )
    }
  };

  Ok(Header { width, height, format })
}

use core::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PngCompareErrorKind {
  InvalidSignature,
  Truncated,
  InvalidChunkLayout,
  MissingIhdr,
  MissingIdat,
  MissingPalette,
  InvalidPalette,
  InvalidFilterType,
  UnsupportedCompressionMethod,
  UnsupportedFilterMethod,
  UnsupportedFormat,
  DecompressionFailed,
  DecompressedSizeExceeded,
}

impl PngCompareErrorKind {
  pub fn as_str(self) -> &'static str {
    match self {
      Self::InvalidSignature => "InvalidSignature",
      Self::Truncated => "Truncated",
      Self::InvalidChunkLayout => "InvalidChunkLayout",
      Self::MissingIhdr => "MissingIhdr",
      Self::MissingIdat => "MissingIdat",
      Self::MissingPalette => "MissingPalette",
      Self::InvalidPalette => "InvalidPalette",
      Self::InvalidFilterType => "InvalidFilterType",
      Self::UnsupportedCompressionMethod => "UnsupportedCompressionMethod",
      Self::UnsupportedFilterMethod => "UnsupportedFilterMethod",
      Self::UnsupportedFormat => "UnsupportedFormat",
      Self::DecompressionFailed => "DecompressionFailed",
      Self::DecompressedSizeExceeded => "DecompressedSizeExceeded",
    }
  }
}

impl fmt::Display for PngCompareErrorKind {
  fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
    f.write_str(self.as_str())
  }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PngCompareError {
  pub kind: PngCompareErrorKind,
  pub message: String,
}

impl PngCompareError {
  pub(crate) fn new(kind: PngCompareErrorKind, message: impl Into<String>) -> Self {
    Self { kind, message: message.into() }
  }

  /// Prefixes the message with which of the two images it came from.
  pub(crate) fn labelled(mut self, image: &str) -> Self {
    self.message = format!("image {image}: {}", self.message);
    self
  }
}

impl fmt::Display for PngCompareError {
  fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
    f.write_str(&self.message)
  }
}

impl std::error::Error for PngCompareError {}

pub type Result<T> = core::result::Result<T, PngCompareError>;

pub(crate) fn err<T>(kind: PngCompareErrorKind, message: impl Into<String>) -> Result<T> {
  Err(PngCompareError::new(kind, message))
}

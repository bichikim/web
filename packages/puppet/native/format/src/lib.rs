//! The Poffo model format (`winter-love-poffo` v1; `winter-love-puppet` documents still read).
//!
//! - [`PoffoFile`] holds a document's JSON value tree, read from JSON or from a web-written
//!   `.poffo` file (see [`container`]).
//! - [`PoffoFile::document`] parses and validates the typed [`Document`] the runtime plays.
//!
//! Writing files is the web's job; this crate only reads them.

pub mod base64;
pub mod container;
pub mod document;
mod error;
mod file;
#[cfg(feature = "png")]
pub mod image;
pub mod js_number;
mod texture;
mod validate;

pub use document::Document;
pub use error::FormatError;
pub use file::PoffoFile;
pub use texture::TextureSource;
pub use validate::references_api::resolve_parameter_value;
pub use validate::{ValidDocument, validate};

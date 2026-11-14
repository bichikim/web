//! Texture `src` interpretation.

use crate::base64;

/// Where a part's image comes from.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TextureSource {
    /// A base64 `data:` URL, already decoded.
    Embedded { mime: String, bytes: Vec<u8> },
    /// Anything else, e.g. a path relative to the document.
    External(String),
}

/// Splits `data:<mime>;base64,<payload>` into its MIME type and payload.
pub(crate) fn split_data_url(src: &str) -> Option<(&str, &str)> {
    let rest = src.strip_prefix("data:")?;
    let (mime, payload) = rest.split_once(";base64,")?;
    (!mime.contains(',')).then_some((mime, payload))
}

impl TextureSource {
    pub fn parse(src: &str) -> Self {
        match split_data_url(src).and_then(|(mime, payload)| Some((mime, base64::decode(payload)?)))
        {
            Some((mime, bytes)) => Self::Embedded {
                mime: mime.to_owned(),
                bytes,
            },
            None => Self::External(src.to_owned()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decodes_data_urls_and_keeps_paths() {
        assert_eq!(
            TextureSource::parse("data:image/png;base64,TWFu"),
            TextureSource::Embedded {
                mime: "image/png".into(),
                bytes: b"Man".to_vec()
            }
        );
        assert_eq!(
            TextureSource::parse("textures/a.png"),
            TextureSource::External("textures/a.png".into())
        );
        assert!(matches!(
            TextureSource::parse("data:image/png,raw"),
            TextureSource::External(_)
        ));
    }
}

//! A loaded document in either encoding, convertible without loss.

use std::collections::HashMap;
use std::sync::Arc;

use serde_json::{Map, Value};

use crate::document::{DOCUMENT_FORMAT, Document, LEGACY_DOCUMENT_FORMATS, Part};
use crate::error::FormatError;
use crate::validate::ValidDocument;
use crate::{container, js_number};

const UTF8_BOM: &[u8] = b"\xEF\xBB\xBF";

/// The document's JSON value tree, including editor-only fields the runtime ignores.
#[derive(Debug, Clone, PartialEq)]
pub struct PoffoFile {
    value: Value,
}

impl PoffoFile {
    /// Holds `value`, renaming an earlier format name to [`DOCUMENT_FORMAT`] so the document
    /// reads under the current name (`parseDocumentValue`).
    pub fn from_value(mut value: Value) -> Self {
        if let Some(format) = value.get_mut("format")
            && format
                .as_str()
                .is_some_and(|name| LEGACY_DOCUMENT_FORMATS.contains(&name))
        {
            *format = Value::from(DOCUMENT_FORMAT);
        }
        Self { value }
    }

    /// Reads JSON text, ignoring a leading UTF-8 byte order mark as the web player does.
    pub fn from_json(bytes: &[u8]) -> Result<Self, FormatError> {
        let bytes = bytes.strip_prefix(UTF8_BOM).unwrap_or(bytes);
        serde_json::from_slice(bytes)
            .map(Self::from_value)
            .map_err(FormatError::Json)
    }

    /// Reads a web-written `.poffo` file ([`container`]).
    pub fn from_container(bytes: &[u8]) -> Result<Self, FormatError> {
        container::decode(bytes).map(Self::from_value)
    }

    /// Detects the format from the content, as the web does: a `.poffo` file by its magic
    /// number, anything else as JSON. Files in the earlier SDK-only binary encoding are
    /// [`FormatError::LegacyBinary`].
    pub fn from_bytes(bytes: &[u8]) -> Result<Self, FormatError> {
        if container::is_container(bytes) {
            Self::from_container(bytes)
        } else if container::is_legacy_binary(bytes) {
            Err(FormatError::LegacyBinary)
        } else {
            Self::from_json(bytes)
        }
    }

    pub fn value(&self) -> &Value {
        &self.value
    }

    pub fn into_value(self) -> Value {
        self.value
    }

    /// Parses and validates the playable document (`parseDocumentValue`).
    ///
    /// Numbers are read as JavaScript numbers ([`js_number::canonicalize`]), so JSON and
    /// `.poffo` files of a document validate alike: `1.0` is the integer 1 and `-0.0` is 0.
    pub fn document(&self) -> Result<ValidDocument, FormatError> {
        self.clone().into_document()
    }

    /// [`Self::document`] that consumes the file, so the document reuses its strings instead
    /// of copying them: embedded textures make up most of a large document.
    pub fn into_document(self) -> Result<ValidDocument, FormatError> {
        let mut value = self.value;
        js_number::canonicalize_in_place(&mut value);
        let assets = TextureAssets::take(&mut value)?;
        let mut document: Document =
            serde_json::from_value(normalize_legacy_tracks(value)).map_err(FormatError::Schema)?;
        assets.resolve(&mut document.parts);
        ValidDocument::new(document)
    }
}

/// `textureAssets` taken out of a document value, and the parts that reference them.
///
/// Parts share one string per asset ([`Arc<str>`]) instead of a copy each: an atlas data URL
/// used by thousands of parts would otherwise be copied thousands of times.
#[derive(Debug, Default)]
struct TextureAssets {
    sources: HashMap<String, Arc<str>>,
    /// `(part index, asset id)`, each id present in `sources`.
    uses: Vec<(usize, String)>,
}

impl TextureAssets {
    /// Removes `textureAssets` and each part's `texture.assetId` from `value`, leaving an empty
    /// `src` for [`Self::resolve`] to fill (`expandDocumentTextureAssets`).
    fn take(value: &mut Value) -> Result<Self, FormatError> {
        let Some(object) = value.as_object_mut() else {
            return Ok(Self::default());
        };
        let Some(assets) = object.remove("textureAssets") else {
            return Ok(Self::default());
        };
        let invalid_assets =
            || FormatError::invalid("textureAssets", "must map ids to non-empty strings");
        let Value::Object(assets) = assets else {
            return Err(invalid_assets());
        };
        let sources = assets
            .into_iter()
            .map(|(id, source)| match source {
                Value::String(source) if !source.is_empty() => Ok((id, Arc::from(source))),
                _ => Err(invalid_assets()),
            })
            .collect::<Result<HashMap<_, _>, _>>()?;
        let Some(Value::Array(parts)) = object.get_mut("parts") else {
            return Err(FormatError::invalid("parts", "missing"));
        };
        let mut uses = Vec::new();
        for (index, part) in parts.iter_mut().enumerate() {
            let Some(texture) = part.get_mut("texture").and_then(Value::as_object_mut) else {
                continue;
            };
            let Some(asset_id) = texture.remove("assetId") else {
                continue;
            };
            let id = asset_id
                .as_str()
                .filter(|id| !texture.contains_key("src") && sources.contains_key(*id))
                .ok_or_else(|| {
                    FormatError::invalid(
                        format!("parts[{index}].texture.assetId"),
                        "unknown texture asset",
                    )
                })?;
            uses.push((index, id.to_owned()));
            texture.insert("src".into(), Value::String(String::new()));
        }
        Ok(Self { sources, uses })
    }

    fn resolve(&self, parts: &mut [Part]) {
        for (index, id) in &self.uses {
            if let (Some(part), Some(source)) = (parts.get_mut(*index), self.sources.get(id)) {
                part.texture.src = Arc::clone(source);
            }
        }
    }
}

fn has_parameter_target(track: &Map<String, Value>) -> bool {
    track
        .get("parameterId")
        .and_then(Value::as_str)
        .is_some_and(|s| !s.is_empty())
}

fn has_vertex_target(track: &Map<String, Value>) -> bool {
    track
        .get("partId")
        .and_then(Value::as_str)
        .is_some_and(|s| !s.is_empty())
        && track.get("vertexIndex").and_then(Value::as_u64).is_some()
        && matches!(track.get("axis").and_then(Value::as_str), Some("x" | "y"))
}

/// Adds the `kind` that older documents omitted from motion tracks.
fn normalize_legacy_tracks(mut value: Value) -> Value {
    let motions = value.get_mut("motions").and_then(Value::as_array_mut);
    for motion in motions.into_iter().flatten() {
        let tracks = motion.get_mut("tracks").and_then(Value::as_array_mut);
        for track in tracks.into_iter().flatten() {
            if let Some(map) = track.as_object_mut().filter(|m| !m.contains_key("kind")) {
                let (parameter, vertex) = (has_parameter_target(map), has_vertex_target(map));
                if parameter != vertex {
                    map.insert(
                        "kind".into(),
                        Value::from(if parameter { "parameter" } else { "vertex" }),
                    );
                }
            }
        }
    }
    value
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn valid_documents_only_come_from_validation() {
        let base = json!({"format": "winter-love-puppet", "version": 1,
            "viewport": {"width": 1, "height": 1}, "parts": [], "motions": []});
        let mut empty_pose = base.clone();
        empty_pose["poseGroups"] = json!([{"id": "g", "parameterId": "p", "entries": []}]);
        let typed: Document = serde_json::from_value(empty_pose.clone()).expect("schema");
        assert!(ValidDocument::new(typed).is_err());
        assert!(PoffoFile::from_value(empty_pose).document().is_err());
        assert!(PoffoFile::from_value(base).document().is_ok());
    }

    #[test]
    fn expands_texture_assets_and_legacy_tracks() {
        let mut value = json!({
            "textureAssets": {"t0": "data:image/png;base64,TWFu"},
            "parts": [{"texture": {"assetId": "t0", "width": 1, "height": 1}}],
            "motions": [{"tracks": [{"parameterId": "p", "keyframes": []}]}]
        });
        let assets = TextureAssets::take(&mut value).expect("assets");
        assert_eq!(assets.uses, [(0, "t0".to_owned())]);
        assert_eq!(&*assets.sources["t0"], "data:image/png;base64,TWFu");
        let expanded = normalize_legacy_tracks(value);
        assert_eq!(expanded["motions"][0]["tracks"][0]["kind"], "parameter");
        let mut missing = json!({"textureAssets": {}, "parts": [{"texture": {"assetId": "x"}}]});
        assert!(TextureAssets::take(&mut missing).is_err());
    }

    #[test]
    fn parts_share_one_copy_of_a_texture_asset() {
        let part = |id: &str| {
            json!({"id": id, "mesh": {"vertices": [0, 0, 1, 0, 0, 1], "uvs": [0, 0, 1, 0, 0, 1],
                "indices": [0, 1, 2]}, "texture": {"assetId": "atlas", "width": 1, "height": 1}})
        };
        let file = PoffoFile::from_value(json!({"format": "winter-love-poffo", "version": 1,
            "viewport": {"width": 1, "height": 1}, "motions": [],
            "textureAssets": {"atlas": "data:image/png;base64,TWFu"},
            "parts": [part("a"), part("b")]}));
        let document = file.document().expect("valid");
        let [a, b] = [
            &document.parts[0].texture.src,
            &document.parts[1].texture.src,
        ];
        assert_eq!(&**a, "data:image/png;base64,TWFu");
        assert!(Arc::ptr_eq(a, b));
    }

    #[test]
    fn json_may_start_with_a_byte_order_mark() {
        let json = b"\xEF\xBB\xBF{\"format\": \"winter-love-poffo\", \"version\": 1,
            \"viewport\": {\"width\": 1, \"height\": 1}, \"parts\": [], \"motions\": []}";
        let file = PoffoFile::from_bytes(json).expect("json with a BOM");
        assert!(file.into_document().is_ok());
    }

    #[test]
    fn integral_floats_read_as_javascript_numbers() {
        // `1.0` is the JavaScript number 1, as a web-written `.poffo` file stores it.
        let json = br#"{"format": "winter-love-poffo", "version": 1.0, "framesPerSecond": 30.0,
            "viewport": {"width": 1, "height": 1}, "parts": [], "motions": []}"#;
        let file = PoffoFile::from_json(json).expect("json");
        assert!(file.document().is_ok());
    }

    #[test]
    fn the_earlier_sdk_binary_encoding_is_no_longer_read() {
        assert!(matches!(
            PoffoFile::from_bytes(b"POFO\x01\x00\x00\x00"),
            Err(FormatError::LegacyBinary)
        ));
    }

    #[test]
    fn earlier_format_names_read_as_the_current_one() {
        let document = |format: &str| {
            json!({"format": format, "version": 1, "viewport": {"width": 1, "height": 1},
                "parts": [], "motions": []})
        };
        let legacy = PoffoFile::from_value(document("winter-love-puppet"));
        assert_eq!(legacy.value()["format"], DOCUMENT_FORMAT);
        assert_eq!(legacy.document().expect("valid").format, DOCUMENT_FORMAT);
        assert!(
            PoffoFile::from_value(document("winter-love"))
                .document()
                .is_err()
        );
    }
}

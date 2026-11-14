/// Failures while reading, converting or validating a Poffo document.
#[derive(Debug, thiserror::Error)]
pub enum FormatError {
    #[error("document is not valid JSON")]
    Json(#[source] serde_json::Error),
    #[error("invalid .poffo file: {0}")]
    Container(&'static str),
    #[error("this .poffo file uses the earlier SDK-only encoding; export it again from the web")]
    LegacyBinary,
    #[error("document does not match the Poffo schema")]
    Schema(#[source] serde_json::Error),
    #[error("invalid document at {path}: {reason}")]
    Invalid { path: String, reason: String },
}

impl FormatError {
    pub(crate) fn invalid(path: impl Into<String>, reason: impl Into<String>) -> Self {
        Self::Invalid {
            path: path.into(),
            reason: reason.into(),
        }
    }
}

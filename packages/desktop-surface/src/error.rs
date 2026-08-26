use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub(crate) enum Error {
    #[error("control surface path must be an application-local path")]
    InvalidPath,
    #[error("control surface position requires both x and y")]
    InvalidPosition,
    #[error("control surface size must be finite and greater than zero")]
    InvalidSize,
    #[error("surface label must not be empty")]
    InvalidLabel,
    #[error("window '{0}' is not an active background surface")]
    NotBackgroundSurface(String),
    #[cfg(not(target_os = "macos"))]
    #[error("desktop surfaces are not supported on {0}")]
    UnsupportedPlatform(&'static str),
    #[error("webview window '{0}' was not found")]
    WindowNotFound(String),
    #[error("native window operation failed: {0}")]
    WindowOperation(String),
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CommandError {
    code: &'static str,
    message: String,
}

impl From<Error> for CommandError {
    fn from(error: Error) -> Self {
        let code = match error {
            Error::InvalidLabel
            | Error::InvalidPath
            | Error::InvalidPosition
            | Error::InvalidSize => "invalid-configuration",
            Error::NotBackgroundSurface(_) => "invalid-surface-state",
            #[cfg(not(target_os = "macos"))]
            Error::UnsupportedPlatform(_) => "unsupported-platform",
            Error::WindowNotFound(_) => "window-not-found",
            Error::WindowOperation(_) => "window-operation-failed",
        };

        Self {
            code,
            message: error.to_string(),
        }
    }
}

impl From<tauri::Error> for Error {
    fn from(error: tauri::Error) -> Self {
        Self::WindowOperation(error.to_string())
    }
}

impl From<tauri::Error> for CommandError {
    fn from(error: tauri::Error) -> Self {
        Error::from(error).into()
    }
}

pub(crate) type Result<T> = std::result::Result<T, Error>;

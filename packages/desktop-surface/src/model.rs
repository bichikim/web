use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::error::{Error, Result};

const DEFAULT_CONTROL_HEIGHT: f64 = 240.0;
const DEFAULT_CONTROL_WIDTH: f64 = 420.0;
const DEFAULT_WIDGET_HEIGHT: f64 = 520.0;
const DEFAULT_WIDGET_WIDTH: f64 = 420.0;

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) enum BackgroundInteraction {
    Interactive,
    PassThrough,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct BackgroundInteractionOptions {
    pub(crate) interaction: BackgroundInteraction,
    pub(crate) label: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct BackgroundSurfaceOptions {
    pub(crate) interaction: Option<BackgroundInteraction>,
    pub(crate) label: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ControlSurfaceOptions {
    pub(crate) height: Option<f64>,
    pub(crate) label: String,
    pub(crate) path: String,
    pub(crate) width: Option<f64>,
    pub(crate) x: Option<f64>,
    pub(crate) y: Option<f64>,
}

#[derive(Clone, Debug, PartialEq)]
pub(crate) struct ValidatedControlSurface {
    pub(crate) height: f64,
    pub(crate) label: String,
    pub(crate) path: PathBuf,
    pub(crate) width: f64,
    pub(crate) position: Option<(f64, f64)>,
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ControlSurfaceStatus {
    pub(crate) created: bool,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WidgetSurfaceOptions {
    pub(crate) height: Option<f64>,
    pub(crate) label: String,
    pub(crate) width: Option<f64>,
}

#[derive(Clone, Debug, PartialEq)]
pub(crate) struct ValidatedWidgetSurface {
    pub(crate) height: f64,
    pub(crate) label: String,
    pub(crate) width: f64,
}

pub(crate) fn validate_label(label: String) -> Result<String> {
    let label = label.trim();

    if label.is_empty() {
        return Err(Error::InvalidLabel);
    }

    Ok(label.to_owned())
}

impl TryFrom<ControlSurfaceOptions> for ValidatedControlSurface {
    type Error = Error;

    fn try_from(options: ControlSurfaceOptions) -> Result<Self> {
        let label = validate_label(options.label)?;
        let path = options.path.trim().trim_start_matches('/');

        if path.is_empty()
            || path.contains("://")
            || PathBuf::from(path)
                .components()
                .any(|component| matches!(component, std::path::Component::ParentDir))
        {
            return Err(Error::InvalidPath);
        }

        let width = options.width.unwrap_or(DEFAULT_CONTROL_WIDTH);
        let height = options.height.unwrap_or(DEFAULT_CONTROL_HEIGHT);

        if !width.is_finite() || !height.is_finite() || width <= 0.0 || height <= 0.0 {
            return Err(Error::InvalidSize);
        }

        let position = match (options.x, options.y) {
            (None, None) => None,
            (Some(x), Some(y)) if x.is_finite() && y.is_finite() => Some((x, y)),
            _ => return Err(Error::InvalidPosition),
        };

        Ok(Self {
            height,
            label,
            path: PathBuf::from(path),
            position,
            width,
        })
    }
}

impl TryFrom<WidgetSurfaceOptions> for ValidatedWidgetSurface {
    type Error = Error;

    fn try_from(options: WidgetSurfaceOptions) -> Result<Self> {
        let label = validate_label(options.label)?;
        let width = options.width.unwrap_or(DEFAULT_WIDGET_WIDTH);
        let height = options.height.unwrap_or(DEFAULT_WIDGET_HEIGHT);

        if !width.is_finite() || !height.is_finite() || width <= 0.0 || height <= 0.0 {
            return Err(Error::InvalidSize);
        }

        Ok(Self {
            height,
            label,
            width,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::{
        ControlSurfaceOptions, ValidatedControlSurface, ValidatedWidgetSurface,
        WidgetSurfaceOptions,
    };

    fn options() -> ControlSurfaceOptions {
        ControlSurfaceOptions {
            height: None,
            label: "controls".to_owned(),
            path: "/desktop/controls".to_owned(),
            width: None,
            x: None,
            y: None,
        }
    }

    #[test]
    fn should_apply_control_surface_defaults() {
        let surface = ValidatedControlSurface::try_from(options()).expect("valid options");

        assert_eq!(surface.width, 420.0);
        assert_eq!(surface.height, 240.0);
        assert_eq!(surface.path, std::path::PathBuf::from("desktop/controls"));
        assert_eq!(surface.position, None);
    }

    #[test]
    fn should_reject_external_and_parent_paths() {
        for path in ["https://example.com", "desktop/../admin", ""] {
            let mut value = options();
            value.path = path.to_owned();

            assert!(ValidatedControlSurface::try_from(value).is_err());
        }
    }

    #[test]
    fn should_require_a_complete_finite_position() {
        for (x, y) in [(Some(10.0), None), (Some(f64::NAN), Some(10.0))] {
            let mut value = options();
            value.x = x;
            value.y = y;

            assert!(ValidatedControlSurface::try_from(value).is_err());
        }
    }

    #[test]
    fn should_reject_invalid_size_and_label() {
        let mut invalid_size = options();
        invalid_size.width = Some(0.0);
        assert!(ValidatedControlSurface::try_from(invalid_size).is_err());

        let mut invalid_label = options();
        invalid_label.label = "  ".to_owned();
        assert!(ValidatedControlSurface::try_from(invalid_label).is_err());
    }

    #[test]
    fn should_validate_widget_surface_options() {
        let surface = ValidatedWidgetSurface::try_from(WidgetSurfaceOptions {
            height: None,
            label: "background".to_owned(),
            width: None,
        })
        .expect("valid widget options");

        assert_eq!(surface.width, 420.0);
        assert_eq!(surface.height, 520.0);

        assert!(
            ValidatedWidgetSurface::try_from(WidgetSurfaceOptions {
                height: Some(f64::NAN),
                label: "background".to_owned(),
                width: None,
            })
            .is_err()
        );
    }
}

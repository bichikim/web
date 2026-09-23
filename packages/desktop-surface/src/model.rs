use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::Url;

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
pub(crate) struct BackgroundNavigationOptions {
    pub(crate) label: String,
    pub(crate) url: String,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) enum BackgroundMouseEventKind {
    Down,
    Up,
    Dragged,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct BackgroundMouseEventOptions {
    pub(crate) alt_key: bool,
    pub(crate) button: u8,
    pub(crate) buttons: u16,
    pub(crate) click_count: u32,
    pub(crate) ctrl_key: bool,
    pub(crate) kind: BackgroundMouseEventKind,
    pub(crate) label: String,
    pub(crate) meta_key: bool,
    pub(crate) shift_key: bool,
    pub(crate) x: f64,
    pub(crate) y: f64,
}

#[derive(Clone, Debug, PartialEq)]
pub(crate) struct ValidatedBackgroundMouseEvent {
    pub(crate) alt_key: bool,
    pub(crate) button: u8,
    pub(crate) buttons: u16,
    pub(crate) click_count: u32,
    pub(crate) ctrl_key: bool,
    pub(crate) kind: BackgroundMouseEventKind,
    pub(crate) label: String,
    pub(crate) meta_key: bool,
    pub(crate) shift_key: bool,
    pub(crate) x: f64,
    pub(crate) y: f64,
}

#[derive(Clone, Debug, PartialEq)]
pub(crate) struct ValidatedBackgroundNavigation {
    pub(crate) label: String,
    pub(crate) url: Url,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ControlSurfaceOptions {
    pub(crate) corner_radius: Option<f64>,
    pub(crate) height: Option<f64>,
    pub(crate) label: String,
    pub(crate) path: String,
    pub(crate) width: Option<f64>,
    pub(crate) x: Option<f64>,
    pub(crate) y: Option<f64>,
}

#[derive(Clone, Debug, PartialEq)]
pub(crate) struct ValidatedControlSurface {
    pub(crate) corner_radius: Option<f64>,
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
    pub(crate) corner_radius: Option<f64>,
    pub(crate) height: Option<f64>,
    pub(crate) label: String,
    pub(crate) width: Option<f64>,
}

#[derive(Clone, Debug, PartialEq)]
pub(crate) struct ValidatedWidgetSurface {
    pub(crate) corner_radius: Option<f64>,
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

impl TryFrom<BackgroundNavigationOptions> for ValidatedBackgroundNavigation {
    type Error = Error;

    fn try_from(options: BackgroundNavigationOptions) -> Result<Self> {
        let label = validate_label(options.label)?;
        let url = Url::parse(options.url.trim()).map_err(|_| Error::InvalidUrl)?;

        if url.scheme() != "https" || url.host().is_none() {
            return Err(Error::InvalidUrl);
        }

        Ok(Self { label, url })
    }
}

impl TryFrom<BackgroundMouseEventOptions> for ValidatedBackgroundMouseEvent {
    type Error = Error;

    fn try_from(options: BackgroundMouseEventOptions) -> Result<Self> {
        let label = validate_label(options.label)?;

        if !options.x.is_finite() || !options.y.is_finite() || options.x < 0.0 || options.y < 0.0 {
            return Err(Error::InvalidMouseEvent);
        }

        if options.button > 2 || options.click_count == 0 {
            return Err(Error::InvalidMouseEvent);
        }

        Ok(Self {
            alt_key: options.alt_key,
            button: options.button,
            buttons: options.buttons,
            click_count: options.click_count,
            ctrl_key: options.ctrl_key,
            kind: options.kind,
            label,
            meta_key: options.meta_key,
            shift_key: options.shift_key,
            x: options.x,
            y: options.y,
        })
    }
}

impl TryFrom<ControlSurfaceOptions> for ValidatedControlSurface {
    type Error = Error;

    fn try_from(options: ControlSurfaceOptions) -> Result<Self> {
        let label = validate_label(options.label)?;
        let path = options.path.trim();

        if path.is_empty()
            || path.contains("://")
            || path.contains('\\')
            || PathBuf::from(path)
                .components()
                .any(|component| matches!(component, std::path::Component::ParentDir))
        {
            return Err(Error::InvalidPath);
        }
        let path = PathBuf::from(format!("/{}", path.trim_start_matches('/')));

        let width = options.width.unwrap_or(DEFAULT_CONTROL_WIDTH);
        let height = options.height.unwrap_or(DEFAULT_CONTROL_HEIGHT);

        let corner_radius = validate_corner_radius(options.corner_radius)?;

        if !width.is_finite() || !height.is_finite() || width <= 0.0 || height <= 0.0 {
            return Err(Error::InvalidSize);
        }

        let position = match (options.x, options.y) {
            (None, None) => None,
            (Some(x), Some(y)) if x.is_finite() && y.is_finite() => Some((x, y)),
            _ => return Err(Error::InvalidPosition),
        };

        Ok(Self {
            corner_radius,
            height,
            label,
            path,
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
        let corner_radius = validate_corner_radius(options.corner_radius)?;

        if !width.is_finite() || !height.is_finite() || width <= 0.0 || height <= 0.0 {
            return Err(Error::InvalidSize);
        }

        Ok(Self {
            corner_radius,
            height,
            label,
            width,
        })
    }
}

fn validate_corner_radius(corner_radius: Option<f64>) -> Result<Option<f64>> {
    corner_radius
        .map(|radius| {
            if radius.is_finite() && radius >= 0.0 {
                Ok(radius)
            } else {
                Err(Error::InvalidCornerRadius)
            }
        })
        .transpose()
}

#[cfg(test)]
mod tests {
    use super::{
        BackgroundMouseEventKind, BackgroundMouseEventOptions, BackgroundNavigationOptions,
        ControlSurfaceOptions, ValidatedBackgroundMouseEvent, ValidatedBackgroundNavigation,
        ValidatedControlSurface, ValidatedWidgetSurface, WidgetSurfaceOptions,
    };

    fn options() -> ControlSurfaceOptions {
        ControlSurfaceOptions {
            corner_radius: None,
            height: None,
            label: "controls".to_owned(),
            path: "/desktop/controls".to_owned(),
            width: None,
            x: None,
            y: None,
        }
    }

    fn background_mouse_event_options() -> BackgroundMouseEventOptions {
        BackgroundMouseEventOptions {
            alt_key: false,
            button: 0,
            buttons: 1,
            click_count: 1,
            ctrl_key: false,
            kind: BackgroundMouseEventKind::Down,
            label: "background".to_owned(),
            meta_key: false,
            shift_key: false,
            x: 120.0,
            y: 80.0,
        }
    }

    #[test]
    fn should_apply_control_surface_defaults() {
        let surface = ValidatedControlSurface::try_from(options()).expect("valid options");

        assert_eq!(surface.width, 420.0);
        assert_eq!(surface.height, 240.0);
        assert_eq!(surface.path, std::path::PathBuf::from("/desktop/controls"));
        assert_eq!(surface.position, None);
    }

    #[test]
    fn should_reject_external_and_parent_paths() {
        for path in [
            "https://example.com",
            "desktop/../admin",
            r"desktop\admin",
            "",
        ] {
            let mut value = options();
            value.path = path.to_owned();

            assert!(ValidatedControlSurface::try_from(value).is_err());
        }
    }

    #[test]
    fn should_resolve_control_surfaces_from_the_app_root() {
        let mut value = options();
        value.path = "desktop/controls".to_owned();

        let surface = ValidatedControlSurface::try_from(value).expect("valid options");

        assert_eq!(surface.path, std::path::PathBuf::from("/desktop/controls"));
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
    fn should_reject_invalid_corner_radius() {
        for radius in [Some(-1.0), Some(f64::NAN), Some(f64::INFINITY)] {
            let mut options = options();
            options.corner_radius = radius;

            assert!(ValidatedControlSurface::try_from(options).is_err());
        }
    }

    #[test]
    fn should_validate_widget_surface_options() {
        let surface = ValidatedWidgetSurface::try_from(WidgetSurfaceOptions {
            corner_radius: None,
            height: None,
            label: "background".to_owned(),
            width: None,
        })
        .expect("valid widget options");

        assert_eq!(surface.width, 420.0);
        assert_eq!(surface.height, 520.0);
        assert_eq!(surface.corner_radius, None);

        assert!(
            ValidatedWidgetSurface::try_from(WidgetSurfaceOptions {
                corner_radius: None,
                height: Some(f64::NAN),
                label: "background".to_owned(),
                width: None,
            })
            .is_err()
        );
    }

    #[test]
    fn should_reject_invalid_widget_corner_radius() {
        for radius in [Some(-1.0), Some(f64::NAN), Some(f64::INFINITY)] {
            let options = WidgetSurfaceOptions {
                corner_radius: radius,
                height: None,
                label: "background".to_owned(),
                width: None,
            };

            assert!(ValidatedWidgetSurface::try_from(options).is_err());
        }
    }

    #[test]
    fn should_validate_https_background_navigation_urls() {
        let navigation = ValidatedBackgroundNavigation::try_from(BackgroundNavigationOptions {
            label: " background ".to_owned(),
            url: " https://example.com/path ".to_owned(),
        })
        .expect("valid background URL");

        assert_eq!(navigation.label, "background");
        assert_eq!(navigation.url.as_str(), "https://example.com/path");
    }

    #[test]
    fn should_reject_non_https_background_navigation_urls() {
        for url in [
            "http://example.com",
            "javascript:alert(1)",
            "not a URL",
            "https://",
        ] {
            assert!(
                ValidatedBackgroundNavigation::try_from(BackgroundNavigationOptions {
                    label: "background".to_owned(),
                    url: url.to_owned(),
                })
                .is_err()
            );
        }
    }

    #[test]
    fn should_validate_background_mouse_event_coordinates() {
        let mut valid_options = background_mouse_event_options();
        valid_options.label = " background ".to_owned();
        let event = ValidatedBackgroundMouseEvent::try_from(valid_options)
            .expect("valid background mouse event");

        assert_eq!(event.label, "background");

        for (x, y) in [(f64::NAN, 80.0), (120.0, f64::INFINITY), (-1.0, 80.0)] {
            let mut invalid = background_mouse_event_options();
            invalid.x = x;
            invalid.y = y;

            assert!(ValidatedBackgroundMouseEvent::try_from(invalid).is_err());
        }
    }
}

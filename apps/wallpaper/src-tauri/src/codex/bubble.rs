use serde::{Deserialize, Serialize};

#[cfg(target_os = "macos")]
mod frame;
mod placement;
mod window;

pub use window::{close, emit_target, position, resize, synchronize, target};

pub const POSITION_EVENT: &str = "poffo-speech-target";

#[derive(Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Anchor {
    Top,
    Bottom,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Target {
    visible: bool,
    position_x: f64,
    position_y: f64,
    widget_width: f64,
    widget_height: f64,
    anchor: Anchor,
    x: f64,
    y: f64,
    max_height: f64,
    inset_top: f64,
    inset_bottom: f64,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Speech {
    #[serde(default)]
    pub anchor: Option<Anchor>,
    pub enabled: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub show_character: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub show_codex: Option<bool>,
    pub x: f64,
    pub y: f64,
}
impl Default for Speech {
    fn default() -> Self {
        Self {
            anchor: None,
            enabled: true,
            show_character: None,
            show_codex: None,
            x: 0.9,
            y: 0.05,
        }
    }
}

impl Speech {
    pub fn codex_visible(&self) -> bool {
        self.enabled && self.show_codex != Some(false)
    }

    fn visible(&self) -> bool {
        self.enabled && (self.show_character != Some(false) || self.show_codex != Some(false))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn legacy_settings_show_both_bubble_types() {
        let speech: Speech = serde_json::from_value(serde_json::json!({
            "enabled": true, "x": 0.9, "y": 0.05
        }))
        .unwrap();
        assert!(speech.visible());
        assert!(speech.codex_visible());
    }

    #[test]
    fn character_only_bubbles_do_not_receive_codex_permissions() {
        let speech: Speech = serde_json::from_value(serde_json::json!({
            "enabled": true, "showCharacter": true, "showCodex": false, "x": 0.9, "y": 0.05
        }))
        .unwrap();
        assert!(speech.visible());
        assert!(!speech.codex_visible());
    }

    #[test]
    fn disabling_both_types_hides_the_native_bubble_window() {
        let speech: Speech = serde_json::from_value(serde_json::json!({
            "enabled": true, "showCharacter": false, "showCodex": false, "x": 0.9, "y": 0.05
        }))
        .unwrap();
        assert!(!speech.visible());
        assert!(!speech.codex_visible());
        assert!(
            !Speech {
                enabled: false,
                ..Speech::default()
            }
            .visible()
        );
    }
}

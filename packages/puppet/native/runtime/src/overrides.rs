//! Render values an app sets on parts and scene groups while the model plays
//! (`player/internal/render-overrides.ts`).

use std::collections::HashMap;

/// Values replacing what the document and motions give a part or scene group (Cubism's part
/// opacity, multiply/screen color and culling overrides); `None` is not overridden.
#[derive(Debug, Clone, Copy, Default, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct RenderOverride {
    /// Parts only.
    pub culling: Option<bool>,
    pub multiply_color: Option<[f64; 3]>,
    /// The node's own opacity; children and the model opacity still multiply it.
    pub opacity: Option<f64>,
    pub screen_color: Option<[f64; 3]>,
}

fn unit(value: f64) -> f64 {
    if value.is_finite() {
        value.clamp(0.0, 1.0)
    } else {
        0.0
    }
}

impl RenderOverride {
    /// `normalizeRenderOverride`: opacity and colors within `0..=1`; `None` when it sets nothing.
    pub fn normalized(self) -> Option<Self> {
        let normalized = Self {
            culling: self.culling,
            multiply_color: self.multiply_color.map(|c| c.map(unit)),
            opacity: self.opacity.map(unit),
            screen_color: self.screen_color.map(|c| c.map(unit)),
        };
        (normalized != Self::default()).then_some(normalized)
    }
}

/// Overrides by part index and by scene container index.
#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub(crate) struct RenderOverrides {
    pub(crate) parts: HashMap<usize, RenderOverride>,
    pub(crate) groups: HashMap<usize, RenderOverride>,
}

impl RenderOverrides {
    /// `getOverrideColor`: the color set on the part or layer itself, else on the nearest
    /// ancestor group, searching outward up to (not into) the nearest offscreen ancestor.
    pub(crate) fn color(
        &self,
        own: Option<&RenderOverride>,
        ancestors: &[usize],
        offscreen: impl Fn(usize) -> bool,
        pick: impl Fn(&RenderOverride) -> Option<[f64; 3]>,
    ) -> Option<[f64; 3]> {
        if let Some(color) = own.and_then(&pick) {
            return Some(color);
        }
        for &group in ancestors.iter().rev() {
            if offscreen(group) {
                return None;
            }
            if let Some(color) = self.groups.get(&group).and_then(&pick) {
                return Some(color);
            }
        }
        None
    }
}

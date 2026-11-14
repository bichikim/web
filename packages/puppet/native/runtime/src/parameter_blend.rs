//! App blends applied to parameter values after motions and expressions
//! (`player/parameter-blends.ts`; Cubism's parameter operations).

use poffo_format::document::Parameter;

/// How the app's value meets the parameter's value (`PuppetParameterBlendMode`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum ParameterBlendMode {
    Add,
    Multiply,
    Overwrite,
}

/// `PuppetParameterBlend`: `weight` is the share of the operation, `0..=1`.
#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct ParameterBlend {
    pub mode: ParameterBlendMode,
    pub value: f64,
    pub weight: f64,
}

impl ParameterBlend {
    /// `normalizeParameterBlend`: the weight limited to `0..=1`; `None` for non-finite numbers.
    pub fn normalized(self) -> Option<Self> {
        (self.value.is_finite() && self.weight.is_finite()).then(|| Self {
            weight: self.weight.clamp(0.0, 1.0),
            ..self
        })
    }

    /// `blendParameterValue`: `current` after the blend, before range limits.
    pub fn apply(&self, current: f64) -> f64 {
        match self.mode {
            ParameterBlendMode::Add => current + self.value * self.weight,
            ParameterBlendMode::Multiply => current * (1.0 + (self.value - 1.0) * self.weight),
            ParameterBlendMode::Overwrite => current + (self.value - current) * self.weight,
        }
    }
}

/// `applyParameterBlends`: each parameter's blend, within its range, indexed like `parameters`.
pub(crate) fn apply_parameter_blends(
    parameters: &[Parameter],
    blends: &[Option<ParameterBlend>],
    values: &mut [f64],
) {
    for ((parameter, blend), value) in parameters.iter().zip(blends).zip(values.iter_mut()) {
        if let Some(blend) = blend {
            *value = poffo_format::resolve_parameter_value(parameter, Some(blend.apply(*value)));
        }
    }
}

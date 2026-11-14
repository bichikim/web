//! Where the model looks (`player/look.ts`) and the look point plus breathing a player adds after
//! motions and before physics (`player/internal/look-and-breath.ts`).

use poffo_format::document::Document;

use crate::effects::apply_breath;

/// Units per second the look point moves at most.
pub const LOOK_MAXIMUM_SPEED: f64 = 4.0;
/// Seconds to reach the maximum speed from rest; braking uses the same acceleration.
pub const LOOK_TIME_TO_MAXIMUM_SPEED: f64 = 0.15;
const ACCELERATION: f64 = LOOK_MAXIMUM_SPEED / LOOK_TIME_TO_MAXIMUM_SPEED;

/// The look point, `-1..=1` on each axis (x right, y up), and its velocity.
#[derive(Debug, Clone, Copy, Default, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct LookPoint {
    pub x: f64,
    pub y: f64,
    pub vx: f64,
    pub vy: f64,
}

fn length(x: f64, y: f64) -> f64 {
    (x * x + y * y).sqrt()
}

fn clamp_axis(value: f64) -> f64 {
    if value.is_finite() {
        value.clamp(-1.0, 1.0)
    } else {
        0.0
    }
}

/// `clampLookTarget`: within `-1..=1` on each axis; the center when there is none.
pub fn clamp_look_target(target: Option<[f64; 2]>) -> [f64; 2] {
    target.map_or([0.0, 0.0], |[x, y]| [clamp_axis(x), clamp_axis(y)])
}

/// `advanceLookPoint`: toward `target` for `delta_time` seconds with limited speed and
/// acceleration, slowing so it stops on the target.
pub fn advance_look_point(point: LookPoint, [tx, ty]: [f64; 2], delta_time: f64) -> LookPoint {
    if delta_time.is_nan() || delta_time <= 0.0 {
        return point;
    }
    let (dx, dy) = (tx - point.x, ty - point.y);
    let distance = length(dx, dy);
    let rest = LookPoint {
        x: tx,
        y: ty,
        vx: 0.0,
        vy: 0.0,
    };
    if distance == 0.0 {
        return rest;
    }
    let speed = LOOK_MAXIMUM_SPEED.min((2.0 * ACCELERATION * distance).sqrt());
    let (ax, ay) = (
        dx / distance * speed - point.vx,
        dy / distance * speed - point.vy,
    );
    let change = length(ax, ay);
    let limit = ACCELERATION * delta_time;
    let scale = if change > limit { limit / change } else { 1.0 };
    let (vx, vy) = (point.vx + ax * scale, point.vy + ay * scale);
    if length(vx, vy) * delta_time >= distance {
        rest
    } else {
        LookPoint {
            x: point.x + vx * delta_time,
            y: point.y + vy * delta_time,
            vx,
            vy,
        }
    }
}

/// `applyLook`: adds `x · X + y · Y + xy · X · Y` for the look point to each look parameter,
/// within its range.
pub(crate) fn apply_look(
    document: &Document,
    parameter: impl Fn(&str) -> Option<usize>,
    values: &mut [f64],
    [x, y]: [f64; 2],
) {
    for look in &document.look {
        let Some(index) = parameter(&look.parameter_id) else {
            continue;
        };
        if let (Some(definition), Some(value)) =
            (document.parameters.get(index), values.get_mut(index))
        {
            let added = look.x * x + look.y * y + look.xy * x * y;
            *value = poffo_format::resolve_parameter_value(definition, Some(*value + added));
        }
    }
}

/// The look point and breathing of a player (`createLookAndBreath`).
#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub(crate) struct LookAndBreath {
    /// Seconds since breathing started; `None` while it is off.
    breath: Option<f64>,
    target: [f64; 2],
    point: LookPoint,
}

impl LookAndBreath {
    /// Advances `delta` seconds and adds look, then breath (Cubism's update order).
    pub(crate) fn apply(
        &mut self,
        document: &Document,
        parameter: impl Fn(&str) -> Option<usize> + Copy,
        values: &mut [f64],
        delta: f64,
    ) {
        self.breath = self.breath.map(|time| time + delta);
        self.point = advance_look_point(self.point, self.target, delta);
        if !document.look.is_empty() {
            apply_look(document, parameter, values, [self.point.x, self.point.y]);
        }
        if let Some(time) = self.breath {
            apply_breath(document, parameter, values, time);
        }
    }

    pub(crate) fn is_animating(&self, document: &Document) -> bool {
        let settled = self.point
            == LookPoint {
                x: self.target[0],
                y: self.target[1],
                vx: 0.0,
                vy: 0.0,
            };
        (self.breath.is_some() && !document.breath.is_empty())
            || (!document.look.is_empty() && !settled)
    }

    /// Returns whether breathing switched; turning it on starts the waves from 0 seconds.
    pub(crate) fn set_breath(&mut self, enabled: bool) -> bool {
        if enabled == self.breath.is_some() {
            return false;
        }
        self.breath = enabled.then_some(0.0);
        true
    }

    pub(crate) fn set_look_target(&mut self, target: Option<[f64; 2]>) {
        self.target = clamp_look_target(target);
    }
}

//! Damped pendulums from input to output parameters (`player/physics.ts`,
//! `player/internal/physics.ts`).

use poffo_format::document::{OutputMode, Parameter, Pendulum};

const STEPS_PER_SECOND: f64 = 120.0;
const FIXED_STEP: f64 = 1.0 / STEPS_PER_SECOND;
const MAX_CATCH_UP_STEPS: f64 = 240.0;
const MAX_CATCH_UP_TIME: f64 = MAX_CATCH_UP_STEPS * FIXED_STEP;
const TIME_EPSILON: f64 = 1e-9;
#[derive(Debug, Clone, Copy, PartialEq, Default, serde::Serialize, serde::Deserialize)]
pub struct PendulumState {
    pub accumulator: f64,
    pub position: f64,
    pub velocity: f64,
}

fn finite_or(value: f64, fallback: f64) -> f64 {
    if value.is_finite() { value } else { fallback }
}

/// The web player's fixed 120 Hz solver, including its finite-result guard.
pub fn advance(pendulum: &Pendulum, state: PendulumState, input: f64, delta: f64) -> PendulumState {
    let delta = if delta.is_finite() {
        delta.max(0.0)
    } else {
        0.0
    };
    let accumulator = if state.accumulator.is_finite() {
        state.accumulator.clamp(0.0, MAX_CATCH_UP_TIME)
    } else {
        0.0
    };
    let total = f64::min(MAX_CATCH_UP_TIME, accumulator + delta);
    let steps = f64::min(
        MAX_CATCH_UP_STEPS,
        ((total + TIME_EPSILON) / FIXED_STEP).floor(),
    );
    let mut position = finite_or(state.position, 0.0);
    let mut velocity = finite_or(state.velocity, 0.0);
    let input = finite_or(input, 0.0);
    let target = finite_or(input * pendulum.input_scale, position);
    for _ in 0..steps as usize {
        let acceleration =
            (target - position) * pendulum.gravity / pendulum.length - pendulum.damping * velocity;
        let next_velocity = velocity + acceleration * FIXED_STEP;
        let next_position = position + next_velocity * FIXED_STEP;
        if acceleration.is_finite() && next_velocity.is_finite() && next_position.is_finite() {
            velocity = next_velocity;
            position = next_position;
        }
    }
    PendulumState {
        accumulator: f64::max(0.0, total - steps * FIXED_STEP),
        position,
        velocity,
    }
}

fn clamped(parameter: &Parameter, value: f64) -> f64 {
    parameter.bound(finite_or(value, parameter.default_value))
}

/// Frame timing for [`evaluate`]. With `settle`, outputs jump to their static equilibrium.
#[derive(Debug, Clone, Copy)]
pub(crate) struct PhysicsStep {
    pub(crate) delta: f64,
    pub(crate) settle: bool,
}

/// One pendulum (`evaluatePhysics` loop body): returns the new state and output value.
/// `input_value` is read after earlier pendulums wrote their outputs; `base_output` is the
/// output parameter before physics.
pub(crate) fn evaluate(
    pendulum: &Pendulum,
    input: &Parameter,
    output: &Parameter,
    (input_value, base_output): (f64, f64),
    state: PendulumState,
    step: PhysicsStep,
) -> (PendulumState, f64) {
    let input_delta = clamped(input, input_value) - input.default_value;
    let target = input_delta * pendulum.input_scale;
    let next = if step.settle {
        PendulumState {
            accumulator: 0.0,
            position: finite_or(target, state.position),
            velocity: 0.0,
        }
    } else {
        advance(pendulum, state, input_delta, step.delta)
    };
    let base = clamped(output, base_output);
    let position = match pendulum.output_mode {
        Some(OutputMode::Lag) => next.position - target,
        _ => next.position,
    };
    let candidate = base + position * pendulum.output_scale;
    let value = if candidate.is_finite() {
        output.bound(candidate)
    } else {
        base
    };
    (next, value)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn pendulum() -> Pendulum {
        Pendulum {
            damping: 4.0,
            gravity: 9.8,
            id: "p".into(),
            input_parameter_id: "in".into(),
            input_scale: 1.0,
            length: 1.0,
            output_parameter_id: "out".into(),
            output_mode: None,
            output_scale: 1.0,
        }
    }

    #[test]
    fn steps_at_fixed_rate_and_carries_remainder() {
        let state = advance(&pendulum(), PendulumState::default(), 1.0, 1.0 / 60.0);
        assert!(state.position > 0.0 && state.position < 1.0);
        assert!(state.accumulator.abs() < 1e-9);
        let partial = advance(&pendulum(), PendulumState::default(), 1.0, 0.004);
        assert_eq!(partial.position, 0.0);
        assert!((partial.accumulator - 0.004).abs() < 1e-12);
        let mut settled = PendulumState::default();
        for _ in 0..600 {
            settled = advance(&pendulum(), settled, 1.0, 1.0 / 60.0);
        }
        assert!((settled.position - 1.0).abs() < 1e-3);
    }

    /// The pre-substepping loop: one symplectic Euler step per fixed step.
    fn single_steps(
        pendulum: &Pendulum,
        mut state: PendulumState,
        target: f64,
        steps: usize,
    ) -> PendulumState {
        for _ in 0..steps {
            let acceleration = (target - state.position) * pendulum.gravity / pendulum.length
                - pendulum.damping * state.velocity;
            state.velocity += acceleration * FIXED_STEP;
            state.position += state.velocity * FIXED_STEP;
        }
        state
    }

    #[test]
    fn ordinary_pendulums_take_one_step_per_fixed_step() {
        let start = PendulumState {
            accumulator: 0.0,
            position: 0.25,
            velocity: -1.5,
        };
        let next = advance(&pendulum(), start, 1.0, 10.0 * FIXED_STEP);
        let expected = single_steps(&pendulum(), start, 1.0, 10);
        assert_eq!(
            (next.position, next.velocity),
            (expected.position, expected.velocity)
        );
    }

    #[test]
    fn overflowing_steps_preserve_the_previous_state() {
        let extreme = Pendulum {
            gravity: 1e12,
            ..pendulum()
        };
        let state = PendulumState {
            position: 1e308,
            ..PendulumState::default()
        };
        assert_eq!(advance(&extreme, state, -1e308, FIXED_STEP), state);
    }
}

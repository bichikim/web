//! Pendulum chains (`player/physics-chain.ts`): Cubism-style physics with its defects fixed.
//! Operations follow the TypeScript order so both players produce the same values.

use poffo_format::document::{
    DEFAULT_CHAIN_FPS, DEFAULT_CHAIN_GRAVITY, Parameter, Physics, PhysicsAxis, PhysicsChain,
    PhysicsOutput, PhysicsRange,
};

use crate::geometry::Vec2;

/// Gravity and wind an app sets while the model plays (Cubism's physics options), replacing the
/// document's `physics.gravity` and `physics.wind` for chains (`PuppetPhysicsOptions`); `None`
/// keeps the document's.
#[derive(Debug, Clone, Copy, Default, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct PhysicsOptions {
    /// Direction `[x, y]` with `y` down; its length is ignored and must not be zero.
    pub gravity: Option<[f64; 2]>,
    /// Added to every chain pendulum's pull, `[x, y]` with `y` down.
    pub wind: Option<[f64; 2]>,
}

impl PhysicsOptions {
    /// `isValidPhysicsOptions`: finite vectors and a gravity direction.
    pub fn is_valid(&self) -> bool {
        let finite = |v: Option<[f64; 2]>| v.is_none_or(|[x, y]| x.is_finite() && y.is_finite());
        finite(self.gravity)
            && finite(self.wind)
            && self.gravity.is_none_or(|[x, y]| x != 0.0 || y != 0.0)
    }
}

/// Pendulums turn toward a new gravity direction by this fraction of the change per step.
const AIR_RESISTANCE: f64 = 5.0;
/// End points closer than this share of the position range to `x = 0` snap onto it.
const MOVEMENT_THRESHOLD: f64 = 0.001;
/// Accumulated time beyond this is dropped instead of simulated.
const MAX_ACCUMULATED_SECONDS: f64 = 5.0;
/// `reaction` scales time in units of 1/30 s.
const REACTION_RATE: f64 = 30.0;
const FULL_TURN: f64 = 2.0 * std::f64::consts::PI;

/// One pendulum's end point and velocity (`y` down) and the gravity it last felt.
#[derive(Debug, Clone, Copy, Default, PartialEq, serde::Serialize, serde::Deserialize)]
struct PendulumState {
    gravity: Vec2,
    position: Vec2,
    velocity: Vec2,
}

/// A chain's pendulums, root, and output readings of the last two steps.
#[derive(Debug, Clone, Default, PartialEq, serde::Serialize, serde::Deserialize)]
struct ChainState {
    #[serde(default)]
    root: Vec2,
    current: Vec<f64>,
    pendulums: Vec<PendulumState>,
    previous: Vec<f64>,
}

/// State shared by every chain: unstepped time, the parameter values the last step read, and
/// each chain in document order.
#[derive(Debug, Clone, Default, PartialEq, serde::Serialize, serde::Deserialize)]
pub(crate) struct ChainsState {
    accumulator: f64,
    chains: Vec<ChainState>,
    inputs: Vec<f64>,
}

#[derive(Debug, Clone, Copy)]
struct Root {
    /// Gravity direction turned by the inputs' tilt.
    gravity: Vec2,
    position: Vec2,
}

/// Physics settings and parameter lookup shared by one evaluation.
struct World<'a, F> {
    gravity: Vec2,
    step: f64,
    wind: Vec2,
    parameter: F,
    parameters: &'a [Parameter],
}

/// `v` scaled to length 1, or `fallback` when it has no length.
fn unit(v: Vec2, fallback: Vec2) -> Vec2 {
    let size = v.length();
    if size > 0.0 {
        v * (1.0 / size)
    } else {
        fallback
    }
}

/// Signed angle (radians, -π..π) turning `from` onto `to`; rounds halves up like `Math.round`.
fn angle_between(from: Vec2, to: Vec2) -> f64 {
    let turn = to.y.atan2(to.x) - from.y.atan2(from.x);
    turn - FULL_TURN * (turn / FULL_TURN + 0.5).floor()
}

fn clamp(value: f64, parameter: &Parameter) -> f64 {
    parameter.maximum.min(parameter.minimum.max(value))
}

/// The parameter's value as physics reads it: finite, wrapped or limited to its range.
fn read_value(parameter: &Parameter, value: Option<f64>) -> f64 {
    parameter.bound(
        value
            .filter(|v| v.is_finite())
            .unwrap_or(parameter.default_value),
    )
}

/// Maps the value's offset from the parameter default onto `range` around its center and
/// negates it unless `reflect` is set.
fn normalize(parameter: &Parameter, value: f64, range: &PhysicsRange, reflect: bool) -> f64 {
    let offset = clamp(value, parameter) - parameter.default_value;
    let (limit, end) = if offset > 0.0 {
        (parameter.maximum, range.maximum)
    } else {
        (parameter.minimum, range.minimum)
    };
    let span = limit - parameter.default_value;
    let normalized = if offset == 0.0 {
        range.center
    } else if span == 0.0 {
        0.0
    } else {
        (offset * (end - range.center)) / span + range.center
    };
    if reflect { normalized } else { -normalized }
}

impl<F: Fn(&str) -> Option<usize>> World<'_, F> {
    fn read(&self, id: &str, values: &[f64]) -> Option<(usize, f64)> {
        let index = (self.parameter)(id)?;
        let definition = self.parameters.get(index)?;
        Some((index, read_value(definition, values.get(index).copied())))
    }

    /// The root's position and the tilted gravity from the chain's weighted inputs.
    fn root(&self, chain: &PhysicsChain, values: &[f64]) -> Root {
        let [mut angle, mut x, mut y] = [0.0; 3];
        for input in &chain.inputs {
            let Some((index, value)) = self.read(&input.parameter_id, values) else {
                continue;
            };
            let range = match input.axis {
                PhysicsAxis::Angle => &chain.normalization.angle,
                _ => &chain.normalization.position,
            };
            let share = normalize(
                &self.parameters[index],
                value,
                range,
                input.reflect == Some(true),
            ) * input.weight;
            match input.axis {
                PhysicsAxis::X => x += share,
                PhysicsAxis::Y => y += share,
                PhysicsAxis::Angle => angle += share,
            }
        }
        let tilt = (-angle * std::f64::consts::PI) / 180.0;
        Root {
            gravity: self.gravity.rotate(tilt),
            position: Vec2::new(x, y).rotate(tilt),
        }
    }

    fn force(&self, root: Root, acceleration: f64) -> Vec2 {
        root.gravity * acceleration + self.wind
    }

    /// An output's reading: offset from the parent pendulum, or the angle from its direction.
    fn reading(&self, pendulums: &[PendulumState], root: Vec2, output: &PhysicsOutput) -> f64 {
        let at = |index: Option<usize>| {
            index
                .and_then(|i| pendulums.get(i))
                .map_or(root, |p| p.position)
        };
        let index = output.pendulum_index;
        let segment = at(Some(index)) - at(index.checked_sub(1));
        let reading = match output.axis {
            PhysicsAxis::X => segment.x,
            PhysicsAxis::Y => segment.y,
            PhysicsAxis::Angle => {
                let reference = if index == 0 {
                    self.gravity
                } else {
                    at(index.checked_sub(1)) - at(index.checked_sub(2))
                };
                angle_between(reference, segment)
            }
        };
        if output.reflect == Some(true) {
            -reading
        } else {
            reading
        }
    }

    fn readings(&self, chain: &PhysicsChain, pendulums: &[PendulumState], root: Vec2) -> Vec<f64> {
        chain
            .outputs
            .iter()
            .map(|o| self.reading(pendulums, root, o))
            .collect()
    }

    /// `reading × scale`, limited to the parameter's range, blended over `values` by weight.
    fn write(&self, chain: &PhysicsChain, readings: &[f64], values: &mut [f64]) {
        for (output, &reading) in chain.outputs.iter().zip(readings) {
            let Some((index, current)) = self.read(&output.parameter_id, values) else {
                continue;
            };
            if !reading.is_finite() {
                continue;
            }
            let target = clamp(reading * output.scale, &self.parameters[index]);
            values[index] = if output.weight >= 1.0 {
                target
            } else {
                current * (1.0 - output.weight) + target * output.weight
            };
        }
    }
}

/// Moves end points within the threshold onto `x = 0`.
fn snap(point: Vec2, chain: &PhysicsChain) -> Vec2 {
    if point.x.abs() < MOVEMENT_THRESHOLD * chain.normalization.position.maximum {
        Vec2::new(0.0, point.y)
    } else {
        point
    }
}

/// Each pendulum hanging still along its force.
fn hang<F: Fn(&str) -> Option<usize>>(
    chain: &PhysicsChain,
    root: Root,
    world: &World<'_, F>,
) -> Vec<PendulumState> {
    let mut placed: Vec<PendulumState> = Vec::with_capacity(chain.pendulums.len());
    for pendulum in &chain.pendulums {
        let parent = placed.last().map_or(root.position, |p| p.position);
        let along = unit(world.force(root, pendulum.acceleration), root.gravity);
        placed.push(PendulumState {
            gravity: root.gravity,
            position: snap(parent + along * pendulum.length, chain),
            velocity: Vec2::ZERO,
        });
    }
    placed
}

/// One step: keep the direction from the moved parent turned by a fifth of the gravity change,
/// move by velocity and force over the reaction time, and restore the length.
fn step_pendulums<F: Fn(&str) -> Option<usize>>(
    chain: &PhysicsChain,
    state: &ChainState,
    root: Root,
    world: &World<'_, F>,
) -> Vec<PendulumState> {
    let mut placed: Vec<PendulumState> = Vec::with_capacity(chain.pendulums.len());
    for (index, pendulum) in chain.pendulums.iter().enumerate() {
        let parent = placed.last().map_or(root.position, |p| p.position);
        let previous = state
            .pendulums
            .get(index)
            .copied()
            .unwrap_or(PendulumState {
                gravity: root.gravity,
                position: parent,
                velocity: Vec2::ZERO,
            });
        let time = pendulum.reaction * world.step * REACTION_RATE;
        let turned = (previous.position - parent)
            .rotate(angle_between(previous.gravity, root.gravity) / AIR_RESISTANCE);
        let moved = (parent + turned)
            + (previous.velocity * time + world.force(root, pendulum.acceleration) * (time * time));
        let position = snap(
            parent + unit(moved - parent, root.gravity) * pendulum.length,
            chain,
        );
        let velocity = if time == 0.0 {
            previous.velocity
        } else {
            (position - previous.position) * (pendulum.mobility / time)
        };
        placed.push(PendulumState {
            gravity: root.gravity,
            position,
            velocity,
        });
    }
    placed
}

/// Every parameter's value as physics reads it.
fn snapshot(parameters: &[Parameter], values: &[f64]) -> Vec<f64> {
    parameters
        .iter()
        .enumerate()
        .map(|(i, p)| read_value(p, values.get(i).copied()))
        .collect()
}

fn settle<F: Fn(&str) -> Option<usize>>(
    physics: &Physics,
    world: &World<'_, F>,
    values: &mut [f64],
) -> ChainsState {
    let inputs = snapshot(world.parameters, values);
    let mut chains = Vec::with_capacity(physics.chains.len());
    for chain in &physics.chains {
        let root = world.root(chain, values);
        let pendulums = hang(chain, root, world);
        let readings = world.readings(chain, &pendulums, root.position);
        world.write(chain, &readings, values);
        chains.push(ChainState {
            root: root.position,
            current: readings.clone(),
            pendulums,
            previous: readings,
        });
    }
    ChainsState {
        accumulator: 0.0,
        chains,
        inputs,
    }
}

/// Fixed steps of `1 / fps` over `delta`; each reads inputs moved toward `values` by its share
/// of the remaining time, and the written outputs blend the last two steps by the time left.
fn advance<F: Fn(&str) -> Option<usize>>(
    physics: &Physics,
    world: &World<'_, F>,
    state: &mut ChainsState,
    values: &mut [f64],
    delta: f64,
) {
    let target = snapshot(world.parameters, values);
    let delta = if delta.is_finite() {
        delta.max(0.0)
    } else {
        0.0
    };
    let mut accumulator = state.accumulator + delta;
    if accumulator > MAX_ACCUMULATED_SECONDS {
        accumulator = 0.0;
    }
    while delta > 0.0 && accumulator >= world.step {
        let share = world.step / accumulator;
        let mut inputs: Vec<f64> = target
            .iter()
            .enumerate()
            .map(|(i, &value)| {
                state.inputs.get(i).copied().unwrap_or(value) * (1.0 - share) + value * share
            })
            .collect();
        state.inputs.clone_from(&inputs);
        for (chain, chain_state) in physics.chains.iter().zip(state.chains.iter_mut()) {
            let root = world.root(chain, &inputs);
            let pendulums = step_pendulums(chain, chain_state, root, world);
            let current = world.readings(chain, &pendulums, root.position);
            world.write(chain, &current, &mut inputs);
            chain_state.previous = std::mem::replace(&mut chain_state.current, current);
            chain_state.pendulums = pendulums;
            chain_state.root = root.position;
        }
        accumulator -= world.step;
    }
    state.accumulator = accumulator;
    let alpha = accumulator / world.step;
    for (chain, chain_state) in physics.chains.iter().zip(&state.chains) {
        let readings: Vec<f64> = chain_state
            .previous
            .iter()
            .zip(&chain_state.current)
            .map(|(previous, current)| previous * (1.0 - alpha) + current * alpha)
            .collect();
        world.write(chain, &readings, values);
    }
}

/// Whether `state` holds every chain with its pendulum and output counts.
fn matches(state: &ChainsState, physics: &Physics) -> bool {
    state.chains.len() == physics.chains.len()
        && physics.chains.iter().zip(&state.chains).all(|(chain, s)| {
            s.pendulums.len() == chain.pendulums.len() && s.current.len() == chain.outputs.len()
        })
}

/// `evaluateChains`: settles every chain when `settle_all`, without state, or after chain edits;
/// otherwise advances them by `delta`. Outputs blend into `values`.
pub(crate) fn evaluate(
    physics: &Physics,
    parameter: impl Fn(&str) -> Option<usize>,
    parameters: &[Parameter],
    values: &mut [f64],
    state: &mut Option<ChainsState>,
    options: PhysicsOptions,
    (delta, settle_all): (f64, bool),
) {
    let world = World {
        gravity: unit(
            options
                .gravity
                .or(physics.gravity)
                .unwrap_or(DEFAULT_CHAIN_GRAVITY)
                .into(),
            DEFAULT_CHAIN_GRAVITY.into(),
        ),
        step: if physics.fps == Some(0.0) {
            if delta > 0.0 {
                delta
            } else {
                1.0 / DEFAULT_CHAIN_FPS
            }
        } else {
            1.0 / physics.fps.unwrap_or(DEFAULT_CHAIN_FPS)
        },
        wind: options.wind.or(physics.wind).unwrap_or([0.0; 2]).into(),
        parameter,
        parameters,
    };
    match state {
        Some(current) if !settle_all && matches(current, physics) => {
            advance(physics, &world, current, values, delta);
        }
        _ => *state = Some(settle(physics, &world, values)),
    }
}

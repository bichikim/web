//! Pendulum chains (`parse-physics-chain.ts`).

use std::collections::HashSet;

use super::{Check, Index, ensure, is_ratio, unique};
use crate::document::{ChainPendulum, Document, PhysicsChain, PhysicsRange};

const MAXIMUM_FPS: f64 = 240.0;

fn range_ok(range: &PhysicsRange) -> bool {
    [range.minimum, range.center, range.maximum]
        .iter()
        .all(|v| v.is_finite())
        && range.minimum <= range.maximum
}

fn pendulum_ok(pendulum: &ChainPendulum) -> bool {
    pendulum.acceleration.is_finite()
        && pendulum.length.is_finite()
        && pendulum.length > 0.0
        && is_ratio(pendulum.mobility)
        && pendulum.reaction.is_finite()
        && pendulum.reaction > 0.0
}

fn chain_ok(chain: &PhysicsChain, index: &Index) -> bool {
    let parameters = &index.parameters;
    let inputs: HashSet<&str> = chain
        .inputs
        .iter()
        .map(|i| i.parameter_id.as_str())
        .collect();
    !chain.id.is_empty()
        && range_ok(&chain.normalization.angle)
        && range_ok(&chain.normalization.position)
        && !chain.pendulums.is_empty()
        && chain.pendulums.iter().all(pendulum_ok)
        && chain
            .inputs
            .iter()
            .all(|i| parameters.contains_key(i.parameter_id.as_str()) && is_ratio(i.weight))
        && chain.outputs.iter().all(|o| {
            parameters.contains_key(o.parameter_id.as_str())
                && !inputs.contains(o.parameter_id.as_str())
                && o.pendulum_index < chain.pendulums.len()
                && o.scale.is_finite()
                && is_ratio(o.weight)
        })
}

/// Chains with unique ids whose outputs never feed their own inputs, plus `fps`, gravity and
/// wind.
pub(super) fn validate_chains(document: &Document, index: &Index) -> Check {
    let Some(physics) = &document.physics else {
        return Ok(());
    };
    for (position, chain) in physics.chains.iter().enumerate() {
        ensure(
            chain_ok(chain, index),
            || format!("physics.chains[{position}]"),
            "invalid chain",
        )?;
    }
    let vector_ok = |v: &Option<[f64; 2]>| v.is_none_or(|v| v.iter().all(|c| c.is_finite()));
    ensure(
        unique(physics.chains.iter().map(|c| c.id.as_str()))
            && physics
                .fps
                .is_none_or(|fps| fps.is_finite() && (0.0..=MAXIMUM_FPS).contains(&fps))
            && vector_ok(&physics.gravity)
            && physics.gravity.is_none_or(|g| g != [0.0, 0.0])
            && vector_ok(&physics.wind),
        || "physics".into(),
        "chain ids must be unique, fps 0..=240, gravity a finite non-zero direction and wind finite",
    )
}

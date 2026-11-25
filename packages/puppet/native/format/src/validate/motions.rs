//! Motion shape rules: metadata, fades, events, tracks and keyframes.

use super::{Check, ensure, is_fade, is_ratio, unique};
use crate::document::{Easing, Keyframe, Motion, Track};

fn validate_keyframes(keyframes: &[Keyframe], duration: f64, path: &str) -> Check {
    ensure(!keyframes.is_empty(), || path.to_owned(), "needs keyframes")?;
    let ordered = keyframes.iter().enumerate().all(|(i, k)| {
        k.time >= 0.0 && k.time <= duration && (i == 0 || k.time >= keyframes[i - 1].time)
    });
    ensure(
        ordered,
        || path.to_owned(),
        "times must be ordered within 0..=duration",
    )?;
    ensure(
        keyframes.iter().all(|k| {
            k.bezier.is_none_or(|[x1, _, x2, _]| {
                k.easing == Some(Easing::Bezier) && is_ratio(x1) && is_ratio(x2)
            }) && k.bezier.is_none_or(|h| h.iter().all(|v| v.is_finite()))
        }),
        || path.to_owned(),
        "Bezier handles need `easing: bezier` and handle times within 0..=1",
    )
}

pub(super) fn validate_motion(motion: &Motion, path: &str) -> Check {
    ensure(
        !motion.id.is_empty() && motion.duration > 0.0,
        || path.to_owned(),
        "needs an id and a positive duration",
    )?;
    ensure(
        is_fade(motion.fade_in_time)
            && is_fade(motion.fade_out_time)
            && motion.name.as_ref().is_none_or(|name| !name.is_empty())
            && motion
                .events
                .iter()
                .all(|e| (0.0..=motion.duration).contains(&e.time)),
        || path.to_owned(),
        "fades must be non-negative, names non-empty and events within 0..=duration",
    )?;
    if let Some(ids) = &motion.timeline_parameter_ids {
        ensure(
            unique(ids.iter().map(String::as_str)),
            || format!("{path}.timelineParameterIds"),
            "must be unique",
        )?;
    }
    for (index, track) in motion.tracks.iter().enumerate() {
        let track_path = format!("{path}.tracks[{index}]");
        let target_ok = match track {
            Track::Parameter { parameter_id, .. } => !parameter_id.is_empty(),
            Track::Vertex { part_id, .. } => !part_id.is_empty(),
            Track::GroupOpacity { group_id, .. } => !group_id.is_empty(),
            Track::Model { .. } => true,
        };
        let (fade_in, fade_out) = track.fade();
        ensure(
            target_ok && is_fade(fade_in) && is_fade(fade_out),
            || track_path.clone(),
            "needs a target and non-negative fades",
        )?;
        validate_keyframes(
            track.keyframes(),
            motion.duration,
            &format!("{track_path}.keyframes"),
        )?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use serde_json::{Value, json};

    use crate::validate::test_support::{accepts, document, merge, parameter};

    /// A document whose only motion is `{"id": "m", "duration": 1, ...motion}`.
    fn valid(motion: Value) -> bool {
        let motion = merge(
            json!({"id": "m", "duration": 1, "tracks": [{"kind": "parameter", "parameterId": "p",
                "keyframes": [{"time": 0, "value": 0}]}]}),
            motion,
        );
        accepts(document(json!({
            "parameters": [parameter("p", 0.0, 1.0, 0.0)],
            "motions": [motion],
        })))
    }
    #[test]
    fn motion_metadata_fades_events_and_bezier_handles() {
        let track = |keyframe: Value, fade: Value| {
            let track = merge(
                json!({"kind": "parameter", "parameterId": "p", "keyframes": [keyframe]}),
                fade,
            );
            json!({"tracks": [track]})
        };
        assert!(valid(
            json!({"name": "인사", "loop": false, "fadeInTime": 0.5,
            "events": [{"time": 1, "value": "end"}]})
        ));
        assert!(valid(track(
            json!({"time": 0, "value": 0, "easing": "bezier", "bezier": [0, 1, 1, 0]}),
            json!({"fadeOutTime": 0})
        )));
        assert!(!valid(json!({"events": [{"time": 2, "value": "late"}]})));
        assert!(!valid(json!({"fadeOutTime": -1})));
        assert!(!valid(json!({"name": ""})));
        assert!(!valid(track(
            json!({"time": 0, "value": 0, "bezier": [0, 1, 1, 0]}),
            json!({})
        )));
        assert!(!valid(track(
            json!({"time": 0, "value": 0, "easing": "bezier", "bezier": [1.5, 1, 1, 0]}),
            json!({})
        )));
        assert!(!valid(track(
            json!({"time": 0, "value": 0}),
            json!({"fadeInTime": -0.1})
        )));
    }
}

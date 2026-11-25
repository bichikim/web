//! Model metadata: parameter roles and groups, model and group-opacity tracks, motion groups.

use std::collections::{HashMap, HashSet};

use super::{Check, Index, ensure, is_ratio, unique};
use crate::document::{Document, FRAMES_PER_SECOND_RANGE, ModelTrackTarget, MotionSound, Track};

fn is_ratio_track(track: &Track) -> bool {
    track.keyframes().iter().all(|k| is_ratio(k.value))
}

/// Whether every parameter group reaches a root without cycles. Each group is walked once:
/// later walks stop at groups already known to reach a root, and the walk in progress is a
/// set, so the check is linear in the number of groups.
fn groups_acyclic(parents: &HashMap<&str, Option<&str>>) -> bool {
    let mut rooted: HashSet<&str> = HashSet::new();
    parents.keys().all(|&id| {
        let mut path = Vec::new();
        let mut on_path = HashSet::new();
        let mut current = Some(id);
        while let Some(group) = current {
            if rooted.contains(group) {
                break;
            }
            if !on_path.insert(group) {
                return false;
            }
            path.push(group);
            match parents.get(group) {
                Some(parent) => current = *parent,
                None => return false,
            }
        }
        rooted.extend(path);
        true
    })
}

pub(super) fn validate_model(document: &Document, index: &Index) -> Check {
    let parameters = &index.parameters;
    let roles = &document.parameter_roles;
    for (name, ids) in [("eyeBlink", &roles.eye_blink), ("lipSync", &roles.lip_sync)] {
        ensure(
            unique(ids.iter().map(String::as_str))
                && ids.iter().all(|id| parameters.contains_key(id.as_str())),
            || format!("parameterRoles.{name}"),
            "must name distinct parameters",
        )?;
    }
    let parents: HashMap<&str, Option<&str>> = document
        .parameter_groups
        .iter()
        .map(|g| (g.id.as_str(), g.group_id.as_deref()))
        .collect();
    ensure(
        parents.len() == document.parameter_groups.len()
            && document
                .parameter_groups
                .iter()
                .all(|g| !g.id.is_empty() && !g.name.is_empty())
            && groups_acyclic(&parents)
            && document.parameters.iter().all(|p| {
                p.group_id
                    .as_deref()
                    .is_none_or(|g| parents.contains_key(g))
            }),
        || "parameterGroups".into(),
        "need unique ids and names, existing parents without cycles, and known parameter groups",
    )?;
    ensure(
        document.layout.is_none_or(|layout| {
            [layout.x, layout.y].iter().all(|v| v.is_finite())
                && [layout.width, layout.height]
                    .iter()
                    .all(|v| v.is_finite() && *v > 0.0)
                && layout
                    .align
                    .is_none_or(|align| align.into_iter().all(is_ratio))
        }),
        || "layout".into(),
        "needs a positive finite rectangle and alignment within 0..=1",
    )?;
    ensure(
        document.mouth_shapes.as_ref().is_none_or(|shapes| {
            !shapes.parameter_ids.is_empty()
                && unique(shapes.parameter_ids.iter().map(String::as_str))
                && shapes
                    .parameter_ids
                    .iter()
                    .all(|id| parameters.contains_key(id.as_str()))
                && shapes.smoothing.is_none_or(|s| s.is_finite() && s >= 0.0)
                && shapes.vowels.all().iter().all(|values| {
                    values.len() == shapes.parameter_ids.len()
                        && values.iter().all(|v| v.is_finite())
                })
        }),
        || "mouthShapes".into(),
        "needs distinct known parameters, one finite value each per vowel and a non-negative smoothing",
    )?;
    ensure(
        unique(document.breath.iter().map(|b| b.parameter_id.as_str()))
            && document.breath.iter().all(|b| {
                parameters.contains_key(b.parameter_id.as_str())
                    && [b.offset, b.peak, b.weight].iter().all(|v| v.is_finite())
                    && b.period.is_finite()
                    && b.period > 0.0
            }),
        || "breath".into(),
        "needs distinct known parameters, finite settings and a positive period",
    )?;
    ensure(
        unique(document.look.iter().map(|l| l.parameter_id.as_str()))
            && document.look.iter().all(|l| {
                parameters.contains_key(l.parameter_id.as_str())
                    && [l.x, l.y, l.xy].iter().all(|v| v.is_finite())
            }),
        || "look".into(),
        "needs distinct known parameters and finite factors",
    )?;
    for motion in &document.motions {
        let path = || format!("motion `{}`", motion.id);
        let mut targets = Vec::new();
        let mut group_tracks = Vec::new();
        for track in &motion.tracks {
            match track {
                Track::Model { target, .. } => {
                    targets.push(*target);
                    ensure(
                        *target == ModelTrackTarget::LipSync || is_ratio_track(track),
                        path,
                        "model opacity and eye openness must be 0..=1",
                    )?;
                }
                Track::GroupOpacity { group_id, .. } => {
                    group_tracks.push(group_id.as_str());
                    ensure(
                        index.group_ids.contains(group_id.as_str()) && is_ratio_track(track),
                        path,
                        "group opacity needs a scene group and 0..=1 values",
                    )?;
                }
                Track::Parameter { .. } | Track::Vertex { .. } => {}
            }
        }
        ensure(
            targets.len() == targets.iter().collect::<HashSet<_>>().len()
                && unique(group_tracks.iter().copied())
                && motion.group.as_ref().is_none_or(|g| !g.is_empty())
                && motion
                    .frames_per_second
                    .is_none_or(|fps| FRAMES_PER_SECOND_RANGE.contains(&fps))
                && motion.sound.as_ref().is_none_or(MotionSound::is_valid),
            path,
            "one track per model target and group, a non-empty motion group, 1..=240 fps and a \
             WAV sound",
        )?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use serde_json::{Value, json};

    use crate::validate::test_support::{self, accepts, merge, parameter};

    fn document(extra: Value, tracks: Value, rows: Value) -> Value {
        let base = test_support::document(json!({
            "parameters": [parameter("eye", 0.0, 1.0, 1.0)],
            "scene": {"roots": [{"kind": "group", "id": "head", "name": "Head", "locked": false,
                                 "visible": true, "children": []}]},
            "motions": [{"id": "m", "duration": 1, "group": "idle", "tracks": tracks,
                         "timelineParameterIds": rows}],
        }));
        merge(base, extra)
    }

    fn valid(extra: Value, tracks: Value, rows: Value) -> bool {
        accepts(document(extra, tracks, rows))
    }

    #[test]
    fn layouts_and_motion_frame_rates_are_checked() {
        let layout = |layout: Value| valid(json!({"layout": layout}), json!([]), json!([]));
        assert!(layout(
            json!({"x": -5, "y": 0, "width": 10, "height": 10, "align": [0, 1]})
        ));
        assert!(!layout(json!({"x": 0, "y": 0, "width": 0, "height": 10})));
        assert!(!layout(
            json!({"x": 0, "y": 0, "width": 10, "height": 10, "align": [0, 1.5]})
        ));
        let fps = |fps: Value| {
            let mut value = document(json!({}), json!([]), json!([]));
            value["motions"][0]["framesPerSecond"] = fps;
            accepts(value)
        };
        assert!(fps(json!(30)));
        assert!(!fps(json!(0)));
        assert!(!fps(json!(241)));
        assert!(!fps(json!(29.97)));
    }

    #[test]
    fn breath_needs_distinct_known_parameters_and_a_positive_period() {
        let breath = |entries: Value| valid(json!({"breath": entries}), json!([]), json!([]));
        let entry = |id: &str, period: f64| json!({"parameterId": id, "offset": 0, "peak": 0.5, "period": period, "weight": 0.5});
        assert!(breath(json!([entry("eye", 3.0)])));
        assert!(!breath(json!([entry("eye", 0.0)])));
        assert!(!breath(json!([entry("nope", 3.0)])));
        assert!(!breath(json!([entry("eye", 3.0), entry("eye", 2.0)])));
    }

    #[test]
    fn look_needs_distinct_known_parameters_and_finite_factors() {
        let look = |entries: Value| valid(json!({"look": entries}), json!([]), json!([]));
        let entry = |id: &str, x: Value| json!({"parameterId": id, "x": x, "y": 0, "xy": -1});
        assert!(look(json!([entry("eye", json!(1))])));
        assert!(!look(json!([entry("eye", json!("1"))])));
        assert!(!look(json!([entry("nope", json!(1))])));
        assert!(!look(json!([
            entry("eye", json!(1)),
            entry("eye", json!(2))
        ])));
    }

    #[test]
    fn motion_sounds_are_wav_data_urls_or_paths() {
        let sound = |sound: Value| {
            let mut value = document(json!({}), json!([]), json!([]));
            value["motions"][0]["sound"] = sound;
            accepts(value)
        };
        assert!(sound(json!({"src": "sounds/talk.wav"})));
        assert!(sound(json!({"src": "data:audio/wav;base64,UklGRg=="})));
        assert!(sound(
            json!({"src": "data:audio/X-WAV;name=talk.wav;base64,UklGRg=="})
        ));
        assert!(!sound(json!({"src": "data:audio/mpeg;base64,AAAA"})));
        assert!(!sound(json!({"src": "data:audio/wav,RIFF"})));
        assert!(!sound(json!({"src": ""})));
        assert!(!sound(json!("sounds/talk.wav")));
    }

    #[test]
    fn model_tracks_roles_and_groups_are_checked() {
        let key = |value: f64| json!([{"time": 0, "value": value}]);
        let tracks = json!([
            {"kind": "model", "target": "opacity", "keyframes": key(0.5)},
            {"kind": "model", "target": "lip-sync", "keyframes": key(3.0)},
            {"kind": "group-opacity", "groupId": "head", "keyframes": key(0.2)},
        ]);
        let rows = json!(["eye", "model:opacity", "group-opacity:head"]);
        let roles = json!({"parameterRoles": {"eyeBlink": ["eye"]},
                           "parameterGroups": [{"id": "face", "name": "Face"}]});
        assert!(valid(roles.clone(), tracks.clone(), rows.clone()));
        let opaque = json!([{"kind": "model", "target": "opacity", "keyframes": key(2.0)}]);
        assert!(!valid(json!({}), opaque, json!([])));
        let missing = json!([{"kind": "group-opacity", "groupId": "nope", "keyframes": key(1.0)}]);
        assert!(!valid(json!({}), missing, json!([])));
        assert!(!valid(json!({}), json!([]), json!(["group-opacity:nope"])));
        assert!(!valid(
            json!({"parameterRoles": {"lipSync": ["nope"]}}),
            json!([]),
            json!([])
        ));
        let cycle = json!({"parameterGroups": [{"id": "a", "name": "A", "groupId": "b"},
                                               {"id": "b", "name": "B", "groupId": "a"}]});
        assert!(!valid(cycle, json!([]), json!([])));
    }
}

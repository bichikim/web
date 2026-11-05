//! Parameter shape rules: range, default and labelled options.

use super::{Check, ensure};
use crate::document::Parameter;

pub(super) fn validate_parameter(parameter: &Parameter, path: &str) -> Check {
    ensure(
        !parameter.id.is_empty()
            && !parameter.name.is_empty()
            && parameter.minimum < parameter.maximum
            && (parameter.minimum..=parameter.maximum).contains(&parameter.default_value)
            && (parameter.repeat != Some(true) || parameter.options.is_none()),
        || path.to_owned(),
        "needs an id, a name, minimum < maximum, an in-range default and no repeating options",
    )?;
    if let Some(options) = &parameter.options {
        let in_range = options.iter().all(|o| {
            !o.label.is_empty() && (parameter.minimum..=parameter.maximum).contains(&o.value)
        });
        let increasing = options.windows(2).all(|pair| pair[0].value < pair[1].value);
        let has_default = options.iter().any(|o| o.value == parameter.default_value);
        ensure(
            options.len() >= 2 && in_range && increasing && has_default,
            || format!("{path}.options"),
            "needs 2+ labelled, increasing, in-range values including the default",
        )?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use serde_json::{Value, json};

    use crate::PoffoFile;

    #[test]
    fn repeating_parameters_wrap_and_reject_options() {
        let parameter: crate::document::Parameter = serde_json::from_value(
            json!({"id": "a", "name": "a", "minimum": 0, "maximum": 360, "defaultValue": 0, "repeat": true}),
        )
        .expect("parameter");
        assert_eq!(parameter.bound(360.0), 0.0);
        assert_eq!(parameter.bound(450.0), 90.0);
        assert_eq!(parameter.bound(-90.0), 270.0);
        let document = |parameter: Value| {
            json!({"format": "winter-love-puppet", "version": 1, "viewport": {"width": 1, "height": 1},
                   "parts": [], "motions": [], "parameters": [parameter]})
        };
        let options = json!({"id": "a", "name": "a", "minimum": 0, "maximum": 1, "defaultValue": 0, "repeat": true,
                             "options": [{"label": "x", "value": 0}, {"label": "y", "value": 1}]});
        assert!(PoffoFile::from_value(document(options)).document().is_err());
    }
    #[test]
    fn repeating_parameter_keyframes_may_reach_the_maximum() {
        let document = |repeat: bool, value: f64| {
            json!({"format": "winter-love-puppet", "version": 1, "viewport": {"width": 1, "height": 1},
                   "parts": [],
                   "parameters": [{"id": "a", "name": "a", "minimum": 0, "maximum": 360, "defaultValue": 0,
                                   "repeat": repeat}],
                   "motions": [{"id": "m", "duration": 1, "tracks": [{"kind": "parameter", "parameterId": "a",
                       "keyframes": [{"time": 0, "value": 0}, {"time": 1, "value": value}]}]}]})
        };
        let accepts = |repeat, value| {
            PoffoFile::from_value(document(repeat, value))
                .document()
                .is_ok()
        };
        assert!(accepts(true, 360.0));
        assert!(!accepts(true, 405.0));
        assert!(accepts(false, 360.0));
        assert!(!accepts(false, 405.0));
    }
}

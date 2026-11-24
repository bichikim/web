use super::{WorkerError, WorkerReply, WorkerRuntime};
use serde::Deserialize;
use serde::de::Error;
use serde_json::{Value, json};

// The file format accepts depth 256; message and checkpoint envelopes need a few more levels.
const MAX_MESSAGE_DEPTH: usize = 272;

/// Checks nesting before recursive deserialization, ignoring brackets inside JSON strings.
pub(super) fn parse_message(bytes: &[u8]) -> Result<Value, serde_json::Error> {
    let mut depth = 0usize;
    let (mut quoted, mut escaped) = (false, false);
    for &byte in bytes {
        if quoted {
            if escaped {
                escaped = false;
            } else if byte == b'\\' {
                escaped = true;
            } else if byte == b'"' {
                quoted = false;
            }
        } else {
            match byte {
                b'"' => quoted = true,
                b'[' | b'{' => {
                    depth += 1;
                    if depth > MAX_MESSAGE_DEPTH {
                        return Err(serde_json::Error::custom(
                            "Playback message nesting exceeds 272",
                        ));
                    }
                }
                b']' | b'}' => depth = depth.saturating_sub(1),
                _ => {}
            }
        }
    }
    let mut deserializer = serde_json::Deserializer::from_slice(bytes);
    deserializer.disable_recursion_limit();
    let value = Value::deserialize(&mut deserializer)?;
    deserializer.end()?;
    Ok(value)
}

pub(super) fn normalize(value: &mut Value, arrays: &[Vec<f64>]) {
    match value {
        Value::Array(items) => items.iter_mut().for_each(|v| normalize(v, arrays)),
        Value::Object(object) => {
            if object.len() == 1 && object.get("__poffoUndefined") == Some(&Value::Bool(true)) {
                *value = Value::Null;
            } else if object.len() == 1
                && object.get("__poffoNumber").and_then(Value::as_str) == Some("-0")
            {
                *value = json!(-0.0);
            } else if object.len() == 1 && object.get("__poffoTyped").is_some_and(Value::is_array) {
                *value = object.remove("__poffoTyped").unwrap();
            } else if let Some(index) = (object.len() == 1)
                .then(|| object.get("__poffoArray").and_then(Value::as_array))
                .flatten()
                .filter(|values| values.len() == 1)
                .and_then(|values| values[0].as_u64())
            {
                *value = Value::Array(
                    arrays
                        .get(index as usize)
                        .into_iter()
                        .flatten()
                        .map(|v| json!(v))
                        .collect(),
                );
            } else {
                object.values_mut().for_each(|v| normalize(v, arrays));
            }
        }
        _ => {}
    }
}

impl WorkerRuntime {
    pub fn process_json(&mut self, bytes: &[u8], arrays: &[Vec<f64>]) -> Vec<u8> {
        let mut output = Vec::new();
        self.process_bytes(bytes, arrays, false, &mut output);
        output
    }
    /// The same checkpoint contract, with render templates and separate f64 numeric buffers.
    pub fn process_packed_json(&mut self, bytes: &[u8], arrays: &[Vec<f64>]) -> Vec<u8> {
        let mut output = Vec::new();
        self.write_packed_json(bytes, arrays, &mut output);
        output
    }
    /// Reuses the reply allocation and reports whether it contains a newly evaluated frame.
    pub fn write_packed_json(
        &mut self,
        bytes: &[u8],
        arrays: &[Vec<f64>],
        output: &mut Vec<u8>,
    ) -> bool {
        self.process_bytes(bytes, arrays, true, output)
    }
    fn process_bytes(
        &mut self,
        bytes: &[u8],
        arrays: &[Vec<f64>],
        packed: bool,
        output: &mut Vec<u8>,
    ) -> bool {
        let response = match parse_message(bytes) {
            Ok(mut message) => {
                normalize(&mut message, arrays);
                let id = message["id"].clone();
                self.process(&mut message, packed).unwrap_or_else(|error| {
                    WorkerReply::Message(
                        json!({"id":id,"kind":"error","message":error.to_string()}),
                    )
                })
            }
            Err(error) => WorkerReply::Message(
                json!({"kind":"error","id":0,"message":WorkerError::Json(error).to_string()}),
            ),
        };
        // Serializing JSON values cannot fail except for an invalid serializer implementation.
        output.clear();
        if serde_json::to_writer(&mut *output, &response).is_err() {
            output.clear();
            return false;
        }
        matches!(response, WorkerReply::Produced { .. })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_bounded_depth_and_rejects_deeper_input_before_deserialization() {
        let nested = |depth: usize| format!("{}null{}", "[".repeat(depth), "]".repeat(depth));
        assert!(parse_message(nested(MAX_MESSAGE_DEPTH).as_bytes()).is_ok());
        assert!(parse_message(nested(MAX_MESSAGE_DEPTH + 1).as_bytes()).is_err());
    }

    #[test]
    fn ignores_escaped_quotes_and_brackets_in_strings_but_validates_json() {
        let text = serde_json::json!({"text": "\\\"[{}]".repeat(300)}).to_string();
        assert!(parse_message(text.as_bytes()).is_ok());
        assert!(parse_message(b"{\"id\":1} []").is_err());
        assert!(parse_message(b"{\"id\":1").is_err());
    }
}

use serde_json::Value;

/// Recognizes explicit result failure metadata without matching arbitrary error words in output.
pub fn failed(tool: Option<&str>, response: Option<&Value>) -> bool {
    let Some(response) = response else {
        return false;
    };
    if let Some(text) = response.as_str() {
        if let Ok(value @ Value::Object(_)) = serde_json::from_str::<Value>(text) {
            return failed(tool, Some(&value));
        }
        return tool == Some("Bash")
            && text
                .lines()
                .take_while(|line| !matches!(line.trim(), "Output:" | "Final output:"))
                .find_map(|line| {
                    line.strip_prefix("Process exited with code ")
                        .or_else(|| line.strip_prefix("Exit code: "))
                })
                .and_then(|value| value.trim().parse::<i64>().ok())
                .is_some_and(|code| code != 0);
    }
    response.get("isError").and_then(Value::as_bool) == Some(true)
        || response.get("is_error").and_then(Value::as_bool) == Some(true)
        || ["exit_code", "exitCode"].iter().any(|key| {
            response
                .get(key)
                .and_then(Value::as_i64)
                .is_some_and(|code| code != 0)
        })
        || matches!(
            response.get("status").and_then(Value::as_str),
            Some("failed" | "error")
        )
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    #[test]
    fn recognizes_explicit_failures_without_treating_error_words_as_failures() {
        for response in [
            json!({"isError":true}),
            json!({"exit_code":7}),
            json!({"status":"failed"}),
            json!("{\"exitCode\":1}"),
        ] {
            assert!(failed(Some("Bash"), Some(&response)));
        }
        for response in [
            json!({"isError":false,"content":[{"text":"error: example"}]}),
            json!({"exit_code":0}),
            json!("Output:\nExit code: 7"),
        ] {
            assert!(!failed(Some("Bash"), Some(&response)));
        }
        assert!(failed(
            Some("Bash"),
            Some(&json!(
                "Wall time: 0.1\nProcess exited with code 7\nFinal output:\n"
            ))
        ));
        assert!(!failed(Some("Read"), Some(&json!("Exit code: 7"))));
        assert!(!failed(None, None));
    }
}

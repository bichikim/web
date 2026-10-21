use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

pub const EVENTS: &[&str] = &[
    "SessionStart",
    "UserPromptSubmit",
    "PreToolUse",
    "PermissionRequest",
    "PostToolUse",
    "Stop",
    "Interrupt",
];
pub const MARKER: &str = "Poffo 작업 알림";

#[derive(Clone, Deserialize, Serialize)]
pub struct Registration {
    pub command: String,
    pub command_windows: String,
    pub created_hooks: bool,
    pub created_events: Vec<String>,
}

fn owned(handler: &Value, registration: &Registration) -> bool {
    handler.get("type").and_then(Value::as_str) == Some("command")
        && handler
            .get("command")
            .and_then(Value::as_str)
            .is_some_and(|command| {
                command == registration.command
                    || command == format!("{} --poffo-decision", registration.command)
            })
        && handler.get("statusMessage").and_then(Value::as_str) == Some(MARKER)
}

pub fn install(
    source: &Value,
    command: String,
    command_windows: String,
) -> Result<(Value, Registration), String> {
    let mut result = source.clone();
    let root = result
        .as_object_mut()
        .ok_or("Codex hooks.json must be an object")?;
    let mut registration = Registration {
        command,
        command_windows,
        created_hooks: !root.contains_key("hooks"),
        created_events: vec![],
    };
    let hooks = root
        .entry("hooks")
        .or_insert_with(|| json!({}))
        .as_object_mut()
        .ok_or("Codex hooks must be an object")?;
    for event in EVENTS {
        if !hooks.contains_key(*event) {
            registration.created_events.push((*event).to_owned());
        }
        let groups = hooks
            .entry(*event)
            .or_insert_with(|| json!([]))
            .as_array_mut()
            .ok_or_else(|| format!("Codex {event} hooks must be an array"))?;
        let exists = groups.iter().any(|group| {
            group
                .get("hooks")
                .and_then(Value::as_array)
                .is_some_and(|handlers| {
                    handlers.iter().any(|handler| owned(handler, &registration))
                })
        });
        if !exists {
            let interactive = *event == "PermissionRequest";
            let suffix = if interactive { " --poffo-decision" } else { "" };
            groups.push(json!({"hooks": [{
                "type": "command", "command": format!("{}{suffix}", registration.command),
                "commandWindows": format!("{}{suffix}", registration.command_windows),
                "async": !interactive, "timeout": if interactive { 135 } else { 1 }, "statusMessage": MARKER,
            }]}));
        }
    }
    Ok((result, registration))
}

pub fn uninstall(source: &Value, registration: &Registration) -> Result<Value, String> {
    let mut result = source.clone();
    let root = result
        .as_object_mut()
        .ok_or("Codex hooks.json must be an object")?;
    let Some(hooks) = root.get_mut("hooks").and_then(Value::as_object_mut) else {
        return Ok(result);
    };
    for event in EVENTS {
        let Some(groups) = hooks.get_mut(*event).and_then(Value::as_array_mut) else {
            continue;
        };
        groups.retain_mut(|group| {
            let Some(handlers) = group.get_mut("hooks").and_then(Value::as_array_mut) else {
                return true;
            };
            let previous = handlers.len();
            handlers.retain(|handler| !owned(handler, registration));
            handlers.len() == previous || !handlers.is_empty()
        });
        if groups.is_empty() && registration.created_events.iter().any(|key| key == event) {
            hooks.remove(*event);
        }
    }
    if hooks.is_empty() && registration.created_hooks {
        root.remove("hooks");
    }
    Ok(result)
}

pub fn installed(source: &Value, registration: &Registration) -> bool {
    EVENTS.iter().all(|event| {
        source
            .get("hooks")
            .and_then(|hooks| hooks.get(*event))
            .and_then(Value::as_array)
            .is_some_and(|groups| {
                groups.iter().any(|group| {
                    group
                        .get("hooks")
                        .and_then(Value::as_array)
                        .is_some_and(|handlers| {
                            handlers.iter().any(|handler| owned(handler, registration))
                        })
                })
            })
    })
}

pub fn interactive(source: &Value, registration: &Registration) -> bool {
    source
        .get("hooks")
        .and_then(|hooks| hooks.get("PermissionRequest"))
        .and_then(Value::as_array)
        .is_some_and(|groups| {
            groups.iter().any(|group| {
                group
                    .get("hooks")
                    .and_then(Value::as_array)
                    .is_some_and(|handlers| {
                        handlers.iter().any(|handler| {
                            owned(handler, registration)
                                && handler.get("async") == Some(&json!(false))
                                && handler.get("command").and_then(Value::as_str)
                                    == Some(&format!("{} --poffo-decision", registration.command))
                        })
                    })
            })
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn preserves_foreign_hooks_and_changes_added_after_registration() {
        let original = json!({"description":"Keep", "unknown": 42, "hooks": {
            "Stop":[{"matcher":"keep", "hooks":[{"type":"command","command":"old"}]}],
            "UserPromptSubmit": []
        }});
        let (mut registered, registration) =
            install(&original, "poffo".into(), "poffo.exe".into()).unwrap();
        assert!(installed(&registered, &registration));
        registered["hooks"]["PreToolUse"][0]["hooks"]
            .as_array_mut()
            .unwrap()
            .push(json!({"type":"command","command":"new-foreign-hook"}));
        let removed = uninstall(&registered, &registration).unwrap();
        assert_eq!(removed["description"], original["description"]);
        assert_eq!(removed["unknown"], original["unknown"]);
        assert_eq!(removed["hooks"]["Stop"], original["hooks"]["Stop"]);
        assert_eq!(removed["hooks"]["UserPromptSubmit"], json!([]));
        assert_eq!(
            removed["hooks"]["PreToolUse"][0]["hooks"],
            json!([{"type":"command","command":"new-foreign-hook"}])
        );
        assert!(!installed(&removed, &registration));
    }

    #[test]
    fn registration_is_idempotent_and_does_not_remove_a_similar_foreign_handler() {
        let source = json!({"hooks":{"Stop":[{"hooks":[{"type":"command","command":"poffo","statusMessage":"Other"}]}]}});
        let (first, registration) = install(&source, "poffo".into(), "poffo.exe".into()).unwrap();
        let (second, _) = install(&first, "poffo".into(), "poffo.exe".into()).unwrap();
        assert_eq!(first, second);
        assert_eq!(uninstall(&second, &registration).unwrap(), source);
    }

    #[test]
    fn only_permission_requests_wait_for_a_human_decision() {
        let (source, registration) =
            install(&json!({}), "poffo".into(), "poffo.exe".into()).unwrap();
        assert!(interactive(&source, &registration));
        assert_eq!(
            source["hooks"]["PermissionRequest"][0]["hooks"][0]["async"],
            false
        );
        assert_eq!(source["hooks"]["Stop"][0]["hooks"][0]["async"], true);
        assert_eq!(uninstall(&source, &registration).unwrap(), json!({}));
    }
    #[test]
    fn rejects_malformed_sources_without_modifying_them() {
        for source in [json!([]), json!({"hooks":[]}), json!({"hooks":{"Stop":{}}})] {
            assert!(install(&source, "poffo".into(), "poffo.exe".into()).is_err());
        }
    }
}

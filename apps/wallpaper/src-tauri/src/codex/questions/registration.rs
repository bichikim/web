use std::{fs, path::Path};
use toml_edit::{DocumentMut, Item, Table, value};

const NAME: &str = "poffo_questions";

fn owned(table: &Item, helper: &Path, descriptor: &Path) -> bool {
    table.get("command").and_then(Item::as_str) == helper.to_str()
        && table
            .get("args")
            .and_then(Item::as_array)
            .is_some_and(|args| {
                args.len() == 2
                    && args.get(0).and_then(|value| value.as_str()) == Some("--poffo-mcp")
                    && args.get(1).and_then(|value| value.as_str()) == descriptor.to_str()
            })
}

pub fn registered(path: &Path, helper: &Path, descriptor: &Path) -> Result<bool, String> {
    let text = read(path)?;
    let document = text
        .parse::<DocumentMut>()
        .map_err(|error| error.to_string())?;
    Ok(document
        .get("mcp_servers")
        .and_then(|servers| servers.get(NAME))
        .is_some_and(|table| {
            owned(table, helper, descriptor)
                && table.get("enabled").and_then(Item::as_bool) != Some(false)
        }))
}

pub fn available(path: &Path, helper: &Path, descriptor: &Path) -> bool {
    registered(path, helper, descriptor).unwrap_or_else(|error| {
        eprintln!("Poffo question configuration unavailable: {error}");
        false
    })
}

fn read(path: &Path) -> Result<String, String> {
    match fs::read_to_string(path) {
        Ok(value) => Ok(value),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(String::new()),
        Err(error) => Err(error.to_string()),
    }
}

fn update(source: &str, helper: &Path, descriptor: &Path, enabled: bool) -> Result<String, String> {
    let mut document = source
        .parse::<DocumentMut>()
        .map_err(|error| error.to_string())?;
    if let Some(existing) = document
        .get("mcp_servers")
        .and_then(|servers| servers.get(NAME))
    {
        if !owned(existing, helper, descriptor) {
            return if enabled {
                Err("같은 이름의 다른 MCP 설정이 있습니다.".into())
            } else {
                Ok(source.into())
            };
        }
        if enabled {
            if existing.get("enabled").and_then(Item::as_bool) != Some(false) {
                return Ok(source.into());
            }
            document["mcp_servers"][NAME]["enabled"] = value(true);
            return Ok(document.to_string());
        }
        document["mcp_servers"]
            .as_table_like_mut()
            .ok_or("Invalid MCP table")?
            .remove(NAME);
    } else if enabled {
        if document.get("mcp_servers").is_none() {
            document["mcp_servers"] = Item::Table(Table::new());
        }
        let servers = document["mcp_servers"]
            .as_table_like_mut()
            .ok_or("Invalid MCP table")?;
        let mut table = Table::new();
        table["command"] = value(helper.to_str().ok_or("Invalid helper path")?);
        table["args"] = value(
            [
                "--poffo-mcp",
                descriptor.to_str().ok_or("Invalid connection path")?,
            ]
            .into_iter()
            .collect::<toml_edit::Array>(),
        );
        table["tool_timeout_sec"] = value(135);
        table["startup_timeout_sec"] = value(5);
        servers.insert(NAME, Item::Table(table));
    }
    Ok(document.to_string())
}

pub fn configure(
    path: &Path,
    helper: &Path,
    descriptor: &Path,
    enabled: bool,
) -> Result<(), String> {
    let previous = read(path)?;
    let updated = update(&previous, helper, descriptor, enabled)?;
    if previous == updated {
        return Ok(());
    }
    if read(path)? != previous {
        return Err("Codex 설정이 변경됐습니다. 다시 시도해 주세요.".into());
    }
    super::super::files::write(path, updated.as_bytes())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn preserves_other_settings_comments_and_later_changes() {
        let source = "# retained\nmodel = 'existing'\n[mcp_servers.other]\ncommand = 'other'\n";
        let helper = Path::new("/app/helper");
        let descriptor = Path::new("/app/connection");
        let installed = update(source, helper, descriptor, true).unwrap();
        assert!(installed.starts_with(source));
        assert_eq!(
            update(&installed, helper, descriptor, true).unwrap(),
            installed
        );
        let edited = format!("{installed}\n[mcp_servers.later]\ncommand = 'later'\n");
        let removed = update(&edited, helper, descriptor, false).unwrap();
        assert!(removed.contains("# retained"));
        assert!(removed.contains("command = 'other'"));
        assert!(removed.contains("command = 'later'"));
        assert!(!removed.contains(NAME));
    }
    #[test]
    fn never_overwrites_or_removes_a_foreign_same_name_server() {
        let source = "[mcp_servers.poffo_questions]\ncommand = 'someone-else'\n";
        let path = Path::new("/app");
        assert!(update(source, path, path, true).is_err());
        assert_eq!(update(source, path, path, false).unwrap(), source);
    }
    #[test]
    fn recognizes_explicit_disabling_and_reenables_only_the_owned_entry() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("config.toml");
        let helper = Path::new("/app/helper");
        let descriptor = Path::new("/app/connection");
        let installed = update("", helper, descriptor, true).unwrap();
        fs::write(&path, format!("{installed}enabled = false\n")).unwrap();
        assert!(!registered(&path, helper, descriptor).unwrap());
        configure(&path, helper, descriptor, true).unwrap();
        assert!(registered(&path, helper, descriptor).unwrap());
    }
    #[test]
    fn invalid_config_does_not_report_questions_available_or_get_overwritten() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("config.toml");
        fs::write(&path, "[broken").unwrap();
        let helper = Path::new("/app/helper");
        let descriptor = Path::new("/app/connection");
        assert!(!available(&path, helper, descriptor));
        assert!(configure(&path, helper, descriptor, true).is_err());
        assert_eq!(fs::read_to_string(path).unwrap(), "[broken");
    }
}

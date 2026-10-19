use std::{fs, io::Write, path::Path};

pub fn write(path: &Path, contents: &[u8]) -> Result<(), String> {
    let parent = path.parent().ok_or("Missing parent directory")?;
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    let mut temporary =
        tempfile::NamedTempFile::new_in(parent).map_err(|error| error.to_string())?;
    temporary
        .write_all(contents)
        .and_then(|_| temporary.as_file().sync_all())
        .map_err(|error| error.to_string())?;
    temporary.persist(path).map_err(|error| error.to_string())?;
    Ok(())
}

pub fn copy_executable(source: &Path, destination: &Path) -> Result<(), String> {
    let parent = destination.parent().ok_or("Missing helper directory")?;
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    let temporary = tempfile::NamedTempFile::new_in(parent).map_err(|error| error.to_string())?;
    fs::copy(source, temporary.path()).map_err(|error| error.to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(temporary.path(), fs::Permissions::from_mode(0o700))
            .map_err(|error| error.to_string())?;
    }
    temporary
        .as_file()
        .sync_all()
        .map_err(|error| error.to_string())?;
    temporary
        .persist(destination)
        .map_err(|error| error.to_string())?;
    Ok(())
}

pub fn read_json(path: &std::path::Path) -> Result<(Option<Vec<u8>>, serde_json::Value), String> {
    match fs::read(path) {
        Ok(bytes) => {
            let value = serde_json::from_slice(&bytes)
                .map_err(|error| format!("Codex hooks.json: {error}"))?;
            Ok((Some(bytes), value))
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            Ok((None, serde_json::json!({})))
        }
        Err(error) => Err(error.to_string()),
    }
}

pub fn replace_json(
    path: &std::path::Path,
    previous: Option<Vec<u8>>,
    value: &serde_json::Value,
) -> Result<(), String> {
    let current = match fs::read(path) {
        Ok(bytes) => Some(bytes),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => None,
        Err(error) => return Err(error.to_string()),
    };
    if current != previous {
        return Err("Codex hooks.json changed; try connecting again".into());
    }
    write(
        path,
        &serde_json::to_vec_pretty(value).map_err(|error| error.to_string())?,
    )
}

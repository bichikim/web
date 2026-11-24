use sha2::{Digest, Sha256};
use std::{
    env, fs,
    io::Read,
    path::{Path, PathBuf},
};

type Error = Box<dyn std::error::Error>;

fn directory() -> Result<PathBuf, Error> {
    let home = match env::consts::OS {
        "windows" => env::var_os("USERPROFILE"),
        _ => env::var_os("HOME"),
    }
    .map(PathBuf::from)
    .ok_or("User home directory unavailable")?;
    let root = match env::consts::OS {
        "macos" => home.join("Library/Caches"),
        "windows" => env::var_os("LOCALAPPDATA")
            .map(PathBuf::from)
            .filter(|path| path.is_absolute())
            .unwrap_or_else(|| home.join("AppData/Local")),
        _ => env::var_os("XDG_CACHE_HOME")
            .map(PathBuf::from)
            .filter(|path| path.is_absolute())
            .unwrap_or_else(|| home.join(".cache")),
    };
    Ok(root.join("io.winterlove.models"))
}

fn valid(path: &Path, size: u64, sha256: &str) -> Result<bool, Error> {
    let metadata = match fs::metadata(path) {
        Ok(value) => value,
        Err(cause) if cause.kind() == std::io::ErrorKind::NotFound => return Ok(false),
        Err(cause) => return Err(cause.into()),
    };
    Ok(metadata.len() == size && format!("{:x}", Sha256::digest(fs::read(path)?)) == sha256)
}

/// Uses the shared verified source at build time; the executable still contains the model for offline use.
pub fn prepare() -> Result<PathBuf, Error> {
    let manifest: serde_json::Value = serde_json::from_str(include_str!("../../spanf-model.json"))?;
    let size = manifest["size"].as_u64().ok_or("Missing model size")?;
    let sha256 = manifest["sha256"]
        .as_str()
        .ok_or("Missing model checksum")?;
    let file = manifest["file"].as_str().ok_or("Missing model filename")?;
    let root = directory()?.join("spanf").join(sha256);
    let destination = root.join(file);
    if valid(&destination, size, sha256)? {
        return Ok(destination);
    }
    fs::create_dir_all(&root)?;
    let previous = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("models")
        .join(file);
    let temporary = tempfile::NamedTempFile::new_in(&root)?;
    if valid(&previous, size, sha256)? {
        fs::copy(&previous, temporary.path())?;
        if !valid(temporary.path(), size, sha256)? {
            return Err("Model migration checksum mismatch".into());
        }
        temporary.persist(&destination)?;
        fs::remove_file(previous)?;
        return Ok(destination);
    }
    let url = manifest["url"].as_str().ok_or("Missing model URL")?;
    let response = reqwest::blocking::get(url)?.error_for_status()?;
    let mut bytes = Vec::new();
    response.take(size + 1).read_to_end(&mut bytes)?;
    if bytes.len() as u64 != size || format!("{:x}", Sha256::digest(&bytes)) != sha256 {
        return Err("SPANF download checksum mismatch".into());
    }
    fs::write(temporary.path(), bytes)?;
    temporary.persist(&destination)?;
    Ok(destination)
}

//! Copies old-origin exports without deleting or rewriting the source browser databases.
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeMap,
    fs::{self, OpenOptions},
    io::{Read, Seek, SeekFrom, Write},
    path::PathBuf,
    sync::Mutex,
};
use tokio::sync::Notify;
const CHUNK_LIMIT: usize = 4 * 1024 * 1024;
const TOTAL_LIMIT: u64 = 1024 * 1024 * 1024;
#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Database {
    pub name: String,
    pub length: u64,
    pub sha256: String,
}
#[derive(Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Manifest {
    pub databases: Vec<Database>,
    pub local_storage: BTreeMap<String, String>,
}
#[derive(Clone)]
enum Phase {
    Preparing,
    Staged(Manifest),
    Ready,
    Failed(String),
}
struct State {
    root: PathBuf,
    phase: Phase,
}
pub(crate) struct Copy {
    state: Mutex<State>,
    changed: Notify,
}
impl Default for Copy {
    fn default() -> Self {
        Self {
            state: Mutex::new(State {
                root: PathBuf::new(),
                phase: Phase::Preparing,
            }),
            changed: Notify::new(),
        }
    }
}
impl Copy {
    pub fn complete_dev(&self) {
        self.state.lock().unwrap().phase = Phase::Ready;
        self.changed.notify_waiters();
    }

    pub fn setup(&self, root: PathBuf) -> Result<bool, String> {
        fs::create_dir_all(&root).map_err(|e| e.to_string())?;
        let ready = root.join("ready.json").exists();
        let mut state = self.state.lock().unwrap();
        state.root = root.clone();
        state.phase = if ready {
            Phase::Ready
        } else {
            Phase::Preparing
        };
        drop(state);
        if !ready && root.join("manifest.json").exists() {
            let manifest = serde_json::from_slice(
                &fs::read(root.join("manifest.json")).map_err(|e| e.to_string())?,
            )
            .map_err(|e| e.to_string())?;
            self.stage(manifest)?;
            return Ok(true);
        }
        Ok(ready)
    }
    pub fn append(&self, index: usize, offset: u64, bytes: &[u8]) -> Result<(), String> {
        if index >= 32 || bytes.len() > CHUNK_LIMIT {
            return Err("Storage copy chunk exceeds limits".into());
        }
        let state = self.state.lock().unwrap();
        if !matches!(state.phase, Phase::Preparing) {
            return Err("Storage copy is not accepting exports".into());
        }
        let path = state.root.join(format!("database-{index}.json"));
        let mut file = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(false)
            .open(path)
            .map_err(|e| e.to_string())?;
        if offset == 0 {
            file.set_len(0).map_err(|e| e.to_string())?;
        }
        if file.metadata().map_err(|e| e.to_string())?.len() != offset {
            return Err("Storage copy offset changed".into());
        }
        let size = fs::read_dir(&state.root)
            .map_err(|e| e.to_string())?
            .filter_map(Result::ok)
            .filter_map(|e| e.metadata().ok())
            .map(|m| m.len())
            .sum::<u64>();
        if size + bytes.len() as u64 > TOTAL_LIMIT {
            return Err("Storage copy exceeds size limit".into());
        }
        file.seek(SeekFrom::End(0)).map_err(|e| e.to_string())?;
        file.write_all(bytes).map_err(|e| e.to_string())
    }
    pub fn stage(&self, manifest: Manifest) -> Result<(), String> {
        let mut state = self.state.lock().unwrap();
        if !matches!(state.phase, Phase::Preparing) {
            return Err("Storage copy was already staged".into());
        }
        if manifest.databases.len() > 32 || manifest.local_storage.len() > 1024 {
            return Err("Storage copy manifest exceeds limits".into());
        }
        let mut names = std::collections::HashSet::new();
        for (index, database) in manifest.databases.iter().enumerate() {
            if !database.name.starts_with("wallpaper-") || !names.insert(&database.name) {
                return Err("Unexpected storage database".into());
            }
            let path = state.root.join(format!("database-{index}.json"));
            let bytes = fs::read(path).map_err(|e| e.to_string())?;
            if bytes.len() as u64 != database.length
                || format!("{:x}", Sha256::digest(&bytes)) != database.sha256
            {
                return Err("Storage export checksum changed".into());
            }
        }
        fs::write(
            state.root.join("manifest.json"),
            serde_json::to_vec(&manifest).map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())?;
        state.phase = Phase::Staged(manifest);
        drop(state);
        self.changed.notify_waiters();
        Ok(())
    }
    pub async fn pending(&self) -> Result<Option<Manifest>, String> {
        loop {
            let changed = self.changed.notified();
            let phase = self.state.lock().unwrap().phase.clone();
            match phase {
                Phase::Ready => return Ok(None),
                Phase::Staged(manifest) => return Ok(Some(manifest)),
                Phase::Failed(error) => return Err(error),
                Phase::Preparing => changed.await,
            }
        }
    }
    pub async fn ready(&self) -> Result<(), String> {
        loop {
            let changed = self.changed.notified();
            let phase = self.state.lock().unwrap().phase.clone();
            match phase {
                Phase::Ready => return Ok(()),
                Phase::Failed(error) => return Err(error),
                _ => changed.await,
            }
        }
    }
    pub fn read(&self, index: usize, offset: u64) -> Result<Vec<u8>, String> {
        let state = self.state.lock().unwrap();
        let Phase::Staged(manifest) = &state.phase else {
            return Err("Storage copy is not staged".into());
        };
        let database = manifest
            .databases
            .get(index)
            .ok_or("Unknown storage export")?;
        if offset > database.length {
            return Err("Storage read exceeds export".into());
        }
        let mut file = fs::File::open(state.root.join(format!("database-{index}.json")))
            .map_err(|e| e.to_string())?;
        file.seek(SeekFrom::Start(offset))
            .map_err(|e| e.to_string())?;
        let mut bytes = vec![0; ((database.length - offset) as usize).min(CHUNK_LIMIT)];
        file.read_exact(&mut bytes).map_err(|e| e.to_string())?;
        Ok(bytes)
    }
    pub fn complete(&self) -> Result<(), String> {
        let mut state = self.state.lock().unwrap();
        if !matches!(state.phase, Phase::Staged(_)) {
            return Err("Storage copy is not staged".into());
        }
        let mut file = tempfile::NamedTempFile::new_in(&state.root).map_err(|e| e.to_string())?;
        file.write_all(b"{\"version\":1}")
            .map_err(|e| e.to_string())?;
        file.persist(state.root.join("ready.json"))
            .map_err(|e| e.to_string())?;
        state.phase = Phase::Ready;
        drop(state);
        self.changed.notify_waiters();
        Ok(())
    }
    pub fn fail(&self, error: String) {
        self.state.lock().unwrap().phase = Phase::Failed(error);
        self.changed.notify_waiters();
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[tokio::test]
    async fn validates_order_and_bytes_and_keeps_exports_after_completion() {
        let folder = tempfile::tempdir().unwrap();
        let copy = Copy::default();
        assert!(!copy.setup(folder.path().to_owned()).unwrap());
        copy.append(0, 0, b"first").unwrap();
        assert!(copy.append(0, 1, b"bad").is_err());
        let database = Database {
            name: "wallpaper-settings".into(),
            length: 5,
            sha256: format!("{:x}", Sha256::digest(b"first")),
        };
        let mut manifest = Manifest {
            databases: vec![database],
            ..Default::default()
        };
        manifest.databases[0].length = 4;
        assert!(copy.stage(manifest.clone()).is_err());
        manifest.databases[0].length = 5;
        copy.stage(manifest).unwrap();
        assert_eq!(copy.read(0, 0).unwrap(), b"first");
        assert!(copy.append(0, 5, b"bad").is_err());
        copy.complete().unwrap();
        assert!(copy.pending().await.unwrap().is_none());
        assert_eq!(
            fs::read(folder.path().join("database-0.json")).unwrap(),
            b"first"
        );
        assert!(Copy::default().setup(folder.path().to_owned()).unwrap());
    }
    #[tokio::test]
    async fn reports_export_failure_instead_of_mounting_empty_settings() {
        let copy = Copy::default();
        copy.fail("export failed".into());
        assert_eq!(copy.pending().await.err().unwrap(), "export failed");
    }
}

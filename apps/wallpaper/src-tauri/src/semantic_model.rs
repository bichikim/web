use crate::model_cache::{self, Asset};
use serde::Deserialize;
use std::path::{Path, PathBuf};
use tauri::{Manager, WebviewWindow};
#[derive(Deserialize)]
struct Manifest {
    model: String,
    revision: String,
    files: Vec<File>,
}
#[derive(Deserialize)]
struct File {
    path: String,
    size: u64,
    sha256: String,
}

async fn prepare(app: &tauri::AppHandle) -> Result<PathBuf, model_cache::Error> {
    let manifest: Manifest = serde_json::from_str(include_str!("../../semantic-model.json"))?;
    let root = app
        .path()
        .app_cache_dir()?
        .join("semantic-models")
        .join(&manifest.revision);
    let directory = root.join("embeddinggemma-2");
    let previous = [
        Path::new(env!("CARGO_MANIFEST_DIR")).join("../.cache/semantic-models/embeddinggemma-2")
    ];
    for file in manifest.files {
        let asset = Asset {
            url: format!(
                "https://huggingface.co/{}/resolve/{}/{}",
                manifest.model, manifest.revision, file.path
            ),
            file: file.path,
            bytes: file.size,
            sha256: file.sha256,
        };
        model_cache::ensure(&directory, &asset, &previous).await?;
    }
    let license = directory.join("LICENSE.txt");
    if !tokio::fs::try_exists(&license).await? {
        tokio::fs::write(license, include_str!("../licenses/semantic-model.txt")).await?;
    }
    Ok(root)
}

#[tauri::command]
pub async fn prepare_semantic_model(window: WebviewWindow) -> Result<String, String> {
    if window.label() != "manager" {
        return Err("Local model preparation is only available in settings".into());
    }
    let root = prepare(window.app_handle()).await.map_err(|cause| {
        eprintln!("Local embedding model preparation failed: {cause}");
        "로컬 분석 모델을 준비하지 못했어요.".to_owned()
    })?;
    root.to_str()
        .map(str::to_owned)
        .ok_or_else(|| "Invalid local model path".to_owned())
}

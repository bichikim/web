use crate::model_cache::{self, Asset};
use serde::Deserialize;
use tauri::{Manager, WebviewWindow, ipc::Channel};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Manifest {
    revision: String,
    download_origin: String,
    files: Vec<File>,
}

#[derive(Deserialize)]
struct File {
    path: String,
    size: u64,
    sha256: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum VoiceModel {
    Full,
    Int8,
}

impl VoiceModel {
    fn directory(&self) -> &str {
        match self {
            Self::Full => "full/",
            Self::Int8 => "int8/",
        }
    }
}

async fn prepare(
    window: &WebviewWindow,
    model: VoiceModel,
    downloading: &Channel<()>,
) -> Result<String, model_cache::Error> {
    let manifest: Manifest = serde_json::from_str(include_str!("../../voice-model.json"))?;
    let directory = window
        .app_handle()
        .path()
        .app_cache_dir()?
        .join("voice-assets")
        .join(&manifest.revision);
    for file in manifest.files.into_iter().filter(|file| {
        file.path.ends_with(".onnx")
            && (file.path.starts_with("shared/") || file.path.starts_with(model.directory()))
    }) {
        let asset = Asset {
            url: format!(
                "{}/models/supertonic-3/{}/{}",
                manifest.download_origin, manifest.revision, file.path
            ),
            file: file.path,
            bytes: file.size,
            sha256: file.sha256,
        };
        model_cache::ensure_with_download(&directory, &asset, &[], || {
            let _ = downloading.send(());
        })
        .await?;
    }
    directory
        .to_str()
        .map(str::to_owned)
        .ok_or_else(|| "Invalid voice model cache path".into())
}

#[tauri::command]
pub(crate) async fn prepare_voice_model(
    window: WebviewWindow,
    model: VoiceModel,
    downloading: Channel<()>,
) -> Result<String, String> {
    if window.label() != "manager" && !window.label().starts_with("poffo-bubble-") {
        return Err("Voice models are only available in settings and speech windows".into());
    }
    prepare(&window, model, &downloading)
        .await
        .map_err(|cause| {
            eprintln!("Local voice model preparation failed: {cause}");
            "음성 모델을 준비하지 못했어요.".to_owned()
        })
}

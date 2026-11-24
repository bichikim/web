use super::{
    Error,
    asset::{self, Asset},
    runtime,
};
use serde::Deserialize;
use std::{ffi::OsString, path::Path};
use tokio::process::Command;

#[derive(Deserialize)]
struct Assets {
    buzz: Asset,
    vad: Asset,
}

pub(super) fn arguments(
    model: &Path,
    audio: &Path,
    output: &Path,
    vad: Option<&Path>,
) -> Vec<OsString> {
    let mut arguments: Vec<OsString> = [
        "--backend",
        "whisper",
        "--language",
        "ko",
        "--beam-size",
        "5",
        "--max-context",
        "0",
        "--temperature",
        "0",
        "--output-json",
        "--strict-pipeline",
    ]
    .into_iter()
    .map(OsString::from)
    .collect();
    for (flag, path) in [
        ("--model", model),
        ("--file", audio),
        ("--output-file", output),
    ] {
        arguments.extend([OsString::from(flag), path.as_os_str().to_owned()]);
    }
    if let Some(path) = vad {
        arguments.extend([
            OsString::from("--vad"),
            OsString::from("--vad-model"),
            path.as_os_str().to_owned(),
        ]);
    }
    arguments
}

#[derive(Deserialize)]
struct Transcript {
    transcription: Vec<Segment>,
}
#[derive(Deserialize)]
struct Segment {
    text: String,
}

pub(super) fn parse_transcript(bytes: &[u8]) -> Result<String, Error> {
    let result: Transcript = serde_json::from_slice(bytes).map_err(|_| Error::Unavailable)?;
    Ok(result
        .transcription
        .iter()
        .map(|segment| segment.text.trim())
        .filter(|text| !text.is_empty())
        .collect::<Vec<_>>()
        .join(" "))
}

pub(super) async fn recognize(
    executable: &Path,
    libraries: &Path,
    cache: &Path,
    vad: bool,
    audio: &[f32],
) -> Result<String, Error> {
    let recording = runtime::recording(audio)?;
    let assets: Assets = serde_json::from_str(include_str!("../../../asr-models.json"))
        .map_err(|_| Error::Unavailable)?;
    let previous = [Path::new(env!("CARGO_MANIFEST_DIR")).join("../.cache/asr-models")];
    let model = asset::ensure(cache, &assets.buzz, &previous)
        .await
        .map_err(model_error)?;
    let detector = if vad {
        Some(
            asset::ensure(cache, &assets.vad, &previous)
                .await
                .map_err(model_error)?,
        )
    } else {
        None
    };
    let output = tempfile::tempdir().map_err(|_| Error::Unavailable)?;
    let result = output.path().join("transcript");
    let mut command = Command::new(executable);
    command.args(arguments(
        &model,
        recording.path(),
        &result,
        detector.as_deref(),
    ));
    let variable = if cfg!(windows) {
        "PATH"
    } else if cfg!(target_os = "macos") {
        "DYLD_LIBRARY_PATH"
    } else {
        "LD_LIBRARY_PATH"
    };
    let mut paths = vec![libraries.to_owned()];
    if let Some(current) = std::env::var_os(variable) {
        paths.extend(std::env::split_paths(&current));
    }
    command.env(
        variable,
        std::env::join_paths(paths).map_err(|_| Error::Unavailable)?,
    );
    command.env("CRISPASR_CACHE_DIR", cache);
    let completed = runtime::execute(command).await?;
    // The pinned engine exits successfully without writing JSON when Silero finds no speech.
    if vad
        && String::from_utf8_lossy(&completed.stderr)
            .lines()
            .any(|line| line.starts_with("crispasr: warning: no speech detected in '"))
    {
        return Ok(String::new());
    }
    let bytes = tokio::fs::read(result.with_extension("json"))
        .await
        .map_err(|_| Error::Unavailable)?;
    parse_transcript(&bytes)
}

fn model_error(cause: asset::Error) -> Error {
    eprintln!("Local ASR model preparation failed: {cause}");
    Error::Unavailable
}

use super::{Error, Model};
use std::{
    io::Write,
    path::{Path, PathBuf},
    process::Stdio,
};
use tauri::Manager;
use tokio::process::Command;

const SAMPLE_RATE: usize = 16_000;
const MAXIMUM_SAMPLES: usize = SAMPLE_RATE * 62;

pub(super) fn write_wave(output: &mut impl Write, samples: &[f32]) -> Result<(), Error> {
    if samples.is_empty()
        || samples.len() > MAXIMUM_SAMPLES
        || samples.iter().any(|sample| !sample.is_finite())
    {
        return Err(Error::InvalidRequest);
    }
    let bytes = (samples.len() * 2) as u32;
    let mut header = Vec::with_capacity(44);
    header.extend_from_slice(b"RIFF");
    header.extend_from_slice(&(36 + bytes).to_le_bytes());
    header.extend_from_slice(b"WAVEfmt ");
    header.extend_from_slice(&16u32.to_le_bytes());
    header.extend_from_slice(&1u16.to_le_bytes());
    header.extend_from_slice(&1u16.to_le_bytes());
    header.extend_from_slice(&(SAMPLE_RATE as u32).to_le_bytes());
    header.extend_from_slice(&((SAMPLE_RATE * 2) as u32).to_le_bytes());
    header.extend_from_slice(&2u16.to_le_bytes());
    header.extend_from_slice(&16u16.to_le_bytes());
    header.extend_from_slice(b"data");
    header.extend_from_slice(&bytes.to_le_bytes());
    output.write_all(&header).map_err(|_| Error::Unavailable)?;
    let pcm: Vec<u8> = samples
        .iter()
        .flat_map(|sample| ((sample.clamp(-1.0, 1.0) * 32767.0).round() as i16).to_le_bytes())
        .collect();
    output.write_all(&pcm).map_err(|_| Error::Unavailable)
}

pub(super) fn whisper_executable() -> Result<PathBuf, Error> {
    let filename = if cfg!(windows) {
        "crispasr.exe"
    } else {
        "crispasr"
    };
    let bundled = std::env::current_exe()
        .map_err(|_| Error::RuntimeMissing)?
        .with_file_name(filename);
    if bundled.is_file() {
        return Ok(bundled);
    }
    #[cfg(debug_assertions)]
    {
        let platform = if cfg!(all(target_os = "macos", target_arch = "aarch64")) {
            "aarch64-apple-darwin"
        } else if cfg!(all(target_os = "macos", target_arch = "x86_64")) {
            "x86_64-apple-darwin"
        } else if cfg!(all(target_os = "windows", target_arch = "x86_64")) {
            "x86_64-pc-windows-msvc.exe"
        } else if cfg!(all(target_os = "linux", target_arch = "x86_64")) {
            "x86_64-unknown-linux-gnu"
        } else {
            return Err(Error::RuntimeMissing);
        };
        let development = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../.cache/whisper-runtime")
            .join(format!("crispasr-{platform}"));
        if development.is_file() {
            return Ok(development);
        }
    }
    Err(Error::RuntimeMissing)
}

pub(super) async fn transcribe(
    app: &tauri::AppHandle,
    model: Model,
    vad: bool,
    audio: &[f32],
) -> Result<String, Error> {
    let cache = app
        .path()
        .app_cache_dir()
        .map_err(|_| Error::Unavailable)?
        .join("asr-models");
    match model {
        Model::BuzzKorean => {
            let executable = whisper_executable()?;
            let libraries = if cfg!(debug_assertions) {
                Path::new(env!("CARGO_MANIFEST_DIR")).join("../.cache/whisper-runtime/libraries")
            } else {
                app.path()
                    .resource_dir()
                    .map_err(|_| Error::Unavailable)?
                    .join("whisper-runtime")
            };
            super::buzz::recognize(&executable, &libraries, &cache, vad, audio).await
        }
    }
}

pub(super) fn recording(audio: &[f32]) -> Result<tempfile::NamedTempFile, Error> {
    let mut recording =
        tempfile::NamedTempFile::with_suffix(".wav").map_err(|_| Error::Unavailable)?;
    write_wave(&mut recording, audio)?;
    recording.flush().map_err(|_| Error::Unavailable)?;
    Ok(recording)
}

pub(super) async fn execute(mut command: Command) -> Result<std::process::Output, Error> {
    command
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    #[cfg(windows)]
    command.creation_flags(0x08000000);
    let result = command.output().await.map_err(|cause| {
        eprintln!("Local transcription process failed: {cause}");
        Error::Unavailable
    })?;
    if !result.status.success() {
        eprintln!(
            "Local transcription failed: {}",
            String::from_utf8_lossy(&result.stderr)
        );
        return Err(Error::Unavailable);
    }
    Ok(result)
}

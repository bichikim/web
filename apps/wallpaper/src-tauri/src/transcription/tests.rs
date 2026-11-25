use super::*;

#[test]
fn accepts_buzzasr_without_accepting_retired_qwen_models() {
    assert!(serde_json::from_value::<Model>(serde_json::json!("buzzasr-korean-q8")).is_ok());
    for name in ["qwen3-asr-1.7b", "qwen3-asr-0.6b"] {
        assert!(
            serde_json::from_value::<Model>(serde_json::json!(name)).is_err(),
            "{name}"
        );
    }
}

#[test]
fn buzzasr_uses_korean_q8_with_required_silero_and_no_enhancement() {
    let arguments = buzz::arguments(
        Path::new("q8.bin"),
        Path::new("audio.wav"),
        Path::new("result"),
        Some(Path::new("silero.bin")),
    );
    for pair in [
        ["--language", "ko"],
        ["--beam-size", "5"],
        ["--max-context", "0"],
        ["--model", "q8.bin"],
        ["--vad-model", "silero.bin"],
    ] {
        assert!(arguments.windows(2).any(|current| current == pair));
    }
    assert!(
        arguments
            .iter()
            .any(|argument| argument == "--strict-pipeline")
    );
    assert!(arguments.iter().any(|argument| argument == "--vad"));
    assert!(
        !arguments
            .iter()
            .any(|argument| argument == "--enhance" || argument == "--denoise")
    );
    let without = buzz::arguments(
        Path::new("q8.bin"),
        Path::new("audio.wav"),
        Path::new("result"),
        None,
    );
    assert!(
        !without
            .iter()
            .any(|argument| argument == "--vad" || argument == "--vad-model")
    );
}

#[test]
fn buzzasr_combines_segments_and_accepts_silence_without_accepting_invalid_output() {
    assert_eq!(
        buzz::parse_transcript(
            br#"{"transcription":[{"text":" first "},{"text":""},{"text":"second"}]}"#
        )
        .unwrap(),
        "first second"
    );
    assert_eq!(
        buzz::parse_transcript(br#"{"transcription":[]}"#).unwrap(),
        ""
    );
    assert!(buzz::parse_transcript(br#"{"transcription":[{}]}"#).is_err());
    assert!(buzz::parse_transcript(b"{}").is_err());
    assert!(buzz::parse_transcript(b"not json").is_err());
}

#[tokio::test]
#[ignore = "downloads the pinned Silero VAD asset to an isolated cache"]
async fn downloads_and_reuses_verified_vad_in_an_empty_cache() {
    let manifest: serde_json::Value =
        serde_json::from_str(include_str!("../../../asr-models.json")).unwrap();
    let vad: asset::Asset = serde_json::from_value(manifest["vad"].clone()).unwrap();
    let cache = tempfile::tempdir().unwrap();
    let path = asset::ensure(cache.path(), &vad, &[]).await.unwrap();
    let bytes = tokio::fs::read(&path).await.unwrap();
    use sha2::{Digest, Sha256};
    assert_eq!(
        bytes.len() as u64,
        manifest["vad"]["bytes"].as_u64().unwrap()
    );
    assert_eq!(
        format!("{:x}", Sha256::digest(&bytes)),
        manifest["vad"]["sha256"].as_str().unwrap()
    );
    assert_eq!(asset::ensure(cache.path(), &vad, &[]).await.unwrap(), path);
    assert_eq!(std::fs::read_dir(cache.path()).unwrap().count(), 1);
}

#[tokio::test]
#[ignore = "requires prepared BuzzASR runtime and WALLPAPER_ASR_FIXTURES"]
async fn recognizes_korean_and_silence_with_buzzasr_and_silero() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("..");
    let executable = runtime::whisper_executable().unwrap();
    let libraries = root.join(".cache/whisper-runtime/libraries");
    let cache = std::path::PathBuf::from(
        std::env::var("WALLPAPER_ASR_CACHE").expect("Shared ASR cache directory"),
    );
    let fixtures = std::env::var("WALLPAPER_ASR_FIXTURES").expect("PCM fixture directory");
    for (name, expected) in [("ko", "가까운가요"), ("silence", "")] {
        let bytes = std::fs::read(Path::new(&fixtures).join(format!("{name}.f32"))).unwrap();
        let samples = bytes
            .chunks_exact(4)
            .map(|bytes| f32::from_le_bytes(bytes.try_into().unwrap()))
            .collect::<Vec<_>>();
        let text = buzz::recognize(&executable, &libraries, &cache, true, &samples)
            .await
            .unwrap();
        if expected.is_empty() {
            assert!(text.is_empty(), "{name}: {text}");
        } else {
            assert!(text.contains(expected), "{name}: {text}");
        }
        eprintln!("BuzzASR {name}: {text}");
    }
}

#[test]
fn cancellation_before_command_start_prevents_model_work() {
    let requests = Requests::default();
    let key = ("bubble".to_owned(), "request".to_owned());
    requests.cancel(key.clone());
    assert!(matches!(requests.begin(&key), Err(Error::Cancelled)));
    assert!(requests.begin(&key).is_ok());
}

#[tokio::test]
async fn window_removal_cancels_pending_work_without_blocking_other_windows() {
    let requests = Requests::default();
    let key = ("bubble".to_owned(), "request".to_owned());
    let cancelled = requests.begin(&key).unwrap();
    assert!(matches!(requests.begin(&key), Err(Error::Busy)));
    let other = ("other".to_owned(), "request".to_owned());
    let mut active = requests.begin(&other).unwrap();
    requests.remove("bubble");
    assert!(cancelled.await.is_err());
    assert!(matches!(
        active.try_recv(),
        Err(oneshot::error::TryRecvError::Empty)
    ));
    requests.finish(&other);
}

#[test]
fn writes_bounded_finite_pcm_as_mono_16khz_wave() {
    let mut wave = Vec::new();
    write_wave(&mut wave, &[0.0, 1.0, -1.0]).unwrap();
    assert_eq!(&wave[0..4], b"RIFF");
    assert_eq!(&wave[8..12], b"WAVE");
    assert_eq!(&wave[24..28], &16_000u32.to_le_bytes());
    assert_eq!(&wave[44..], &[0, 0, 255, 127, 1, 128]);
    assert!(write_wave(&mut Vec::new(), &[f32::NAN]).is_err());
    assert!(write_wave(&mut Vec::new(), &[]).is_err());
}

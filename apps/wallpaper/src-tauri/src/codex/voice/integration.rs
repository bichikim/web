use super::*;

#[test]
#[ignore = "Sends a fixed test sentence to OpenAI using the local Codex login"]
fn generates_audio_using_the_existing_codex_login() {
    let audio = tauri::async_runtime::block_on(async {
        let state = VoiceRequests::default();
        synthesize(
            state.client().unwrap(),
            "안녕하세요. 포포의 코덱스 음성 미리듣기입니다.",
            "ko",
        )
        .await
        .unwrap()
    });
    assert!(audio.len() > 1000);
    let output = std::env::temp_dir().join("poffo-codex-native-test.mp3");
    std::fs::write(&output, &audio).unwrap();
    println!(
        "Generated {} audio bytes: {}",
        audio.len(),
        output.display()
    );
}

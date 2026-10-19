use super::VoiceError;
use serde::Deserialize;

#[derive(Deserialize)]
struct Preferences {
    settings: Settings,
}

#[derive(Deserialize)]
struct Settings {
    voice_name: String,
}

pub(super) async fn selected_voice(request: reqwest::RequestBuilder) -> Result<String, VoiceError> {
    let response = request
        .header(reqwest::header::CACHE_CONTROL, "no-cache")
        .send()
        .await
        .map_err(|_| VoiceError::Network)?;
    match response.status().as_u16() {
        200 => (),
        401 | 403 => return Err(VoiceError::LoginRequired),
        429 => return Err(VoiceError::RateLimited),
        _ => return Err(VoiceError::VoiceSettings),
    }
    let preferences: Preferences = response
        .json()
        .await
        .map_err(|_| VoiceError::VoiceSettings)?;
    let voice = preferences.settings.voice_name;
    if voice.is_empty()
        || voice.len() > 128
        || !voice
            .bytes()
            .all(|value| value.is_ascii_alphanumeric() || value == b'_' || value == b'-')
    {
        return Err(VoiceError::VoiceSettings);
    }
    Ok(voice)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{
        io::{Read, Write},
        net::TcpListener,
    };

    fn fetch(bodies: &[(&str, &str)]) -> Vec<Result<String, VoiceError>> {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let address = listener.local_addr().unwrap();
        let replies: Vec<_> = bodies.iter().map(|(status, body)| format!(
            "HTTP/1.1 {status}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}", body.len()
        )).collect();
        let count = replies.len();
        let server = std::thread::spawn(move || {
            for reply in replies {
                let (mut socket, _) = listener.accept().unwrap();
                let mut bytes = [0; 4096];
                let length = socket.read(&mut bytes).unwrap();
                let request = String::from_utf8_lossy(&bytes[..length]);
                assert!(request.starts_with("GET /settings/user "));
                assert!(request.contains("cache-control: no-cache"));
                socket.write_all(reply.as_bytes()).unwrap();
            }
        });
        let results = tauri::async_runtime::block_on(async {
            let client = reqwest::Client::new();
            let mut results = Vec::new();
            for _ in 0..count {
                results.push(
                    selected_voice(client.get(format!("http://{address}/settings/user"))).await,
                );
            }
            results
        });
        server.join().unwrap();
        results
    }

    #[test]
    fn uses_the_current_account_voice_on_every_request() {
        let results = fetch(&[
            ("200 OK", r#"{"settings":{"voice_name":"haetsal"}}"#),
            ("200 OK", r#"{"settings":{"voice_name":"hanul"}}"#),
        ]);
        let voices: Vec<_> = results.into_iter().map(Result::unwrap).collect();
        assert_eq!(voices, ["haetsal", "hanul"]);
    }

    #[test]
    fn does_not_substitute_a_fixed_voice_when_settings_are_missing_or_invalid() {
        for result in fetch(&[
            ("200 OK", r#"{"settings":{}}"#),
            ("200 OK", r#"{"settings":{"voice_name":""}}"#),
            ("200 OK", r#"{"settings":{"voice_name":" invalid "}}"#),
            ("200 OK", "not json"),
            ("503 Unavailable", "{}"),
        ]) {
            assert!(matches!(result, Err(VoiceError::VoiceSettings)));
        }
    }

    #[test]
    fn preserves_login_and_rate_limit_errors() {
        let results = fetch(&[
            ("401 Unauthorized", "{}"),
            ("403 Forbidden", "{}"),
            ("429 Too Many Requests", "{}"),
        ]);
        assert!(matches!(results[0], Err(VoiceError::LoginRequired)));
        assert!(matches!(results[1], Err(VoiceError::LoginRequired)));
        assert!(matches!(results[2], Err(VoiceError::RateLimited)));
    }

    #[test]
    #[ignore = "Reads only the selected ChatGPT voice using the local Codex login"]
    fn reads_the_current_chatgpt_voice() {
        let headers = super::super::credentials(
            &std::fs::read(super::super::credentials_path().unwrap()).unwrap(),
        )
        .unwrap();
        let voice = tauri::async_runtime::block_on(selected_voice(
            reqwest::Client::new()
                .get("https://chatgpt.com/backend-api/settings/user")
                .headers(headers),
        ))
        .unwrap();
        println!("Current ChatGPT selected voice: {voice}");
    }
}

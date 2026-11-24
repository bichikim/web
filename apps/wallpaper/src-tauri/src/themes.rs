use std::sync::Mutex;
use tauri::Url;
#[cfg(target_os = "macos")]
use tauri::{AppHandle, Emitter, Manager};

const MARKET: &str = "https://themes.poffo.io";
const LOCAL_MARKET: &str = "http://127.0.0.1:3478";
const LIMIT: usize = 96 * 1024 * 1024;

#[derive(Default)]
pub(crate) struct ThemeInbox(Mutex<Option<Url>>);

fn require_settings(caller: &tauri::Webview) -> Result<(), String> {
    if caller.label() == "manager" {
        Ok(())
    } else {
        Err("Only Wallpaper settings can manage themes.".into())
    }
}

#[cfg(any(target_os = "macos", test))]
fn download_url(url: &Url) -> bool {
    let origin = url.origin().ascii_serialization();
    let known_origin = origin == MARKET || (cfg!(debug_assertions) && origin == LOCAL_MARKET);
    let Some(name) = url
        .path()
        .strip_prefix("/download/")
        .and_then(|path| path.strip_suffix(".poffotheme"))
    else {
        return false;
    };
    known_origin
        && url.username().is_empty()
        && url.password().is_none()
        && url.query().is_none()
        && url.fragment().is_none()
        && (1..=80).contains(&name.len())
        && name
            .bytes()
            .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-')
}

#[cfg(any(target_os = "macos", test))]
fn install_link(url: &Url) -> Option<Url> {
    if url.scheme() != "poffo-wallpaper"
        || url.host_str() != Some("theme")
        || url.path() != "/install"
        || !url.username().is_empty()
        || url.password().is_some()
        || url.port().is_some()
        || url.fragment().is_some()
    {
        return None;
    }
    let mut pairs = url.query_pairs();
    let (key, value) = pairs.next()?;
    if key != "url" || pairs.next().is_some() {
        return None;
    }
    let target = Url::parse(&value).ok()?;
    download_url(&target).then_some(target)
}

#[cfg(target_os = "macos")]
pub(crate) fn receive(app: &AppHandle, urls: &[Url]) {
    let Some(destination) = urls.iter().find_map(install_link) else {
        return;
    };
    let Ok(mut pending) = app.state::<ThemeInbox>().inner().0.lock() else {
        return;
    };
    *pending = Some(destination);
    drop(pending);
    if let Err(error) = crate::settings::show(app) {
        eprintln!("Could not show theme import: {error}");
    }
    if let Err(error) = app.emit_to("manager", "poffo-theme-opened", ()) {
        eprintln!("Could not notify theme import: {error}");
    }
}

#[tauri::command]
pub(crate) async fn take_theme_request(
    caller: tauri::Webview,
    inbox: tauri::State<'_, ThemeInbox>,
) -> Result<tauri::ipc::Response, String> {
    require_settings(&caller)?;
    let url = inbox
        .0
        .lock()
        .map_err(|_| "Theme inbox is unavailable.")?
        .take();
    let Some(url) = url else {
        return Ok(tauri::ipc::Response::new(Vec::<u8>::new()));
    };
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(std::time::Duration::from_secs(45))
        .build()
        .map_err(|error| error.to_string())?;
    let mut response = client
        .get(url)
        .send()
        .await
        .map_err(|error| error.to_string())?;
    if !response.status().is_success()
        || response
            .content_length()
            .is_some_and(|length| length > LIMIT as u64)
    {
        return Err("Theme download is unavailable.".into());
    }
    let mut bytes = Vec::new();
    while let Some(chunk) = response.chunk().await.map_err(|error| error.to_string())? {
        if chunk.len() > LIMIT - bytes.len() {
            return Err("Theme file exceeds its size limit.".into());
        }
        bytes.extend_from_slice(&chunk);
    }
    Ok(tauri::ipc::Response::new(bytes))
}

#[tauri::command]
pub(crate) fn open_theme_market(caller: tauri::Webview) -> Result<(), String> {
    require_settings(&caller)?;
    let url = if cfg!(debug_assertions) && std::env::var_os("POFFO_THEMES_LOCAL").is_some() {
        LOCAL_MARKET
    } else {
        MARKET
    };
    #[cfg(target_os = "macos")]
    let mut command = std::process::Command::new("open");
    #[cfg(target_os = "windows")]
    let mut command = {
        let mut command = std::process::Command::new("rundll32.exe");
        command.arg("url.dll,FileProtocolHandler");
        command
    };
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    let mut command = std::process::Command::new("xdg-open");
    command
        .arg(url)
        .spawn()
        .map(|_| ())
        .map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_only_catalog_theme_downloads() {
        let good = Url::parse("poffo-wallpaper://theme/install?url=https%3A%2F%2Fthemes.poffo.io%2Fdownload%2Fwindow-light.poffotheme").unwrap();
        assert!(install_link(&good).is_some());
        for target in [
            "https://themes.poffo.io.example.com/download/window-light.poffotheme",
            "https://themes.poffo.io/download/window-light.poffotheme?next=https://example.com",
            "https://themes.poffo.io/account",
            "file:///download/window-light.poffotheme",
        ] {
            let mut link = Url::parse("poffo-wallpaper://theme/install").unwrap();
            link.query_pairs_mut().append_pair("url", target);
            assert!(install_link(&link).is_none());
        }
    }
}

#[cfg(target_os = "macos")]
#[tauri::command]
pub(crate) async fn save_theme_archive(
    app: AppHandle,
    caller: tauri::Webview,
    request: tauri::ipc::Request<'_>,
) -> Result<bool, String> {
    use objc2::MainThreadMarker;
    use objc2_app_kit::{NSModalResponseOK, NSSavePanel};
    use objc2_foundation::NSString;

    require_settings(&caller)?;
    let tauri::ipc::InvokeBody::Raw(bytes) = request.body() else {
        return Err("Theme archive must be binary.".into());
    };
    if bytes.len() > LIMIT || bytes.len() < 4 || !bytes.starts_with(b"PK\x03\x04") {
        return Err("Invalid theme archive.".into());
    }
    let header = request
        .headers()
        .get("x-theme-name")
        .and_then(|value| value.to_str().ok())
        .unwrap_or("Wallpaper");
    let mut name = Url::parse(&format!("https://localhost/?name={header}"))
        .ok()
        .and_then(|url| url.query_pairs().next().map(|(_, name)| name.into_owned()))
        .filter(|name| !name.is_empty())
        .unwrap_or_else(|| "Wallpaper".into());
    name = name
        .chars()
        .take(120)
        .map(|character| match character {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' | '\0' => '-',
            other => other,
        })
        .collect();
    let bytes = bytes.clone();
    let (selected, result) = tokio::sync::oneshot::channel();
    app.run_on_main_thread(move || {
        let path = MainThreadMarker::new().and_then(|marker| {
            let panel = NSSavePanel::savePanel(marker);
            panel.setCanCreateDirectories(true);
            panel.setNameFieldStringValue(&NSString::from_str(&format!("{name}.poffotheme")));
            if panel.runModal() != NSModalResponseOK {
                return None;
            }
            panel
                .URL()?
                .path()
                .map(|path| std::path::PathBuf::from(path.to_string()))
        });
        let _ = selected.send(path);
    })
    .map_err(|error| error.to_string())?;
    let Some(path) = result.await.map_err(|error| error.to_string())? else {
        return Ok(false);
    };
    if path.extension().and_then(|extension| extension.to_str()) != Some("poffotheme") {
        return Err("Use the .poffotheme extension.".into());
    }
    tokio::fs::write(path, bytes)
        .await
        .map_err(|error| error.to_string())?;
    Ok(true)
}

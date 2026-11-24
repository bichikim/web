use serde::{Deserialize, Serialize};
use std::{
    collections::BTreeMap,
    sync::{Mutex, OnceLock},
};
use tauri::{AppHandle, Emitter, Manager};

const EVENT: &str = "wallpaper-interface-language";

#[derive(Clone, Copy, Default, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum Language {
    #[default]
    Ko,
    En,
}

pub(crate) struct LocaleState(Mutex<Language>);

pub(crate) fn text_for(language: Language, message: &str) -> String {
    static ENGLISH: OnceLock<BTreeMap<String, String>> = OnceLock::new();
    let english = ENGLISH.get_or_init(|| {
        serde_json::from_str(include_str!(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../.i18n/messages/en.json"
        )))
        .expect("English interface catalog must be valid JSON")
    });
    match language {
        Language::Ko => message.to_owned(),
        Language::En => english
            .get(message)
            .cloned()
            .unwrap_or_else(|| message.to_owned()),
    }
}

pub(crate) fn text(app: &AppHandle, message: &str) -> String {
    let language = app
        .try_state::<LocaleState>()
        .and_then(|state| state.0.lock().ok().map(|language| *language))
        .unwrap_or_default();
    text_for(language, message)
}

fn update_windows(app: &AppHandle, language: Language) -> Result<(), String> {
    for (label, window) in app.webview_windows() {
        let message = if label == "manager" {
            Some("Wallpaper 설정")
        } else if label.starts_with("poffo-bubble-") {
            Some("Poffo 대화")
        } else if label.starts_with("poffo-widget-") {
            Some("Poffo 위젯")
        } else {
            None
        };
        if let Some(message) = message {
            window
                .set_title(&text_for(language, message))
                .map_err(|error| error.to_string())?;
        }
    }
    crate::background::localize_windows(app, language)
}

pub(crate) fn install(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let path = app.path().app_config_dir()?.join("interface-language.json");
    let language = match std::fs::read(path) {
        Ok(bytes) => serde_json::from_slice(&bytes).unwrap_or_default(),
        Err(_) => Language::default(),
    };
    app.manage(LocaleState(Mutex::new(language)));
    update_windows(app.handle(), language)?;
    Ok(())
}

#[tauri::command]
pub(crate) fn interface_language(app: AppHandle) -> Result<Language, String> {
    app.state::<LocaleState>()
        .0
        .lock()
        .map(|language| *language)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub(crate) fn set_interface_language(app: AppHandle, language: Language) -> Result<(), String> {
    let state = app.state::<LocaleState>();
    let mut current = state.0.lock().map_err(|error| error.to_string())?;
    let directory = app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?;
    std::fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    let path = directory.join("interface-language.json");
    let temporary = directory.join("interface-language.tmp");
    let bytes = serde_json::to_vec(&language).map_err(|error| error.to_string())?;
    std::fs::write(&temporary, bytes).map_err(|error| error.to_string())?;
    std::fs::rename(&temporary, path).map_err(|error| error.to_string())?;
    *current = language;
    crate::tray::localize_menu(&app, language).map_err(|error| error.to_string())?;
    update_windows(&app, language)?;
    app.emit("desktop-surface-monitors-changed", ())
        .map_err(|error| error.to_string())?;
    app.emit(EVENT, language).map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn translates_native_ui_and_preserves_unknown_names() {
        assert_eq!(text_for(Language::En, "설정…"), "Settings…");
        assert_eq!(text_for(Language::Ko, "설정…"), "설정…");
        assert_eq!(
            text_for(Language::En, "Wallpaper 배경"),
            "Wallpaper background"
        );
        assert_eq!(text_for(Language::En, "모니터"), "Monitor");
        assert_eq!(text_for(Language::En, "custom name"), "custom name");
        assert!(serde_json::from_str::<Language>("\"fr\"").is_err());
    }
}

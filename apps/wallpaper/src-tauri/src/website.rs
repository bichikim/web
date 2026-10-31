use std::{collections::HashMap, sync::Mutex};

use serde::Deserialize;
use tauri::{AppHandle, Manager, Webview};

#[derive(Clone, Default, Deserialize)]
pub(crate) struct Customization {
    #[serde(default)]
    css: String,
    #[serde(default)]
    script: String,
}

#[derive(Default)]
pub(crate) struct WebsiteCode(Mutex<HashMap<String, Customization>>);

#[tauri::command]
pub(crate) fn configure_website(
    app: AppHandle,
    caller: Webview,
    label: String,
    customization: Customization,
) -> Result<(), String> {
    if caller.label() != "manager" {
        return Err("Only the settings window can configure website code".to_owned());
    }
    if crate::background::monitor_for_window(&app, &label).is_none()
        || app.get_webview_window(&label).is_none()
    {
        return Err("Wallpaper window is unavailable".to_owned());
    }
    app.state::<WebsiteCode>()
        .0
        .lock()
        .map_err(|error| error.to_string())?
        .insert(label, customization);
    Ok(())
}

fn css_script(css: &str) -> Result<String, serde_json::Error> {
    let css = serde_json::to_string(css)?;
    Ok(format!(
        "{{ const style = document.createElement('style'); style.id = 'wallpaper-custom-style'; style.textContent = {css}; document.getElementById(style.id)?.remove(); (document.head ?? document.documentElement).append(style); }}"
    ))
}

pub(crate) fn apply(webview: &Webview) -> Result<(), String> {
    let code = webview
        .app_handle()
        .state::<WebsiteCode>()
        .0
        .lock()
        .map_err(|error| error.to_string())?
        .get(webview.window().label())
        .cloned();
    if let Some(code) = code {
        webview
            .eval(css_script(&code.css).map_err(|error| error.to_string())?)
            .map_err(|error| error.to_string())?;
        if !code.script.trim().is_empty() {
            webview
                .eval(code.script)
                .map_err(|error| error.to_string())?;
        }
    }
    Ok(())
}

pub(crate) fn remove(app: &AppHandle, label: &str) {
    if let Ok(mut entries) = app.state::<WebsiteCode>().0.lock() {
        entries.remove(label);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn css_is_encoded_as_data_including_quotes_newlines_and_script_tags() {
        let css = "body::after { content: '\"</script>'; }\nbody { color: red; }";
        let script = css_script(css).unwrap();
        assert!(script.contains(&format!(
            "style.textContent = {};",
            serde_json::to_string(css).unwrap()
        )));
        assert!(script.contains("document.getElementById(style.id)?.remove()"));
    }
}

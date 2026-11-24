use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

use serde::Serialize;
use tauri::{AppHandle, Manager, Monitor, Webview, WebviewUrl, WebviewWindowBuilder};

#[derive(Serialize)]
pub(crate) struct WallpaperMonitor {
    id: String,
    name: String,
    x: i32,
    y: i32,
    scale: f64,
    width: u32,
    height: u32,
}

fn require_manager(caller: &Webview) -> Result<(), String> {
    if caller.label() == "manager" {
        Ok(())
    } else {
        Err("Only the settings window can manage wallpaper windows".to_owned())
    }
}

fn monitor_identity(monitors: &[Monitor], index: usize) -> WallpaperMonitor {
    let monitor = &monitors[index];
    let name = monitor
        .name()
        .cloned()
        .unwrap_or_else(|| format!("모니터 {}", index + 1));
    let duplicates = monitors
        .iter()
        .filter(|entry| entry.name() == monitor.name())
        .count();
    let id = if duplicates > 1 {
        format!("{}:{}:{}", name, monitor.position().x, monitor.position().y)
    } else {
        name.clone()
    };
    WallpaperMonitor {
        id,
        name,
        x: monitor.position().x,
        y: monitor.position().y,
        scale: monitor.scale_factor(),
        width: monitor.size().width,
        height: monitor.size().height,
    }
}

fn display_name(name: Option<&str>, index: usize, prefix: &str) -> String {
    name.map(str::to_owned)
        .unwrap_or_else(|| format!("{prefix} {}", index + 1))
}

pub(crate) fn localize_windows(
    app: &AppHandle,
    language: crate::locale::Language,
) -> Result<(), String> {
    let windows = app.webview_windows();
    if !windows.keys().any(|label| label.starts_with("wallpaper-")) {
        return Ok(());
    }
    let monitors = app
        .available_monitors()
        .map_err(|error| error.to_string())?;
    let prefix = crate::locale::text_for(language, "모니터");
    let title = crate::locale::text_for(language, "Wallpaper 배경");
    for (index, monitor) in monitors.iter().enumerate() {
        let identity = monitor_identity(&monitors, index);
        if let Some(window) = windows.get(&window_label(&identity.id)) {
            let name = display_name(monitor.name().map(String::as_str), index, &prefix);
            window
                .set_title(&format!("{title} — {name}"))
                .map_err(|error| error.to_string())?;
        }
    }
    Ok(())
}

fn window_label(monitor_id: &str) -> String {
    let mut hash = DefaultHasher::new();
    monitor_id.hash(&mut hash);
    format!("wallpaper-{:x}", hash.finish())
}

pub(crate) fn monitor_for_window(app: &AppHandle, label: &str) -> Option<String> {
    let monitors = app.available_monitors().ok()?;
    (0..monitors.len())
        .map(|index| monitor_identity(&monitors, index).id)
        .find(|id| window_label(id) == label)
}

#[tauri::command]
pub(crate) fn list_wallpaper_monitors(
    app: AppHandle,
    caller: Webview,
) -> Result<Vec<WallpaperMonitor>, String> {
    require_manager(&caller)?;
    let monitors = app
        .available_monitors()
        .map_err(|error| error.to_string())?;
    let prefix = crate::locale::text(&app, "모니터");
    Ok((0..monitors.len())
        .map(|index| {
            let mut monitor = monitor_identity(&monitors, index);
            monitor.name = display_name(monitors[index].name().map(String::as_str), index, &prefix);
            monitor
        })
        .collect())
}

#[tauri::command]
pub(crate) async fn open_background(
    app: AppHandle,
    caller: Webview,
    monitor_id: String,
    customization: Option<crate::website::Customization>,
) -> Result<String, String> {
    require_manager(&caller)?;
    let monitors = app
        .available_monitors()
        .map_err(|error| error.to_string())?;
    let index = (0..monitors.len())
        .find(|index| monitor_identity(&monitors, *index).id == monitor_id)
        .ok_or_else(|| "Wallpaper monitor is disconnected".to_owned())?;
    let label = window_label(&monitor_id);
    if app.get_webview_window(&label).is_some() {
        return Ok(label);
    }
    let monitor = &monitors[index];
    let scale = monitor.scale_factor();
    let mut url = tauri::Url::parse("https://localhost/").map_err(|error| error.to_string())?;
    url.query_pairs_mut()
        .append_pair("surface", "background")
        .append_pair("monitor", &monitor_id);
    let path = format!("index.html?{}", url.query().unwrap_or_default());
    WebviewWindowBuilder::new(&app, &label, WebviewUrl::App(path.into()))
        .initialization_script(
            crate::website::initialization_script(
                &customization.unwrap_or_default(),
                app.config()
                    .build
                    .dev_url
                    .as_ref()
                    .map(|url| url.origin().ascii_serialization()),
            )
            .map_err(|error| error.to_string())?,
        )
        .title(format!(
            "{} — {}",
            crate::locale::text(&app, "Wallpaper 배경"),
            display_name(
                monitor.name().map(String::as_str),
                index,
                &crate::locale::text(&app, "모니터"),
            )
        ))
        .position(
            f64::from(monitor.position().x) / scale,
            f64::from(monitor.position().y) / scale,
        )
        .inner_size(
            f64::from(monitor.size().width) / scale,
            f64::from(monitor.size().height) / scale,
        )
        .decorations(false)
        .resizable(false)
        .shadow(false)
        .skip_taskbar(true)
        .focused(false)
        .visible(false)
        .build()
        .map_err(|error| error.to_string())?;
    Ok(label)
}

#[tauri::command]
pub(crate) fn find_background(
    app: AppHandle,
    caller: Webview,
    monitor_id: String,
) -> Result<Option<String>, String> {
    require_manager(&caller)?;
    let label = window_label(&monitor_id);
    Ok(app.get_webview_window(&label).map(|_| label))
}

#[tauri::command]
pub(crate) async fn close_background(
    app: AppHandle,
    caller: Webview,
    monitor_id: String,
) -> Result<(), String> {
    require_manager(&caller)?;
    if let Some(window) = app.get_webview_window(&window_label(&monitor_id)) {
        let (sender, receiver) = tokio::sync::oneshot::channel();
        let sender = std::sync::Mutex::new(Some(sender));
        window.on_window_event(move |event| {
            if matches!(event, tauri::WindowEvent::Destroyed)
                && let Ok(mut sender) = sender.lock()
                && let Some(sender) = sender.take()
            {
                let _ = sender.send(());
            }
        });
        window.close().map_err(|error| error.to_string())?;
        receiver.await.map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::display_name;

    #[test]
    fn localizes_unnamed_displays_without_changing_authored_names() {
        assert_eq!(display_name(None, 1, "Monitor"), "Monitor 2");
        assert_eq!(display_name(None, 1, "모니터"), "모니터 2");
        assert_eq!(display_name(Some("나의 화면"), 1, "Monitor"), "나의 화면");
    }
}

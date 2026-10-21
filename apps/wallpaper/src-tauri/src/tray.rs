use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
};

pub(crate) fn install(app: &tauri::App) -> tauri::Result<()> {
    let settings = MenuItem::with_id(app, "settings", "설정…", true, Some("CmdOrCtrl+,"))?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Wallpaper 종료", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&settings, &separator, &quit])?;

    let tray = TrayIconBuilder::with_id("wallpaper")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .tooltip("Wallpaper")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "settings" => {
                if let Err(error) = crate::settings::show(app) {
                    eprintln!("Failed to show wallpaper settings: {error}");
                }
            }
            "quit" => app.exit(0),
            _ => {}
        });

    #[cfg(target_os = "macos")]
    let tray = tray
        .icon(tauri::include_image!("icons/tray.png"))
        .icon_as_template(true);

    #[cfg(not(target_os = "macos"))]
    let tray = tray.icon(tauri::include_image!("icons/icon.png"));

    let icon = tray.build(app)?;

    #[cfg(target_os = "macos")]
    icon.with_inner_tray_icon(|tray| {
        if let Some(item) = tray.ns_status_item() {
            // Keep the user's menu-bar placement associated with this utility across relaunches.
            item.setAutosaveName(Some(&objc2_foundation::NSString::from_str(
                "io.winterlove.wallpaper.tray",
            )));
            item.setVisible(true);
        }
    })?;

    #[cfg(not(target_os = "macos"))]
    let _ = icon;
    Ok(())
}

#[cfg(target_os = "macos")]
pub(crate) fn restore(app: &tauri::AppHandle) -> tauri::Result<()> {
    if let Some(icon) = app.tray_by_id("wallpaper") {
        icon.with_inner_tray_icon(|tray| {
            if let Some(item) = tray.ns_status_item() {
                item.setVisible(true);
            }
        })?;
    }
    Ok(())
}

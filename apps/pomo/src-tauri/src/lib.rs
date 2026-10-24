#[cfg(desktop)]
use tauri::{
    Emitter, Manager, WindowEvent,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
};

#[cfg(desktop)]
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

#[cfg(desktop)]
const MODE_EVENT: &str = "desktop-mode-requested";

#[cfg(desktop)]
fn emit_mode(app: &tauri::AppHandle, mode: &str) {
    if let Err(error) = app.emit(MODE_EVENT, mode) {
        eprintln!("failed to emit desktop mode {mode}: {error}");
    }
}

#[cfg(desktop)]
fn show_background(app: &tauri::AppHandle) {
    let Some(window) = app.get_webview_window("background") else {
        return;
    };

    if let Err(error) = window.show().and_then(|()| window.set_focus()) {
        eprintln!("failed to show the background window: {error}");
    }
}

#[cfg(desktop)]
fn preserve_background_window(window: &tauri::WebviewWindow) {
    let background = window.clone();
    window.on_window_event(move |event| {
        if let WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            if let Err(error) = background.hide() {
                eprintln!("failed to hide the background window: {error}");
            }
        }
    });
}

#[cfg(desktop)]
fn install_tray(app: &tauri::App) -> tauri::Result<()> {
    let normal = MenuItem::with_id(app, "normal", "일반 창", true, None::<&str>)?;
    let widget = MenuItem::with_id(app, "widget", "미니 위젯", true, None::<&str>)?;
    let desktop = MenuItem::with_id(app, "desktop", "바탕화면", true, None::<&str>)?;
    let interactive_desktop = MenuItem::with_id(
        app,
        "interactive-desktop",
        "인터랙티브 바탕화면",
        true,
        None::<&str>,
    )?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Pomofi 종료", true, None::<&str>)?;
    let menu = Menu::with_items(
        app,
        &[
            &normal,
            &widget,
            &desktop,
            &interactive_desktop,
            &separator,
            &quit,
        ],
    )?;

    let mut tray = TrayIconBuilder::with_id("pomofi-mode")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .tooltip("Pomofi 창 모드")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "normal" => {
                show_background(app);
                emit_mode(app, "normal");
            }
            "widget" => emit_mode(app, "widget"),
            "desktop" => emit_mode(app, "desktop"),
            "interactive-desktop" => emit_mode(app, "interactiveDesktop"),
            "quit" => app.exit(0),
            _ => {}
        });

    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }

    tray.build(app)?;
    Ok(())
}

#[cfg(desktop)]
fn install_restore_shortcut(app: &tauri::App) -> tauri::Result<()> {
    let restore_shortcut = Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyP);
    let registered_shortcut = restore_shortcut.clone();

    app.handle().plugin(
        tauri_plugin_global_shortcut::Builder::new()
            .with_handler(move |app, shortcut, event| {
                if shortcut == &registered_shortcut && event.state() == ShortcutState::Pressed {
                    show_background(app);
                    emit_mode(app, "normal");
                }
            })
            .build(),
    )?;
    if let Err(error) = app.global_shortcut().register(restore_shortcut) {
        eprintln!("failed to register the optional restore shortcut: {error}");
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    #[cfg(desktop)]
    let builder = builder
        .plugin(tauri_plugin_desktop_surface::init())
        .setup(|app| {
            install_tray(app)?;
            install_restore_shortcut(app)?;

            if let Some(window) = app.get_webview_window("background") {
                preserve_background_window(&window);
                window.show()?;
                window.set_focus()?;
            }

            Ok(())
        });

    builder
        .run(tauri::generate_context!())
        .expect("Pomofi runtime failed");
}

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use tauri::Manager;

mod background;
mod codex;
mod hit_test;
mod navigation;
mod poffo;
mod poffo_resize;
mod settings;
mod tracking;
mod tray;

fn main() {
    if codex::relay::command_mode() || codex::questions::protocol::command_mode() {
        return;
    }
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_desktop_surface::init())
        .manage(hit_test::HitRegions::default())
        .manage(tracking::CursorSubscribers::default())
        .manage(codex::Bridge::default())
        .manage(codex::prompt::Delivery::default())
        .manage(codex::voice::VoiceRequests::default())
        .invoke_handler(tauri::generate_handler![
            background::list_wallpaper_monitors,
            background::open_background,
            background::find_background,
            background::close_background,
            poffo::open_poffo_widget,
            poffo::close_poffo_widget,
            poffo_resize::start_poffo_resize,
            hit_test::set_widget_hit_region,
            hit_test::clear_widget_hit_region,
            tracking::subscribe_poffo_cursor,
            codex::codex_bridge_status,
            codex::signals::poffo_agent_state,
            codex::connect_codex_notifications,
            codex::disconnect_codex_notifications,
            codex::questions::runtime::configure_codex_questions,
            codex::questions::runtime::answer_codex_question,
            codex::prompt::send_codex_prompt,
            codex::configure_poffo_speech,
            codex::poffo_speech_target,
            codex::resize_poffo_speech,
            codex::dismiss_poffo_speech,
            codex::codex_thread_title,
            codex::decision::decide_codex_approval,
            codex::voice::synthesize_codex_voice,
            codex::voice::codex_voice_login_status,
            codex::voice::cancel_codex_voice,
            codex::voice::live::start_codex_live_voice,
            codex::voice::live::attach_codex_live_voice,
            codex::voice::live::close_codex_live_voice,
        ])
        .on_page_load(navigation::page_loaded)
        .setup(|app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            tray::install(app)?;
            if let Err(error) = codex::start(app.handle()) {
                eprintln!("Poffo Codex notifications unavailable: {error}");
            }
            if let Err(error) = hit_test::start(app.handle()) {
                eprintln!("Poffo pointer monitoring unavailable: {error}");
            }
            settings::show(app.handle())?;
            Ok(())
        })
        .on_window_event(|window, event| {
            settings::handle_window_event(window, event);
            if matches!(event, tauri::WindowEvent::Destroyed) {
                hit_test::remove(window.app_handle(), window.label());
                tracking::remove(window.app_handle(), window.label());
                codex::removed(window.app_handle(), window.label());
                window
                    .app_handle()
                    .state::<codex::voice::VoiceRequests>()
                    .remove(window.label());
            }
            if matches!(
                event,
                tauri::WindowEvent::Moved(_) | tauri::WindowEvent::Resized(_)
            ) {
                hit_test::refresh(window.app_handle());
                codex::moved(window.app_handle(), window.label());
            }
        })
        .build(tauri::generate_context!())
        .expect("Wallpaper runtime failed");

    app.run(|app, event| {
        if matches!(event, tauri::RunEvent::Exit) {
            hit_test::stop();
        }
        #[cfg(target_os = "macos")]
        if matches!(
            event,
            tauri::RunEvent::Ready | tauri::RunEvent::Reopen { .. }
        ) && let Err(error) = tray::restore(app)
        {
            eprintln!("Failed to restore wallpaper menu-bar icon: {error}");
        }

        #[cfg(target_os = "macos")]
        if let tauri::RunEvent::Reopen { .. } = event
            && let Err(error) = settings::show(app)
        {
            eprintln!("Failed to reopen wallpaper settings: {error}");
        }

        #[cfg(not(target_os = "macos"))]
        let _ = (app, event);
    });
}

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use tauri::Manager;

mod background;
mod codex;
mod conversation_model;
mod frontend;
mod hit_test;
mod locale;
mod microphone_shortcut;
mod model_cache;
#[cfg(any(target_os = "macos", windows))]
mod native_widget;
mod navigation;
mod poffo;
mod poffo_resize;
#[cfg(target_os = "macos")]
mod refresh_rate;
mod semantic_model;
mod settings;
mod themes;
mod tracking;
mod transcription;
mod tray;
mod voice_model;
mod website;

fn main() {
    if codex::relay::command_mode() || codex::questions::protocol::command_mode() {
        return;
    }
    let mut context = tauri::generate_context!();
    let frontend =
        frontend::Frontend::configure(&mut context).expect("Cannot prepare isolated frontend");
    let builder = tauri::Builder::default()
        .manage(frontend)
        .manage(themes::ThemeInbox::default())
        .plugin(tauri_plugin_desktop_surface::init())
        .manage(hit_test::HitRegions::default())
        .manage(microphone_shortcut::Target::default())
        .manage(tracking::CursorSubscribers::default())
        .manage(codex::Bridge::default())
        .manage(codex::prompt::Delivery::default())
        .manage(codex::voice::VoiceRequests::default())
        .manage(codex::conversation::Requests::default())
        .manage(transcription::Requests::default());
    #[cfg(any(target_os = "macos", windows))]
    let builder = builder.manage(native_widget::NativeWidgets::default());
    let app = builder
        .invoke_handler(tauri::generate_handler![
            themes::take_theme_request,
            themes::open_theme_market,
            #[cfg(target_os = "macos")]
            themes::save_theme_archive,
            frontend::append_storage_export,
            frontend::stage_storage_copy,
            frontend::pending_storage_copy,
            frontend::read_storage_export,
            frontend::complete_storage_copy,
            frontend::fail_storage_copy,
            locale::interface_language,
            locale::set_interface_language,
            conversation_model::prepare_conversation_model,
            semantic_model::prepare_semantic_model,
            voice_model::prepare_voice_model,
            transcription::transcribe_local_audio,
            transcription::cancel_local_transcription,
            background::list_wallpaper_monitors,
            background::open_background,
            background::find_background,
            background::close_background,
            #[cfg(any(target_os = "macos", windows))]
            native_widget::native_widget_backend,
            #[cfg(any(target_os = "macos", windows))]
            native_widget::open_widget_native,
            #[cfg(any(target_os = "macos", windows))]
            native_widget::play_widget_native,
            #[cfg(any(target_os = "macos", windows))]
            native_widget::present_widget_native,
            #[cfg(any(target_os = "macos", windows))]
            native_widget::read_widget_native_alpha,
            #[cfg(any(target_os = "macos", windows))]
            native_widget::release_widget_native,
            #[cfg(any(target_os = "macos", windows))]
            native_widget::close_widget_native,
            poffo::open_poffo_widget,
            poffo::close_poffo_widget,
            poffo_resize::start_poffo_resize,
            hit_test::set_widget_hit_region,
            hit_test::clear_widget_hit_region,
            tracking::subscribe_poffo_cursor,
            codex::codex_bridge_status,
            codex::signals::poffo_agent_state,
            codex::signals::select_poffo_speech,
            codex::connect_codex_notifications,
            codex::disconnect_codex_notifications,
            codex::questions::runtime::configure_codex_questions,
            codex::questions::runtime::answer_codex_question,
            codex::prompt::send_codex_prompt,
            codex::chat::open_codex_chat,
            codex::configure_poffo_speech,
            codex::move_poffo_speech,
            codex::poffo_speech_target,
            codex::resize_poffo_speech,
            codex::dismiss_poffo_speech,
            codex::codex_thread_title,
            codex::decision::decide_codex_approval,
            codex::voice::synthesize_codex_voice,
            codex::conversation::list_codex_conversation_models,
            codex::conversation::generate_codex_conversation,
            codex::conversation::cancel_codex_conversation,
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

            app.state::<frontend::Frontend>().start(app.handle())?;
            locale::install(app)?;
            tray::install(app)?;
            if let Err(error) = codex::start(app.handle()) {
                eprintln!("Poffo Codex notifications unavailable: {error}");
            }
            if let Err(error) = hit_test::start(app.handle()) {
                eprintln!("Poffo pointer monitoring unavailable: {error}");
            }
            if let Err(error) = microphone_shortcut::install(app.handle()) {
                eprintln!("Poffo microphone shortcut unavailable: {error}");
            }
            settings::show(app.handle())?;
            Ok(())
        })
        .on_window_event(|window, event| {
            settings::handle_window_event(window, event);
            if matches!(event, tauri::WindowEvent::Focused(true)) {
                microphone_shortcut::select(window.app_handle(), window.label());
            }
            if matches!(event, tauri::WindowEvent::Destroyed) {
                #[cfg(any(target_os = "macos", windows))]
                native_widget::close_window(window.app_handle(), window.label());
                hit_test::remove(window.app_handle(), window.label());
                microphone_shortcut::remove(window.app_handle(), window.label());
                tracking::remove(window.app_handle(), window.label());
                codex::removed(window.app_handle(), window.label());
                window
                    .app_handle()
                    .state::<codex::conversation::Requests>()
                    .remove(window.label());
                window
                    .app_handle()
                    .state::<codex::voice::VoiceRequests>()
                    .remove(window.label());
                window
                    .app_handle()
                    .state::<transcription::Requests>()
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
        .build(context)
        .expect("Wallpaper runtime failed");

    app.run(|app, event| {
        #[cfg(target_os = "macos")]
        if let tauri::RunEvent::Opened { urls } = &event {
            themes::receive(app, urls);
        }
        if matches!(event, tauri::RunEvent::Exit) {
            hit_test::stop();
            app.state::<frontend::Frontend>().stop();
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

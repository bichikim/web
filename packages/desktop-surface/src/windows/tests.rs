use super::*;
use std::sync::Arc;
use tauri::WebviewWindowBuilder;

fn verify(window: &Window<tauri::Wry>) -> Result<()> {
    let state = SurfaceState::default();
    let webview = window
        .app_handle()
        .get_webview("probe")
        .ok_or_else(|| failure("probe webview missing"))?;
    let original = baseline(&state, window)?;
    for _ in 0..2 {
        set_widget(&state, window, 420.0, 520.0, Some(20.0))?;
        let logical = window
            .inner_size()?
            .to_logical::<f64>(window.scale_factor()?);
        assert_eq!(logical, LogicalSize::new(420.0, 520.0));
        assert!(window.is_always_on_top()?);
        assert!(!window.is_decorated()?);
        restore(&state, window, &webview)?;
        assert_eq!(window.inner_size()?, original.size);
        assert_eq!(window.outer_position()?, original.position);
        for interaction in [
            BackgroundInteraction::PassThrough,
            BackgroundInteraction::Interactive,
        ] {
            set_background(&state, window, interaction)?;
            assert_eq!(
                get_background_interaction(&state, window.label())?,
                interaction
            );
            let monitor = window
                .current_monitor()?
                .ok_or_else(|| failure("monitor missing"))?;
            assert_eq!(window.inner_size()?, *monitor.size());
            native(window, move |hwnd| unsafe {
                assert!(GetParent(hwnd).is_ok());
                assert_ne!(GetWindowLongPtrW(hwnd, GWL_STYLE) & WS_CHILD.0 as isize, 0);
                let transparent =
                    GetWindowLongPtrW(hwnd, GWL_EXSTYLE) & WS_EX_TRANSPARENT.0 as isize != 0;
                assert_eq!(
                    transparent,
                    interaction == BackgroundInteraction::PassThrough
                );
                Ok(())
            })?;
        }
        restore(&state, window, &webview)?;
        assert_eq!(window.inner_size()?, original.size);
        assert_eq!(window.outer_position()?, original.position);
        assert_eq!(window.is_decorated()?, original.decorated);
        assert_eq!(window.is_resizable()?, original.resizable);
        assert_eq!(window.is_always_on_top()?, original.topmost);
        native(window, move |hwnd| unsafe {
            assert_eq!(
                GetParent(hwnd).unwrap_or_default().0 as usize,
                original.parent
            );
            assert_eq!(
                GetWindowLongPtrW(hwnd, GWL_STYLE) & WS_CHILD.0 as isize,
                original.style & WS_CHILD.0 as isize
            );
            assert_eq!(
                GetWindowLongPtrW(hwnd, GWL_EXSTYLE)
                    & (WS_EX_TRANSPARENT.0 | WS_EX_TOOLWINDOW.0) as isize,
                original.extended_style & (WS_EX_TRANSPARENT.0 | WS_EX_TOOLWINDOW.0) as isize
            );
            Ok(())
        })?;
    }
    Ok(())
}

#[test]
#[ignore = "requires an unlocked interactive Windows desktop with Explorer"]
fn native_modes_restore_original_window() {
    let outcome = Arc::new(Mutex::new(None));
    let result = outcome.clone();
    tauri::Builder::<tauri::Wry>::default()
        .any_thread()
        .setup(move |app| {
            let window = WebviewWindowBuilder::new(
                app,
                "probe",
                WebviewUrl::External(Url::parse("about:blank").unwrap()),
            )
            .title("Pomofi Windows surface test")
            .inner_size(800.0, 600.0)
            .position(120.0, 100.0)
            .build()?;
            let app = app.handle().clone();
            std::thread::spawn(move || {
                let tested = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                    verify(&AsRef::<Webview<tauri::Wry>>::as_ref(&window).window())
                }));
                *result.lock().unwrap() = Some(match tested {
                    Ok(result) => result.map_err(|error| error.to_string()),
                    Err(_) => Err("native window assertion failed".to_owned()),
                });
                app.exit(0);
            });
            Ok(())
        })
        .build(tauri::test::mock_context(tauri::test::noop_assets()))
        .expect("build Windows host")
        .run_return(|_, _| {});
    outcome
        .lock()
        .unwrap()
        .take()
        .expect("test completed")
        .expect("native mode round trips");
}

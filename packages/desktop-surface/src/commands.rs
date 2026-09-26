use tauri::{AppHandle, Manager, Runtime, Webview, WebviewUrl, WebviewWindowBuilder, Window};

use crate::{
    SurfaceState,
    error::{CommandError, Error},
    model::{
        BackgroundInteraction, BackgroundInteractionOptions, BackgroundMouseEventOptions,
        BackgroundNavigationOptions, BackgroundSurfaceOptions, ControlSurfaceOptions,
        ControlSurfaceStatus, ValidatedBackgroundMouseEvent, ValidatedBackgroundNavigation,
        ValidatedControlSurface, ValidatedWidgetSurface, WidgetSurfaceOptions, validate_label,
    },
};

fn find_window<R: Runtime>(app: &AppHandle<R>, label: String) -> Result<Window<R>, CommandError> {
    let label = validate_label(label)?;

    app.get_webview(&label)
        .map(|webview| webview.window())
        .ok_or_else(|| Error::WindowNotFound(label).into())
}

fn find_webview<R: Runtime>(app: &AppHandle<R>, label: String) -> Result<Webview<R>, CommandError> {
    let label = validate_label(label)?;

    app.get_webview(&label)
        .ok_or_else(|| Error::WindowNotFound(label).into())
}

#[tauri::command]
pub(crate) async fn get_background_interaction<R: Runtime>(
    app: AppHandle<R>,
    state: tauri::State<'_, SurfaceState>,
    label: String,
) -> Result<BackgroundInteraction, CommandError> {
    let window = find_window(&app, label)?;

    #[cfg(any(target_os = "macos", target_os = "windows"))]
    return crate::platform::get_background_interaction(&state, window.label()).map_err(Into::into);

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    Err(Error::UnsupportedPlatform(std::env::consts::OS).into())
}

#[tauri::command]
pub(crate) async fn set_background_interaction<R: Runtime>(
    app: AppHandle<R>,
    state: tauri::State<'_, SurfaceState>,
    options: BackgroundInteractionOptions,
) -> Result<(), CommandError> {
    let window = find_window(&app, options.label)?;

    #[cfg(any(target_os = "macos", target_os = "windows"))]
    return crate::platform::set_background_interaction(&state, &window, options.interaction)
        .map_err(Into::into);

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    Err(Error::UnsupportedPlatform(std::env::consts::OS).into())
}

#[tauri::command]
pub(crate) async fn set_background_surface<R: Runtime>(
    app: AppHandle<R>,
    state: tauri::State<'_, SurfaceState>,
    options: BackgroundSurfaceOptions,
) -> Result<(), CommandError> {
    let window = find_window(&app, options.label)?;
    let interaction = options
        .interaction
        .unwrap_or(BackgroundInteraction::Interactive);

    #[cfg(any(target_os = "macos", target_os = "windows"))]
    return crate::platform::set_background(&state, &window, interaction).map_err(Into::into);

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    Err(Error::UnsupportedPlatform(std::env::consts::OS).into())
}

#[tauri::command]
pub(crate) async fn navigate_background_surface<R: Runtime>(
    app: AppHandle<R>,
    state: tauri::State<'_, SurfaceState>,
    options: BackgroundNavigationOptions,
) -> Result<(), CommandError> {
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    return Err(Error::UnsupportedPlatform(std::env::consts::OS).into());

    #[cfg(any(target_os = "macos", target_os = "windows"))]
    {
        let options = ValidatedBackgroundNavigation::try_from(options)?;
        let webview = find_webview(&app, options.label)?;
        let window = webview.window();
        crate::platform::navigate_background_surface(
            &state,
            &window,
            &webview,
            options.url,
            options.use_child,
        )
        .map_err(Into::into)
    }
}

#[tauri::command]
pub(crate) async fn forward_background_mouse_event<R: Runtime>(
    app: AppHandle<R>,
    state: tauri::State<'_, SurfaceState>,
    options: BackgroundMouseEventOptions,
) -> Result<(), CommandError> {
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    return Err(Error::UnsupportedPlatform(std::env::consts::OS).into());

    #[cfg(any(target_os = "macos", target_os = "windows"))]
    {
        let options = ValidatedBackgroundMouseEvent::try_from(options)?;
        let webview = find_webview(&app, options.label.clone())?;
        crate::platform::forward_background_mouse_event(&state, &webview, options)
            .map_err(Into::into)
    }
}

#[tauri::command]
pub(crate) async fn restore_background_content<R: Runtime>(
    app: AppHandle<R>,
    state: tauri::State<'_, SurfaceState>,
    label: String,
) -> Result<(), CommandError> {
    #[cfg(any(target_os = "macos", target_os = "windows"))]
    {
        let webview = find_webview(&app, label)?;
        let window = webview.window();
        crate::platform::restore_background_content(&state, &window, &webview).map_err(Into::into)
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let _ = find_window(&app, label)?;
        Err(Error::UnsupportedPlatform(std::env::consts::OS).into())
    }
}

#[tauri::command]
pub(crate) async fn restore_surface<R: Runtime>(
    app: AppHandle<R>,
    state: tauri::State<'_, SurfaceState>,
    label: String,
) -> Result<(), CommandError> {
    let webview = find_webview(&app, label)?;
    let window = webview.window();

    #[cfg(any(target_os = "macos", target_os = "windows"))]
    return crate::platform::restore(&state, &window, &webview).map_err(Into::into);

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    Err(Error::UnsupportedPlatform(std::env::consts::OS).into())
}

#[tauri::command]
pub(crate) async fn set_widget_surface<R: Runtime>(
    app: AppHandle<R>,
    state: tauri::State<'_, SurfaceState>,
    options: WidgetSurfaceOptions,
) -> Result<(), CommandError> {
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    return Err(Error::UnsupportedPlatform(std::env::consts::OS).into());

    #[cfg(any(target_os = "macos", target_os = "windows"))]
    {
        let options = ValidatedWidgetSurface::try_from(options)?;
        let window = find_window(&app, options.label.clone())?;
        crate::platform::set_widget(
            &state,
            &window,
            options.width,
            options.height,
            options.corner_radius,
        )
        .map_err(Into::into)
    }
}

#[tauri::command]
pub(crate) async fn open_control_surface<R: Runtime>(
    app: AppHandle<R>,
    options: ControlSurfaceOptions,
) -> Result<ControlSurfaceStatus, CommandError> {
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    return Err(Error::UnsupportedPlatform(std::env::consts::OS).into());

    #[cfg(any(target_os = "macos", target_os = "windows"))]
    {
        let options = ValidatedControlSurface::try_from(options)?;

        if let Some(window) = app.get_webview_window(&options.label) {
            window.set_visible_on_all_workspaces(false)?;
            if let Some(corner_radius) = options.corner_radius {
                crate::platform::set_control_surface_corner_radius(&window, corner_radius)?;
            }
            crate::platform::set_control_surface_shadow(&window)?;
            window.show()?;
            window.set_focus()?;
            return Ok(ControlSurfaceStatus { created: false });
        }

        let mut builder =
            WebviewWindowBuilder::new(&app, &options.label, WebviewUrl::App(options.path))
                .accept_first_mouse(true)
                .decorations(false)
                .focused(true)
                .inner_size(options.width, options.height)
                .resizable(false)
                .shadow(true)
                .skip_taskbar(true)
                .transparent(true)
                .visible_on_all_workspaces(false);

        if let Some((x, y)) = options.position {
            builder = builder.position(x, y);
        } else {
            builder = builder.center();
        }

        let window = builder.build()?;
        if let Some(corner_radius) = options.corner_radius {
            crate::platform::set_control_surface_corner_radius(&window, corner_radius)?;
        }
        crate::platform::set_control_surface_shadow(&window)?;
        window.show()?;
        window.set_focus()?;

        Ok(ControlSurfaceStatus { created: true })
    }
}

#[tauri::command]
pub(crate) async fn close_control_surface<R: Runtime>(
    app: AppHandle<R>,
    label: String,
) -> Result<(), CommandError> {
    let label = validate_label(label)?;

    if let Some(window) = app.get_webview_window(&label) {
        window.close()?;
    }

    Ok(())
}

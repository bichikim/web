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

    #[cfg(target_os = "macos")]
    return crate::macos::get_background_interaction(&state, window.label()).map_err(Into::into);

    #[cfg(not(target_os = "macos"))]
    Err(Error::UnsupportedPlatform(std::env::consts::OS).into())
}

#[tauri::command]
pub(crate) async fn set_background_interaction<R: Runtime>(
    app: AppHandle<R>,
    state: tauri::State<'_, SurfaceState>,
    options: BackgroundInteractionOptions,
) -> Result<(), CommandError> {
    let window = find_window(&app, options.label)?;

    #[cfg(target_os = "macos")]
    return crate::macos::set_background_interaction(&state, &window, options.interaction)
        .map_err(Into::into);

    #[cfg(not(target_os = "macos"))]
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

    #[cfg(target_os = "macos")]
    return crate::macos::set_background(&state, &window, interaction).map_err(Into::into);

    #[cfg(not(target_os = "macos"))]
    Err(Error::UnsupportedPlatform(std::env::consts::OS).into())
}

#[tauri::command]
pub(crate) async fn navigate_background_surface<R: Runtime>(
    app: AppHandle<R>,
    state: tauri::State<'_, SurfaceState>,
    options: BackgroundNavigationOptions,
) -> Result<(), CommandError> {
    #[cfg(not(target_os = "macos"))]
    return Err(Error::UnsupportedPlatform(std::env::consts::OS).into());

    #[cfg(target_os = "macos")]
    {
        let options = ValidatedBackgroundNavigation::try_from(options)?;
        let webview = find_webview(&app, options.label)?;
        let window = webview.window();
        crate::macos::navigate_background_surface(
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
    #[cfg(not(target_os = "macos"))]
    return Err(Error::UnsupportedPlatform(std::env::consts::OS).into());

    #[cfg(target_os = "macos")]
    {
        let options = ValidatedBackgroundMouseEvent::try_from(options)?;
        let webview = find_webview(&app, options.label.clone())?;
        crate::macos::forward_background_mouse_event(&state, &webview, options).map_err(Into::into)
    }
}

#[tauri::command]
pub(crate) async fn restore_background_content<R: Runtime>(
    app: AppHandle<R>,
    state: tauri::State<'_, SurfaceState>,
    label: String,
) -> Result<(), CommandError> {
    #[cfg(target_os = "macos")]
    {
        let webview = find_webview(&app, label)?;
        let window = webview.window();
        crate::macos::restore_background_content(&state, &window, &webview).map_err(Into::into)
    }

    #[cfg(not(target_os = "macos"))]
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

    #[cfg(target_os = "macos")]
    return crate::macos::restore(&state, &window, &webview).map_err(Into::into);

    #[cfg(not(target_os = "macos"))]
    Err(Error::UnsupportedPlatform(std::env::consts::OS).into())
}

#[tauri::command]
pub(crate) async fn set_widget_surface<R: Runtime>(
    app: AppHandle<R>,
    state: tauri::State<'_, SurfaceState>,
    options: WidgetSurfaceOptions,
) -> Result<(), CommandError> {
    #[cfg(not(target_os = "macos"))]
    return Err(Error::UnsupportedPlatform(std::env::consts::OS).into());

    #[cfg(target_os = "macos")]
    {
        let options = ValidatedWidgetSurface::try_from(options)?;
        let window = find_window(&app, options.label.clone())?;
        crate::macos::set_widget(
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
    #[cfg(not(target_os = "macos"))]
    return Err(Error::UnsupportedPlatform(std::env::consts::OS).into());

    #[cfg(target_os = "macos")]
    {
        let options = ValidatedControlSurface::try_from(options)?;

        if let Some(window) = app.get_webview_window(&options.label) {
            window.set_visible_on_all_workspaces(false)?;
            if let Some(corner_radius) = options.corner_radius {
                crate::macos::set_control_surface_corner_radius(&window, corner_radius)?;
            }
            crate::macos::set_control_surface_shadow(&window)?;
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
            crate::macos::set_control_surface_corner_radius(&window, corner_radius)?;
        }
        crate::macos::set_control_surface_shadow(&window)?;
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

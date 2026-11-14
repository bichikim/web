use objc2_app_kit::{NSColor, NSView, NSWindowOrderingMode};
use tauri::{LogicalPosition, Runtime, Url, Webview, WebviewBuilder, WebviewUrl, Window};

use super::{
    NativeWindowHandle, SurfaceState, active_background_interaction, lock_operation,
    reset_surface_corner_radius, with_native_window,
};
use crate::{
    error::{Error, Result},
    model::ValidatedBackgroundMouseEvent,
};

const WEBSITE_BACKGROUND_WEBVIEW_SUFFIX: &str = "__website_background";

fn website_background_webview_label(window_label: &str) -> String {
    format!("{window_label}{WEBSITE_BACKGROUND_WEBVIEW_SUFFIX}")
}

fn set_surface_transparent<W: NativeWindowHandle>(window: &W) -> Result<()> {
    with_native_window(window, |window| {
        window.setOpaque(false);
        let clear = NSColor::clearColor();
        window.setBackgroundColor(Some(&clear));
    })?;

    Ok(())
}

pub(super) fn close_website_background<R: Runtime>(window: &Window<R>) -> Result<()> {
    let label = website_background_webview_label(window.label());

    if let Some(webview) = window
        .webviews()
        .into_iter()
        .find(|webview| webview.label() == label)
    {
        webview.close()?;
    }

    Ok(())
}

fn place_website_background_below<R: Runtime>(
    window: &Window<R>,
    child: &Webview<R>,
) -> Result<()> {
    let main_webview = window
        .webviews()
        .into_iter()
        .find(|webview| webview.label() == window.label())
        .ok_or_else(|| {
            Error::WindowOperation(format!("main webview '{}' was not found", window.label()))
        })?;
    let child = child.clone();

    main_webview.with_webview(move |main_platform_webview| {
        let main_view = main_platform_webview.inner() as usize;
        if let Err(error) = child.with_webview(move |child_platform_webview| {
            // The child is created after the app webview, so explicitly move it below the
            // existing app view instead of relying on AppKit's insertion order.
            let main_view = unsafe { &*(main_view as *const NSView) };
            let child_view = unsafe { &*(child_platform_webview.inner() as *const NSView) };
            let Some(parent_view) =
                (unsafe { child_view.superview() }).or_else(|| unsafe { main_view.superview() })
            else {
                return;
            };

            parent_view.addSubview_positioned_relativeTo(
                child_view,
                NSWindowOrderingMode::Below,
                Some(main_view),
            );
        }) {
            eprintln!("failed to place website background below the app view: {error}");
        }
    })?;

    Ok(())
}

pub(crate) fn forward_background_mouse_event<R: Runtime>(
    state: &SurfaceState,
    main_webview: &Webview<R>,
    event: ValidatedBackgroundMouseEvent,
) -> Result<()> {
    let _operation = lock_operation(state)?;
    let parent = main_webview.window();
    let label = website_background_webview_label(main_webview.label());
    let Some(child) = parent
        .webviews()
        .into_iter()
        .find(|webview| webview.label() == label)
    else {
        return Ok(());
    };

    child.eval(crate::pointer::website_mouse_event_script(&event))?;

    Ok(())
}

pub(super) fn restore_background_content_unlocked<R: Runtime>(
    state: &SurfaceState,
    window: &Window<R>,
    main_webview: &Webview<R>,
) -> Result<()> {
    close_website_background(window)?;
    reset_surface_corner_radius(window)?;

    let original_url = state
        .background_urls
        .lock()
        .map_err(|error| Error::WindowOperation(error.to_string()))?
        .get(window.label())
        .cloned();

    if let Some(original_url) = original_url {
        main_webview.navigate(original_url)?;
        state
            .background_urls
            .lock()
            .map_err(|error| Error::WindowOperation(error.to_string()))?
            .remove(window.label());
    }

    Ok(())
}

fn navigate_background_unlocked<R: Runtime>(
    state: &SurfaceState,
    window: &Window<R>,
    main_webview: &Webview<R>,
    url: Url,
) -> Result<()> {
    close_website_background(window)?;
    let label = window.label().to_owned();
    active_background_interaction(state, &label)?;
    let original_url = main_webview.url()?;
    let inserted = {
        let mut background_urls = state
            .background_urls
            .lock()
            .map_err(|error| Error::WindowOperation(error.to_string()))?;
        if background_urls.contains_key(&label) {
            false
        } else {
            background_urls.insert(label.clone(), original_url);
            true
        }
    };

    if let Err(error) = main_webview.navigate(url) {
        if inserted {
            state
                .background_urls
                .lock()
                .map_err(|lock_error| Error::WindowOperation(lock_error.to_string()))?
                .remove(&label);
        }
        return Err(error.into());
    }

    Ok(())
}

pub(crate) fn navigate_background_surface<R: Runtime>(
    state: &SurfaceState,
    window: &Window<R>,
    main_webview: &Webview<R>,
    url: Url,
    use_child: bool,
) -> Result<()> {
    let _operation = lock_operation(state)?;

    if use_child {
        return navigate_website_background_unlocked(window, url);
    }

    match active_background_interaction(state, window.label()) {
        Ok(_) => navigate_background_unlocked(state, window, main_webview, url),
        Err(Error::NotBackgroundSurface(_)) => navigate_website_background_unlocked(window, url),
        Err(error) => Err(error),
    }
}

fn navigate_website_background_unlocked<R: Runtime>(window: &Window<R>, url: Url) -> Result<()> {
    let label = website_background_webview_label(window.label());
    let child = if let Some(child) = window
        .webviews()
        .into_iter()
        .find(|webview| webview.label() == label)
    {
        child.navigate(url)?;
        child
    } else {
        window.add_child(
            WebviewBuilder::new(&label, WebviewUrl::External(url))
                .auto_resize()
                .focused(false),
            LogicalPosition::new(0, 0),
            window.inner_size()?,
        )?
    };

    place_website_background_below(window, &child)?;
    set_surface_transparent(window)?;
    child.show()?;
    Ok(())
}

pub(crate) fn restore_background_content<R: Runtime>(
    state: &SurfaceState,
    window: &Window<R>,
    main_webview: &Webview<R>,
) -> Result<()> {
    let _operation = lock_operation(state)?;
    restore_background_content_unlocked(state, window, main_webview)
}

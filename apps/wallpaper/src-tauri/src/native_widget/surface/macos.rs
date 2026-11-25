use objc2::{MainThreadMarker, MainThreadOnly, rc::Retained, rc::autoreleasepool};
use objc2_app_kit::{NSAutoresizingMaskOptions, NSView, NSWindowOrderingMode};
use objc2_quartz_core::CAMetalLayer;
use poffo_gpu::native::NativeRenderer;
use std::{cell::RefCell, collections::HashMap};
use tauri::{AppHandle, Webview};

thread_local! {
    static VIEWS: RefCell<HashMap<String, (String, Retained<NSView>)>> = RefCell::default();
}

pub(super) const BACKEND: &str = "metal";
pub(super) type Target = usize;

pub(super) fn render_scope<T>(operation: impl FnOnce() -> T) -> T {
    autoreleasepool(|_| operation())
}

pub(super) async fn open(
    target: Target,
    size: [u32; 2],
    metadata: &str,
) -> Result<NativeRenderer, String> {
    // attach transfers one retained reference, independent of the window lifetime.
    let layer =
        unsafe { Retained::from_raw(target as *mut CAMetalLayer) }.ok_or("Missing Metal layer")?;
    unsafe {
        NativeRenderer::from_metal_layer(Retained::as_ptr(&layer).cast_mut().cast(), size, metadata)
    }
    .await
}

pub(super) async fn attach(caller: &Webview, id: String) -> Result<Target, String> {
    let label = caller.label().to_owned();
    let (send, receive) = tokio::sync::oneshot::channel();
    caller
        .with_webview(move |surface| {
            let result = autoreleasepool(|_| {
                let main = MainThreadMarker::new()
                    .ok_or("Metal layer must be installed on the main thread")?;
                // with_webview lends a live WKWebView on AppKit's main thread.
                let webview = unsafe { surface.inner().cast::<NSView>().as_ref() }
                    .ok_or("Missing widget view")?;
                let parent = unsafe { webview.superview() }.ok_or("Missing widget parent view")?;
                let view = NSView::initWithFrame(NSView::alloc(main), webview.frame());
                view.setAutoresizingMask(
                    NSAutoresizingMaskOptions::ViewWidthSizable
                        | NSAutoresizingMaskOptions::ViewHeightSizable,
                );
                let layer = CAMetalLayer::new();
                layer.setOpaque(false);
                view.setWantsLayer(true);
                view.setLayer(Some(&layer));
                parent.addSubview_positioned_relativeTo(
                    &view,
                    NSWindowOrderingMode::Below,
                    Some(webview),
                );
                VIEWS.with_borrow_mut(|views| {
                    views.insert(id, (label, view));
                });
                // Give the setup task one retained reference in case the widget closes first.
                Ok(Retained::into_raw(layer) as usize)
            });
            let _ = send.send(result);
        })
        .map_err(|error| error.to_string())?;
    receive.await.map_err(|error| error.to_string())?
}

pub(super) fn detach(app: &AppHandle, id: String) {
    let _ = app.run_on_main_thread(move || {
        VIEWS.with_borrow_mut(|views| {
            if let Some((_, view)) = views.remove(&id) {
                view.removeFromSuperview();
            }
        });
    });
}

pub(super) fn detach_window(app: &AppHandle, label: String) {
    let _ = app.run_on_main_thread(move || {
        VIEWS.with_borrow_mut(|views| {
            views.retain(|_, (owner, view)| {
                let keep = owner != &label;
                if !keep {
                    view.removeFromSuperview();
                }
                keep
            });
        });
    });
}

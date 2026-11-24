use poffo_gpu::native::NativeRenderer;
use tauri::{Webview, Window};

pub(super) const BACKEND: &str = "dx12";
pub(super) type Target = Window;

pub(super) fn render_scope<T>(operation: impl FnOnce() -> T) -> T {
    operation()
}

pub(super) async fn attach(caller: &Webview, _: String) -> Result<Target, String> {
    let window = caller.window();
    window.hwnd().map_err(|error| error.to_string())?;
    Ok(window)
}

pub(super) async fn open(
    target: Target,
    size: [u32; 2],
    metadata: &str,
) -> Result<NativeRenderer, String> {
    NativeRenderer::from_dx12_window(target, size, metadata).await
}

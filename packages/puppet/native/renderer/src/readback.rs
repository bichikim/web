//! Maps only the geometry feedback and alpha buffers requested by the caller.

#[cfg(target_os = "macos")]
mod metal;

#[cfg(target_os = "macos")]
pub(crate) use metal::submit_and_map;

#[cfg(any(target_arch = "wasm32", windows))]
pub(crate) async fn submit_and_map(
    device: &wgpu::Device,
    queue: &wgpu::Queue,
    commands: wgpu::CommandBuffer,
    buffer: &wgpu::Buffer,
    size: u64,
) -> Result<(), String> {
    queue.submit([commands]);
    map(device, &buffer.slice(0..size)).await
}

#[cfg(not(target_arch = "wasm32"))]
pub(crate) async fn map(
    device: &wgpu::Device,
    slice: &wgpu::BufferSlice<'_>,
) -> Result<(), String> {
    map_after(device, slice, wgpu::PollType::wait_indefinitely())
}

#[cfg(not(target_arch = "wasm32"))]
fn map_after(
    device: &wgpu::Device,
    slice: &wgpu::BufferSlice<'_>,
    completion: wgpu::PollType,
) -> Result<(), String> {
    let (send, receive) = std::sync::mpsc::channel();
    slice.map_async(wgpu::MapMode::Read, move |result| {
        let _ = send.send(result);
    });
    device.poll(completion).map_err(|error| error.to_string())?;
    receive
        .recv()
        .map_err(|error| error.to_string())?
        .map_err(|error| error.to_string())
}

#[cfg(target_arch = "wasm32")]
pub(crate) async fn map(_: &wgpu::Device, slice: &wgpu::BufferSlice<'_>) -> Result<(), String> {
    use wasm_bindgen::JsValue;
    let completion = js_sys::Promise::new(&mut |resolve, reject| {
        slice.map_async(wgpu::MapMode::Read, move |result| match result {
            Ok(()) => {
                let _ = resolve.call0(&JsValue::UNDEFINED);
            }
            Err(error) => {
                let _ = reject.call1(&JsValue::UNDEFINED, &JsValue::from_str(&error.to_string()));
            }
        });
    });
    wasm_bindgen_futures::JsFuture::from(completion)
        .await
        .map(|_| ())
        .map_err(|error| {
            error
                .as_string()
                .unwrap_or_else(|| "GPU readback failed".into())
        })
}

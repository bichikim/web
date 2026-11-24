//! Byte-oriented ABI with an optional imported thread pool and no numerical callbacks.
#[cfg(feature = "parallel")]
pub use wasm_bindgen_rayon::init_thread_pool;
#[cfg(feature = "parallel")]
#[wasm_bindgen::prelude::wasm_bindgen]
pub fn worker_thread_count() -> usize {
    poffo_runtime::parallel_threads()
}

use poffo_runtime::WorkerRuntime;
pub struct Worker {
    runtime: WorkerRuntime,
    input: Vec<u8>,
    output: Vec<u8>,
    arrays: Vec<Vec<f64>>,
}
/// # Safety
/// The input buffer previously returned by worker_input must contain the runtime section
/// and the handle must be live and exclusively owned by the calling Worker.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn worker_initialize_section(worker: *mut Worker, id: u32, defer: u32) {
    // SAFETY: the calling Worker has finished copying and relinquished its input view.
    let worker = unsafe { &mut *worker };
    worker
        .runtime
        .write_runtime_section(&worker.input, id, defer != 0, &mut worker.output);
    worker.input = Vec::new();
}
#[unsafe(no_mangle)]
pub extern "C" fn worker_new() -> *mut Worker {
    Box::into_raw(Box::new(Worker {
        runtime: WorkerRuntime::default(),
        input: Vec::new(),
        output: Vec::new(),
        arrays: Vec::new(),
    }))
}
/// # Safety
/// The handle must be live, returned by `worker_new`, and exclusively owned by the
/// calling Worker. Input views must be released before allocation or processing;
/// output views are borrowed only until the next mutation. Drop consumes the handle.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn worker_drop(worker: *mut Worker) {
    // SAFETY: the host passes a live handle from worker_new exactly once for disposal.
    if !worker.is_null() {
        drop(unsafe { Box::from_raw(worker) });
    }
}
/// # Safety
/// The handle must be live, returned by `worker_new`, and exclusively owned by the
/// calling Worker. Input views must be released before allocation or processing;
/// output views are borrowed only until the next mutation. Drop consumes the handle.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn worker_input(worker: *mut Worker, length: usize) -> *mut u8 {
    // SAFETY: handles are host-owned and calls are serialized by the Worker message queue.
    let worker = unsafe { &mut *worker };
    worker.input.resize(length, 0);
    worker.input.as_mut_ptr()
}
/// # Safety
/// The handle must be live, returned by `worker_new`, and exclusively owned by the
/// calling Worker. Input views must be released before allocation or processing;
/// output views are borrowed only until the next mutation. Drop consumes the handle.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn worker_process(worker: *mut Worker) {
    // SAFETY: the host completed its input copy before calling, with no retained memory views.
    let worker = unsafe { &mut *worker };
    worker
        .runtime
        .write_packed_json(&worker.input, &worker.arrays, &mut worker.output);
    worker.arrays.clear();
    if worker.input.capacity() > 1_048_576 {
        worker.input = Vec::new();
    }
}
/// # Safety
/// The handle must be live, returned by `worker_new`, and exclusively owned by the
/// calling Worker. Input views must be released before allocation or processing;
/// output views are borrowed only until the next mutation. Drop consumes the handle.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn worker_output(worker: *const Worker) -> *const u8 {
    // SAFETY: a live handle, read after worker_process, before the next mutation.
    unsafe { (&*worker).output.as_ptr() }
}
/// # Safety
/// The handle must be live, returned by `worker_new`, and exclusively owned by the
/// calling Worker. Input views must be released before allocation or processing;
/// output views are borrowed only until the next mutation. Drop consumes the handle.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn worker_output_length(worker: *const Worker) -> usize {
    // SAFETY: a live handle, read after worker_process, before the next mutation.
    unsafe { (&*worker).output.len() }
}
/// # Safety
/// The handle must be live, returned by `worker_new`, and exclusively owned by the
/// calling Worker. Input views must be released before allocation or processing;
/// output views are borrowed only until the next mutation. Drop consumes the handle.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn worker_vertices(worker: *const Worker) -> *const f32 {
    // SAFETY: a live handle, read after worker_process, before the next mutation.
    unsafe { (&*worker).runtime.vertices().as_ptr() }
}
/// # Safety
/// The handle must be live, returned by `worker_new`, and exclusively owned by the
/// calling Worker. Input views must be released before allocation or processing;
/// output views are borrowed only until the next mutation. Drop consumes the handle.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn worker_vertices_length(worker: *const Worker) -> usize {
    // SAFETY: a live handle, read after worker_process, before the next mutation.
    unsafe { (&*worker).runtime.vertices().len() }
}

/// # Safety
/// The handle must be live, returned by `worker_new`, and exclusively owned by the
/// calling Worker. Input views must be released before allocation or processing;
/// output views are borrowed only until the next mutation. Drop consumes the handle.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn worker_array(
    worker: *mut Worker,
    index: usize,
    length: usize,
) -> *mut f64 {
    // SAFETY: the host passes its live handle, sequential indices, then fills the reserved
    // region before any further allocation or worker_process call can invalidate the view.
    let worker = unsafe { &mut *worker };
    worker.arrays.resize_with(index + 1, Vec::new);
    worker.arrays[index].resize(length, 0.0);
    worker.arrays[index].as_mut_ptr()
}

/// # Safety
/// The handle must be live and exclusively owned; the view expires on its next mutation.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn worker_parts(worker: *const Worker) -> *const f64 {
    // SAFETY: the host only reads a live handle between processing calls.
    unsafe { (&*worker).runtime.part_values().as_ptr() }
}
/// # Safety
/// The handle must be live and exclusively owned.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn worker_parts_length(worker: *const Worker) -> usize {
    // SAFETY: the host only reads a live handle between processing calls.
    unsafe { (&*worker).runtime.part_values().len() }
}
/// # Safety
/// The handle must be live and exclusively owned; the view expires on its next mutation.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn worker_layers(worker: *const Worker) -> *const f64 {
    // SAFETY: the host only reads a live handle between processing calls.
    unsafe { (&*worker).runtime.layer_values().as_ptr() }
}
/// # Safety
/// The handle must be live and exclusively owned.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn worker_layers_length(worker: *const Worker) -> usize {
    // SAFETY: the host only reads a live handle between processing calls.
    unsafe { (&*worker).runtime.layer_values().len() }
}

/// # Safety
/// The handle is live and exclusively owned; finish the pending frame before another process call.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn worker_geometry_pending(worker: *const Worker) -> u32 {
    u32::from(unsafe { (&*worker).runtime.geometry_pending() })
}
/// # Safety
/// The handle is live and exclusively owned; the borrowed view expires on mutation.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn worker_geometry_commands(worker: *const Worker) -> *const u32 {
    unsafe { (&*worker).runtime.geometry_commands().as_ptr() }
}
/// # Safety
/// The handle is live and exclusively owned.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn worker_geometry_commands_length(worker: *const Worker) -> usize {
    unsafe { (&*worker).runtime.geometry_commands().len() }
}
/// # Safety
/// The handle is live and exclusively owned; the borrowed view expires on mutation.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn worker_geometry_values(worker: *const Worker) -> *const f32 {
    unsafe { (&*worker).runtime.geometry_values().as_ptr() }
}
/// # Safety
/// The handle is live and exclusively owned.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn worker_geometry_values_length(worker: *const Worker) -> usize {
    unsafe { (&*worker).runtime.geometry_values().len() }
}
/// # Safety
/// The handle is live and exclusively owned; write exactly the allocated count before finishing.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn worker_geometry_corrections(
    worker: *mut Worker,
    id: u32,
    length: usize,
) -> *mut u32 {
    unsafe {
        (&mut *worker)
            .runtime
            .geometry_corrections(id, length)
            .map_or(std::ptr::null_mut(), |values| values.as_mut_ptr())
    }
}
/// # Safety
/// The handle is live and exclusively owned. The latest produced frame has not been detached.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn worker_geometry_take(worker: *mut Worker) -> u32 {
    unsafe { (&mut *worker).runtime.take_geometry().unwrap_or(0) }
}
/// # Safety
/// The handle and frame ticket are live; replace exactly this frame's vertex count.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn worker_geometry_input(worker: *mut Worker, id: u32) -> *mut f32 {
    unsafe {
        (&mut *worker)
            .runtime
            .geometry_input(id)
            .map_or(std::ptr::null_mut(), |values| values.as_mut_ptr())
    }
}
/// # Safety
/// The handle and frame ticket are live; read before the slot is reused.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn worker_geometry_output(worker: *const Worker, id: u32) -> *const f32 {
    unsafe {
        (&*worker)
            .runtime
            .geometry_output(id)
            .map_or(std::ptr::null(), |values| values.as_ptr())
    }
}
/// # Safety
/// The handle and frame ticket are live.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn worker_geometry_length(worker: *const Worker, id: u32) -> usize {
    unsafe {
        (&*worker)
            .runtime
            .geometry_output(id)
            .map_or(0, |values| values.len())
    }
}
/// # Safety
/// The ticket is live and its device output and correction indices have been copied.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn worker_finish_geometry(worker: *mut Worker, id: u32, all: u32) -> u32 {
    u32::from(unsafe { (&mut *worker).runtime.finish_geometry(id, all != 0).is_ok() })
}

/// # Safety
/// The runtime is live; the returned borrowed layout expires on document replacement.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn worker_geometry_layout(worker: *mut Worker) -> *const f64 {
    unsafe { (&mut *worker).runtime.geometry_layout().as_ptr() }
}
/// # Safety
/// The runtime is live and exclusively owned.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn worker_geometry_layout_length(worker: *mut Worker) -> usize {
    unsafe { (&mut *worker).runtime.geometry_layout().len() }
}
/// # Safety
/// The frame is active; the returned borrowed packet expires on completion or slot reuse.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn worker_geometry_packet(worker: *const Worker, id: u32) -> *const f64 {
    unsafe {
        (&*worker)
            .runtime
            .geometry_packet(id)
            .map_or(std::ptr::null(), |p| p.as_ptr())
    }
}
/// # Safety
/// The runtime and frame are live.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn worker_geometry_packet_length(worker: *const Worker, id: u32) -> usize {
    unsafe {
        (&*worker)
            .runtime
            .geometry_packet(id)
            .map_or(0, |p| p.len())
    }
}
/// # Safety
/// The frame is live and, unless discarded, its pre-Glue coordinates have been copied into its input.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn worker_cache_geometry(worker: *mut Worker, id: u32, discard: u32) -> u32 {
    unsafe {
        u32::from(
            (&mut *worker)
                .runtime
                .cache_geometry(id, discard != 0)
                .is_ok(),
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    struct OwnedWorker(*mut Worker);
    impl Drop for OwnedWorker {
        fn drop(&mut self) {
            // The test owns the handle and releases it once, including assertion failures.
            unsafe { worker_drop(self.0) }
        }
    }
    impl OwnedWorker {
        fn send(&self, message: &[u8]) -> (usize, String) {
            // No borrowed memory view survives input allocation or processing.
            unsafe {
                let input = worker_input(self.0, message.len());
                std::ptr::copy_nonoverlapping(message.as_ptr(), input, message.len());
                worker_process(self.0);
                let output = worker_output(self.0);
                let bytes = std::slice::from_raw_parts(output, worker_output_length(self.0));
                (
                    output as usize,
                    std::str::from_utf8(bytes).unwrap().to_owned(),
                )
            }
        }
    }

    #[test]
    fn equal_sized_replies_reuse_storage_without_appending_previous_output() {
        let worker = OwnedWorker(worker_new());
        let (first, original) = worker.send(br#"{"id":1,"kind":"produce","request":{}}"#);
        let (second, current) = worker.send(br#"{"id":2,"kind":"produce","request":{}}"#);
        let mut expected: serde_json::Value = serde_json::from_str(&original).unwrap();
        assert_eq!(expected["id"], 1);
        assert_eq!(expected["kind"], "error");
        expected["id"] = serde_json::json!(2);
        assert_eq!(
            serde_json::from_str::<serde_json::Value>(&current).unwrap(),
            expected
        );
        assert_eq!(original.len(), current.len());
        assert_eq!(first, second);
    }
}

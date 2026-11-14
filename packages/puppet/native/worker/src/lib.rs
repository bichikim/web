//! Byte-oriented ABI. No JavaScript imports or numerical callbacks.
use poffo_runtime::WorkerRuntime;
pub struct Worker {
    runtime: WorkerRuntime,
    input: Vec<u8>,
    output: Vec<u8>,
    arrays: Vec<Vec<f64>>,
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
    worker.output = worker.runtime.process_json(&worker.input, &worker.arrays);
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

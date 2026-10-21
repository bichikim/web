use std::sync::{Mutex, OnceLock};
use tauri::{AppHandle, WebviewWindow};
use windows::Win32::{
    Foundation::{HINSTANCE, LPARAM, LRESULT, WPARAM},
    System::{LibraryLoader::GetModuleHandleW, Threading::GetCurrentThreadId},
    UI::{
        Input::KeyboardAndMouse::{GetAsyncKeyState, VK_LBUTTON, VK_MBUTTON, VK_RBUTTON},
        WindowsAndMessaging::{
            CallNextHookEx, DispatchMessageW, GetMessageW, MSG, PostThreadMessageW,
            SetWindowsHookExW, TranslateMessage, UnhookWindowsHookEx, WH_MOUSE_LL, WM_QUIT,
        },
    },
};

static APPLICATION: OnceLock<AppHandle> = OnceLock::new();
static MONITOR: Mutex<Option<(u32, std::thread::JoinHandle<()>)>> = Mutex::new(None);

unsafe extern "system" fn pointer_event(code: i32, message: WPARAM, data: LPARAM) -> LRESULT {
    if code >= 0 {
        if let Some(app) = APPLICATION.get() {
            let handle = app.clone();
            let _ = app.run_on_main_thread(move || super::refresh(&handle));
        }
    }
    unsafe { CallNextHookEx(None, code, message, data) }
}

pub(super) fn install(app: &AppHandle) -> Result<(), String> {
    APPLICATION
        .set(app.clone())
        .map_err(|_| "Pointer monitor already started".to_owned())?;
    let (send, receive) = std::sync::mpsc::channel();
    let thread = std::thread::spawn(move || {
        let installed = unsafe {
            GetModuleHandleW(windows::core::PCWSTR::null()).and_then(|module| {
                SetWindowsHookExW(
                    WH_MOUSE_LL,
                    Some(pointer_event),
                    Some(HINSTANCE(module.0)),
                    0,
                )
            })
        };
        match installed {
            Ok(hook) => {
                let id = unsafe { GetCurrentThreadId() };
                let mut message = MSG::default();
                unsafe {
                    windows::Win32::UI::WindowsAndMessaging::PeekMessageW(
                        &mut message,
                        None,
                        0,
                        0,
                        windows::Win32::UI::WindowsAndMessaging::PM_NOREMOVE,
                    );
                }
                let _ = send.send(Ok(id));
                unsafe {
                    while GetMessageW(&mut message, None, 0, 0).0 > 0 {
                        let _ = TranslateMessage(&message);
                        DispatchMessageW(&message);
                    }
                    let _ = UnhookWindowsHookEx(hook);
                }
            }
            Err(error) => {
                let _ = send.send(Err(error.to_string()));
            }
        }
    });
    match receive.recv().map_err(|error| error.to_string())? {
        Ok(id) => {
            *MONITOR.lock().map_err(|error| error.to_string())? = Some((id, thread));
            Ok(())
        }
        Err(error) => {
            let _ = thread.join();
            Err(error)
        }
    }
}

pub(crate) fn local_pointer(window: &WebviewWindow) -> Result<(f64, f64, f64, f64), String> {
    let cursor = window
        .cursor_position()
        .map_err(|error| error.to_string())?;
    let origin = window.inner_position().map_err(|error| error.to_string())?;
    let size = window.inner_size().map_err(|error| error.to_string())?;
    Ok((
        cursor.x - f64::from(origin.x),
        cursor.y - f64::from(origin.y),
        f64::from(size.width),
        f64::from(size.height),
    ))
}

pub(super) fn pressed() -> bool {
    unsafe {
        GetAsyncKeyState(i32::from(VK_LBUTTON.0)) < 0
            || GetAsyncKeyState(i32::from(VK_RBUTTON.0)) < 0
            || GetAsyncKeyState(i32::from(VK_MBUTTON.0)) < 0
    }
}

pub(super) fn shutdown() {
    if let Ok(mut monitor) = MONITOR.lock() {
        if let Some((id, thread)) = monitor.take() {
            unsafe {
                let _ = PostThreadMessageW(id, WM_QUIT, WPARAM(0), LPARAM(0));
            }
            let _ = thread.join();
        }
    }
}

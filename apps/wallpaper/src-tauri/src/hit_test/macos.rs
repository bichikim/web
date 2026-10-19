use block2::RcBlock;
use objc2::{rc::Retained, runtime::AnyObject};
use objc2_app_kit::{NSEvent, NSEventMask, NSWindow};
use std::{cell::RefCell, ptr::NonNull};
use tauri::{AppHandle, WebviewWindow};

struct Monitors {
    global: Retained<AnyObject>,
    local: Retained<AnyObject>,
}
thread_local! { static MONITORS: RefCell<Option<Monitors>> = const { RefCell::new(None) }; }

pub(super) fn install(app: &AppHandle) -> Result<(), String> {
    let mask = NSEventMask::MouseMoved
        | NSEventMask::LeftMouseDragged
        | NSEventMask::RightMouseDragged
        | NSEventMask::LeftMouseUp
        | NSEventMask::RightMouseUp
        | NSEventMask::OtherMouseUp;
    let global_app = app.clone();
    let global_block = RcBlock::new(move |event: NonNull<NSEvent>| {
        crate::poffo_resize::handle_event(unsafe { event.as_ref() });
        super::refresh(&global_app);
    });
    let global = NSEvent::addGlobalMonitorForEventsMatchingMask_handler(mask, &global_block)
        .ok_or_else(|| "Cannot monitor pointer movement outside Poffo widgets".to_owned())?;
    let local_app = app.clone();
    let local_block = RcBlock::new(move |event: NonNull<NSEvent>| {
        crate::poffo_resize::handle_event(unsafe { event.as_ref() });
        super::refresh(&local_app);
        event.as_ptr()
    });
    let local = unsafe {
        NSEvent::addLocalMonitorForEventsMatchingMask_handler(
            mask | NSEventMask::KeyDown,
            &local_block,
        )
    };
    let Some(local) = local else {
        unsafe { NSEvent::removeMonitor(&global) };
        return Err("Cannot monitor pointer movement inside Poffo widgets".to_owned());
    };
    MONITORS.with(|monitors| *monitors.borrow_mut() = Some(Monitors { global, local }));
    Ok(())
}

pub(crate) fn local_pointer(window: &WebviewWindow) -> Result<(f64, f64, f64, f64), String> {
    let pointer = window.ns_window().map_err(|error| error.to_string())?;
    let native = unsafe { &*(pointer.cast::<NSWindow>()) };
    let frame = native.frame();
    let point = NSEvent::mouseLocation();
    Ok((
        point.x - frame.origin.x,
        frame.origin.y + frame.size.height - point.y,
        frame.size.width,
        frame.size.height,
    ))
}

pub(super) fn pressed() -> bool {
    NSEvent::pressedMouseButtons() != 0
}

pub(super) fn shutdown() {
    MONITORS.with(|monitors| {
        if let Some(monitors) = monitors.borrow_mut().take() {
            unsafe {
                NSEvent::removeMonitor(&monitors.global);
                NSEvent::removeMonitor(&monitors.local);
            }
        }
    });
}

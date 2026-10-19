use super::{Direction, frame::resize_frame};
use objc2::rc::Retained;
use objc2_app_kit::{NSEvent, NSEventType, NSWindow};
use objc2_foundation::{NSPoint, NSRect};
use std::cell::RefCell;
use tauri::Window;

#[derive(Clone)]
struct ResizeDrag {
    window: Retained<NSWindow>,
    frame: NSRect,
    pointer: NSPoint,
    direction: Direction,
}

thread_local! { static DRAG: RefCell<Option<ResizeDrag>> = const { RefCell::new(None) }; }

pub(super) fn begin(window: &Window, direction: Direction) -> Result<(), String> {
    if !window.is_resizable().map_err(|error| error.to_string())? {
        return Err("Poffo resize mode is not active".to_owned());
    }
    if NSEvent::pressedMouseButtons() & 1 == 0 {
        return Ok(());
    }
    let pointer = window.ns_window().map_err(|error| error.to_string())?;
    let native = unsafe { Retained::retain(pointer.cast::<NSWindow>()) }
        .ok_or_else(|| "Poffo widget window is unavailable".to_owned())?;
    let drag = ResizeDrag {
        frame: native.frame(),
        pointer: NSEvent::mouseLocation(),
        window: native,
        direction,
    };
    DRAG.with(|current| *current.borrow_mut() = Some(drag));
    Ok(())
}

pub(crate) fn handle_event(event: &NSEvent) {
    let kind = event.r#type();
    if kind == NSEventType::KeyDown && event.keyCode() == 53 {
        DRAG.with(|current| current.borrow_mut().take());
        return;
    }
    if kind != NSEventType::LeftMouseDragged && kind != NSEventType::LeftMouseUp {
        return;
    }
    let drag = DRAG.with(|current| {
        if kind == NSEventType::LeftMouseUp {
            current.borrow_mut().take()
        } else {
            current.borrow().clone()
        }
    });
    let Some(drag) = drag else { return };
    if !drag.window.isVisible() {
        DRAG.with(|current| current.borrow_mut().take());
        return;
    }
    let pointer = NSEvent::mouseLocation();
    let frame = resize_frame(
        drag.frame,
        drag.direction,
        NSPoint::new(pointer.x - drag.pointer.x, pointer.y - drag.pointer.y),
        drag.window.contentMinSize(),
        drag.window.contentMaxSize(),
    );
    drag.window.setFrame_display(frame, true);
}

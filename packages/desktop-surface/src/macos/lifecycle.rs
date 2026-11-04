use std::{
    ptr::NonNull,
    sync::{
        atomic::Ordering,
        mpsc::{Sender, channel},
    },
};

use block2::RcBlock;
use objc2_app_kit::{
    NSApplicationDidChangeScreenParametersNotification, NSWorkspace,
    NSWorkspaceDidWakeNotification, NSWorkspaceScreensDidSleepNotification,
    NSWorkspaceScreensDidWakeNotification, NSWorkspaceSessionDidBecomeActiveNotification,
    NSWorkspaceSessionDidResignActiveNotification, NSWorkspaceWillSleepNotification,
};
use objc2_foundation::{NSNotification, NSNotificationCenter, NSNotificationName};
use tauri::{AppHandle, Emitter, Manager, Runtime};

use super::{
    SurfaceState, apply_background, backgrounds, lock_operation, set_background_state,
    show_background_surface,
};
use crate::error::Result;

#[derive(Clone, Copy)]
enum LifecycleAction {
    Refresh,
    Resume,
    Suspend,
}

fn refresh_backgrounds_unlocked<R: Runtime>(
    app: &AppHandle<R>,
    state: &SurfaceState,
) -> Result<()> {
    for (label, interaction) in backgrounds(state)? {
        let Some(window) = app.get_webview(&label).map(|webview| webview.window()) else {
            set_background_state(state, &label, None)?;
            continue;
        };

        apply_background(&window, interaction)?;
        show_background_surface(&window, interaction)?;
    }

    Ok(())
}

fn refresh_backgrounds<R: Runtime>(app: &AppHandle<R>, state: &SurfaceState) -> Result<()> {
    let _operation = lock_operation(state)?;
    if state.suspended.load(Ordering::Acquire) {
        return Ok(());
    }

    refresh_backgrounds_unlocked(app, state)
}

fn suspend_backgrounds<R: Runtime>(app: &AppHandle<R>, state: &SurfaceState) -> Result<()> {
    let _operation = lock_operation(state)?;
    state.suspended.store(true, Ordering::Release);

    for (label, _) in backgrounds(state)? {
        if let Some(window) = app.get_webview(&label).map(|webview| webview.window()) {
            window.hide()?;
        }
    }

    Ok(())
}

fn resume_backgrounds<R: Runtime>(app: &AppHandle<R>, state: &SurfaceState) -> Result<()> {
    let _operation = lock_operation(state)?;
    state.suspended.store(false, Ordering::Release);
    refresh_backgrounds_unlocked(app, state)
}

fn observe(
    center: &NSNotificationCenter,
    name: &'static NSNotificationName,
    sender: Sender<LifecycleAction>,
    action: LifecycleAction,
) {
    let handler = RcBlock::new(move |_notification: NonNull<NSNotification>| {
        if sender.send(action).is_err() {
            eprintln!("desktop surface lifecycle worker is not available");
        }
    });

    unsafe {
        center.addObserverForName_object_queue_usingBlock(Some(name), None, None, &handler);
    }
}

pub(crate) fn install_lifecycle_observers<R: Runtime>(app: AppHandle<R>) {
    let (sender, receiver) = channel();
    std::thread::spawn(move || {
        for action in receiver {
            if matches!(action, LifecycleAction::Refresh | LifecycleAction::Resume)
                && let Err(error) = app.emit("desktop-surface-monitors-changed", ())
            {
                eprintln!("desktop surface monitor notification failed: {error}");
            }
            let state = app.state::<SurfaceState>();
            let result = match action {
                LifecycleAction::Refresh => refresh_backgrounds(&app, &state),
                LifecycleAction::Resume => resume_backgrounds(&app, &state),
                LifecycleAction::Suspend => suspend_backgrounds(&app, &state),
            };

            if let Err(error) = result {
                eprintln!("desktop surface lifecycle update failed: {error}");
            }
        }
    });

    let application_center = NSNotificationCenter::defaultCenter();
    let screen_parameters_changed = unsafe { NSApplicationDidChangeScreenParametersNotification };
    observe(
        &application_center,
        screen_parameters_changed,
        sender.clone(),
        LifecycleAction::Refresh,
    );

    let workspace_center = NSWorkspace::sharedWorkspace().notificationCenter();
    let resume_notifications = unsafe {
        [
            NSWorkspaceDidWakeNotification,
            NSWorkspaceScreensDidWakeNotification,
            NSWorkspaceSessionDidBecomeActiveNotification,
        ]
    };
    for name in resume_notifications {
        observe(
            &workspace_center,
            name,
            sender.clone(),
            LifecycleAction::Resume,
        );
    }

    let suspend_notifications = unsafe {
        [
            NSWorkspaceWillSleepNotification,
            NSWorkspaceScreensDidSleepNotification,
            NSWorkspaceSessionDidResignActiveNotification,
        ]
    };
    for name in suspend_notifications {
        observe(
            &workspace_center,
            name,
            sender.clone(),
            LifecycleAction::Suspend,
        );
    }
}

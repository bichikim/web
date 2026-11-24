use objc2::{
    msg_send,
    rc::Retained,
    runtime::{AnyClass, AnyObject, Bool},
    sel,
};
use objc2_foundation::{NSArray, NSString, ns_string};
use tauri::Webview;

/// Opts into the display cadence when requested and supported by WebKit.
pub(crate) fn configure(webview: &Webview) {
    if !std::env::args_os().any(|argument| argument == "--high-refresh-rate") {
        return;
    }
    if let Err(error) = webview.with_webview(|platform| {
        let Some(class) = AnyClass::get(c"WKPreferences") else {
            return;
        };
        // WebKit exposes this feature through SPI; older versions retain their default cadence.
        unsafe {
            let available: Bool = msg_send![class, respondsToSelector: sel!(_features)];
            if !available.as_bool() {
                return;
            }
            let Some(view) = platform.inner().cast::<AnyObject>().as_ref() else {
                return;
            };
            let configuration: Retained<AnyObject> = msg_send![view, configuration];
            let preferences: Retained<AnyObject> = msg_send![&configuration, preferences];
            let available: Bool =
                msg_send![&preferences, respondsToSelector: sel!(_setEnabled:forFeature:)];
            if !available.as_bool() {
                return;
            }
            let features: Retained<NSArray<AnyObject>> = msg_send![class, _features];
            for feature in features.iter() {
                let key: Retained<NSString> = msg_send![&feature, key];
                if key.isEqualToString(ns_string!("PreferPageRenderingUpdatesNear60FPSEnabled")) {
                    let _: () =
                        msg_send![&preferences, _setEnabled: Bool::NO, forFeature: &*feature];
                    return;
                }
            }
        }
    }) {
        eprintln!("Cannot configure display refresh cadence: {error}");
    }
}

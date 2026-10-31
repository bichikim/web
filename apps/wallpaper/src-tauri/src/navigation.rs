use serde::Serialize;
use tauri::{
    Emitter, Manager, Webview,
    webview::{PageLoadEvent, PageLoadPayload},
};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WebsiteVisit {
    monitor_id: String,
    url: String,
}

pub(crate) fn page_loaded(webview: &Webview, payload: &PageLoadPayload<'_>) {
    if !matches!(payload.event(), PageLoadEvent::Finished) {
        return;
    }
    let url = payload.url();
    if !matches!(url.scheme(), "http" | "https") || url.host_str() == Some("tauri.localhost") {
        return;
    }
    if webview
        .app_handle()
        .config()
        .build
        .dev_url
        .as_ref()
        .is_some_and(|development| development.origin() == url.origin())
        && url
            .query_pairs()
            .any(|(key, value)| key == "surface" && value == "background")
    {
        return;
    }
    if let Some(monitor_id) =
        crate::background::monitor_for_window(webview.app_handle(), webview.window().label())
    {
        if let Err(error) = crate::website::apply(webview) {
            eprintln!("Failed to apply website code: {error}");
        }
        let visit = WebsiteVisit {
            monitor_id,
            url: url.as_str().to_owned(),
        };
        if let Err(error) = webview.emit_to("manager", "website-visited", visit) {
            eprintln!("Failed to record website visit: {error}");
        }
    }
}

use serde::Deserialize;
use tauri::{AppHandle, Manager, PhysicalPosition, Webview, WebviewUrl, WebviewWindowBuilder};

#[derive(Deserialize)]
pub(crate) struct WidgetOptions {
    id: String,
    x: Option<i32>,
    y: Option<i32>,
    size: Option<WidgetSize>,
}

#[derive(Deserialize)]
struct WidgetSize {
    width: f64,
    height: f64,
}

fn require_manager(caller: &Webview) -> Result<(), String> {
    if caller.label() == "manager" {
        Ok(())
    } else {
        Err("Only settings can manage Poffo widgets".to_owned())
    }
}

fn label(id: &str) -> Result<String, String> {
    if id.len() != 36
        || !id
            .chars()
            .all(|character| character.is_ascii_hexdigit() || character == '-')
    {
        return Err("Invalid Poffo widget ID".to_owned());
    }
    Ok(format!("poffo-widget-{id}"))
}

#[tauri::command]
pub(crate) async fn open_poffo_widget(
    app: AppHandle,
    caller: Webview,
    options: WidgetOptions,
) -> Result<String, String> {
    require_manager(&caller)?;
    let label = label(&options.id)?;
    if app.get_webview_window(&label).is_some() {
        return Ok(label);
    }
    let path = format!("index.html?surface=widget&widget={}", options.id);
    let size = options.size.unwrap_or(WidgetSize {
        width: 320.0,
        height: 420.0,
    });
    if !size.width.is_finite() || !size.height.is_finite() {
        return Err("Invalid Poffo widget size".to_owned());
    }
    let window = WebviewWindowBuilder::new(&app, &label, WebviewUrl::App(path.into()))
        .title("Poffo 위젯")
        .inner_size(
            size.width.clamp(160.0, 4096.0),
            size.height.clamp(210.0, 4096.0),
        )
        .min_inner_size(160.0, 210.0)
        .max_inner_size(4096.0, 4096.0)
        .decorations(false)
        .resizable(false)
        .shadow(false)
        .transparent(true)
        .always_on_top(true)
        .visible_on_all_workspaces(true)
        .skip_taskbar(true)
        // Deliver the initial press that starts dragging an inactive widget.
        .accept_first_mouse(true)
        .focused(false)
        .visible(false)
        .build()
        .map_err(|error| error.to_string())?;
    let position = options.x.zip(options.y).filter(|(x, y)| {
        app.available_monitors()
            .unwrap_or_default()
            .iter()
            .any(|monitor| {
                let origin = monitor.position();
                let size = monitor.size();
                *x >= origin.x
                    && *y >= origin.y
                    && i64::from(*x) < i64::from(origin.x) + i64::from(size.width)
                    && i64::from(*y) < i64::from(origin.y) + i64::from(size.height)
            })
    });
    if let Some((x, y)) = position {
        window
            .set_position(PhysicalPosition::new(x, y))
            .map_err(|error| error.to_string())?;
    } else {
        window.center().map_err(|error| error.to_string())?;
    }
    window.show().map_err(|error| error.to_string())?;
    Ok(label)
}

#[tauri::command]
pub(crate) async fn close_poffo_widget(
    app: AppHandle,
    caller: Webview,
    id: String,
) -> Result<(), String> {
    require_manager(&caller)?;
    if let Some(window) = app.get_webview_window(&label(&id)?) {
        window.close().map_err(|error| error.to_string())?;
    }
    Ok(())
}

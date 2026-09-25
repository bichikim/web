const COMMANDS: &[&str] = &[
    "close_control_surface",
    "forward_background_mouse_event",
    "get_background_interaction",
    "navigate_background_surface",
    "open_control_surface",
    "restore_background_content",
    "restore_surface",
    "set_background_interaction",
    "set_background_surface",
    "set_widget_surface",
];

fn main() {
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows") {
        // The real-window unit test links Tauri's TaskDialogIndirect dependency.
        println!("cargo:rustc-link-arg=/MANIFEST:EMBED");
        println!(
            "cargo:rustc-link-arg=/MANIFESTDEPENDENCY:type='win32' name='Microsoft.Windows.Common-Controls' version='6.0.0.0' processorArchitecture='*' publicKeyToken='6595b64144ccf1df' language='*'"
        );
    }
    tauri_plugin::Builder::new(COMMANDS).build();
}

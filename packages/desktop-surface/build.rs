const COMMANDS: &[&str] = &[
    "close_control_surface",
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
    tauri_plugin::Builder::new(COMMANDS).build();
}

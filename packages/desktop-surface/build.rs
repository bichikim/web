const COMMANDS: &[&str] = &[
    "close_control_surface",
    "get_background_interaction",
    "open_control_surface",
    "restore_surface",
    "set_background_interaction",
    "set_background_surface",
    "set_widget_surface",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}

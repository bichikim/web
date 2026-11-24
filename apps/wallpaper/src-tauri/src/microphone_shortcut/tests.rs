use super::*;

fn window(label: &str, visible: bool, focused: bool) -> SpeechWindow {
    SpeechWindow {
        label: label.into(),
        visible,
        focused,
    }
}

#[test]
fn targets_one_focused_or_recent_visible_bubble() {
    let windows = vec![
        window("poffo-bubble-a", true, false),
        window("poffo-bubble-b", true, true),
        window("manager", true, true),
    ];
    assert_eq!(
        select_target(Some("poffo-bubble-a"), &windows).as_deref(),
        Some("poffo-bubble-b")
    );
    let unfocused = vec![
        window("poffo-bubble-a", true, false),
        window("poffo-bubble-b", true, false),
    ];
    assert_eq!(
        select_target(Some("poffo-bubble-b"), &unfocused).as_deref(),
        Some("poffo-bubble-b")
    );
}

#[test]
fn skips_hidden_removed_and_unrelated_windows_and_uses_a_stable_fallback() {
    let windows = vec![
        window("poffo-bubble-b", true, false),
        window("manager", true, true),
        window("poffo-bubble-hidden", false, true),
        window("poffo-bubble-a", true, false),
    ];
    assert_eq!(
        select_target(Some("poffo-bubble-hidden"), &windows).as_deref(),
        Some("poffo-bubble-a")
    );
    assert_eq!(
        select_target(Some("deleted"), &windows).as_deref(),
        Some("poffo-bubble-a")
    );
    assert!(select_target(None, &[window("manager", true, true)]).is_none());
}

#[test]
fn normalizes_only_character_and_bubble_window_targets() {
    assert_eq!(
        bubble_label("poffo-widget-cat").as_deref(),
        Some("poffo-bubble-cat")
    );
    assert_eq!(
        bubble_label("poffo-bubble-cat").as_deref(),
        Some("poffo-bubble-cat")
    );
    assert!(bubble_label("manager").is_none());
    assert!(bubble_label("poffo-bubble-").is_none());
}

#[test]
fn triggers_once_per_press_and_never_on_release() {
    let target = Target::default();
    assert!(target.trigger(ShortcutState::Pressed));
    assert!(!target.trigger(ShortcutState::Pressed));
    assert!(!target.trigger(ShortcutState::Released));
    assert!(target.trigger(ShortcutState::Pressed));
}

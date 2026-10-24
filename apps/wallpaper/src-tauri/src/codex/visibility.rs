use super::activity::Activity;
use std::collections::{BTreeMap, BTreeSet};

#[derive(Default)]
pub struct Visibility(BTreeMap<String, BTreeMap<String, u64>>);

impl Visibility {
    pub fn hide(&mut self, widget: &str, activity: &Activity) {
        self.0
            .entry(widget.into())
            .or_default()
            .insert(activity.session_id.clone(), activity.notification_id);
    }

    pub fn visible(&self, widget: &str, activity: &Activity) -> bool {
        self.0
            .get(widget)
            .and_then(|items| items.get(&activity.session_id))
            != Some(&activity.notification_id)
    }

    pub fn forget(&mut self, widget: &str) {
        self.0.remove(widget);
    }

    pub fn retain(&mut self, activities: &[Activity]) {
        let ids: BTreeSet<_> = activities.iter().map(|item| &item.session_id).collect();
        for items in self.0.values_mut() {
            items.retain(|id, _| ids.contains(id));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn activity(notification_id: u64) -> Activity {
        Activity {
            tool_active: false,
            tool_failed: false,
            notification_id,
            session_id: "chat".into(),
            phase: "working".into(),
            text: "도구 실행".into(),
            tool: None,
            received_at: 1,
            response: None,
        }
    }

    #[test]
    fn closes_only_the_selected_widgets_message_until_a_new_notification() {
        let mut visibility = Visibility::default();
        visibility.hide("widget", &activity(1));
        let mut progress = activity(1);
        progress.received_at = 99;
        assert!(!visibility.visible("widget", &progress));
        assert!(visibility.visible("other-widget", &progress));
        assert!(visibility.visible("widget", &activity(2)));
        visibility.forget("widget");
        assert!(visibility.visible("widget", &progress));
    }

    #[test]
    fn discards_hidden_revisions_when_the_session_is_evicted() {
        let mut visibility = Visibility::default();
        visibility.hide("widget", &activity(1));
        visibility.retain(&[]);
        assert!(visibility.visible("widget", &activity(1)));
    }
}

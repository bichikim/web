# Preference editing

`usePreferenceEditor` composes the existing provider-owned `usePreference` with
`createPreferenceSaveQueue`. It owns one mounted editor's optimistic saves, committed-value
overlay after failures, and synchronization with later stored values. Values must be
non-nullable: the underlying preference and queue APIs reserve nullish values for loading
or missing entries.

The preference definition is fixed when the hook is created. Existing provider selection,
write serialization, rollback, subscriptions, and disposal remain with `usePreference`.
The editor registers its stored-value effect after subscribing to that preference, as the
original consumers did. Equality callbacks are not tracked as effect dependencies.

Error reporting runs before queue settlement; the corresponding feedback formatter runs
after the failed-value overlay changes. Successful feedback runs only for a queued save,
after settlement. Saving while loading reports the caller's not-ready message and does
not enqueue or persist. Enqueueing another save keeps existing feedback until a subsequent
result. A null success message clears feedback.

The two AI settings components retain their own equality, logging, translations, access
guards and rendering. Automatic voice reports successful saves; default text settings
remain silent. Provider, queue and storage contracts are not generalized by this hook.

Solid's signals and effect provide owner-scoped state; existing internal preference and
queue APIs cover persistence and ordering. No external dependency or additional asynchronous
boundary is needed. The hook moves an existing effect and adds no new kind of side effect.

# Bug hunt findings — tip `0769b6cce1974316aefcc15b5beab019a686a41a`

Scope: `apps/pomo` only. Cap: 2 confirmed NEW bugs with failing repro tests under `apps/pomo/src/.bug-hunt/`.

---

## 1. Focus-room dialogue editor restores stale session draft over newer in-flight edits (P2)

### Wrong vs expected

- **Wrong:** Navigating to a saved dialogue captures the session draft once at route entry. If the user types while `loadDialogue()` is still in flight, the post-load `.then()` still applies the **navigation-time** draft string and discards the newer text the user just entered.
- **Expected:** After async load settles, the editor should keep in-flight user edits (or at least re-read the latest session draft), not overwrite them with a stale snapshot from navigation start.

### Repro steps

1. Put `pomo:focus-room-dialogue:draft:a` = `draft-from-session` in `sessionStorage`.
2. Open dialogue `a` while `getDialogue('a')` is delayed.
3. Before the load promise resolves, call `setText('user-typed-during-load')`.
4. Let load finish (`text-a` from server).
5. Observe final editor text.

### Test evidence

```bash
pnpm exec vitest run --project=unit apps/pomo/src/.bug-hunt/stale-session-draft-overwrites-in-flight-edits.spec.ts
```

```
AssertionError: expected 'draft-from-session' to be 'user-typed-during-load'
Expected: "user-typed-during-load"
Received: "draft-from-session"
```

### Code locations (tip `0769b6cce1974316aefcc15b5beab019a686a41a`)

- [`apps/pomo/src/features/focus-room-dialogue/use-focus-room-dialogue-editor.ts:234-262`](/workspace/apps/pomo/src/features/focus-room-dialogue/use-focus-room-dialogue-editor.ts#L234-L262) — captures `draft` at navigation, applies it after `loadDialogue()` without checking for newer edits.
- [`apps/pomo/src/features/focus-room-dialogue/dialogue-draft.ts:14-35`](/workspace/apps/pomo/src/features/focus-room-dialogue/dialogue-draft.ts#L14-L35) — session draft storage helpers.

Repro test: [`apps/pomo/src/.bug-hunt/stale-session-draft-overwrites-in-flight-edits.spec.ts`](/workspace/apps/pomo/src/.bug-hunt/stale-session-draft-overwrites-in-flight-edits.spec.ts)

### Distinct from open issues

Not covered by open session-draft/history/picture-diary/calendar issues (#1570, #1582, #1583, #1575, #1566, etc.). Those concern other subsystems or date/query semantics; none address navigation-time draft closure overwriting in-flight editor text during dialogue load.

---

## 2. Random event settings misclassify later load failures as save failures after any edit (P2)

### Wrong vs expected

- **Wrong:** `RandomEventSettings` keeps a module-scoped `edited = true` after the user changes an interval. Any later preference **read/reload** error is routed through `handlePreferenceError` as a **save** failure: UI shows “저장하지 못했어요”, logs “Failed to save…”, and rolls settings back to `previousSettings` even when the failing operation was a reload (e.g. cross-tab `storage` event).
- **Expected:** After a successful save, a subsequent load/reload failure should show the **load** failure copy, leave the current in-memory values intact, and log “Failed to load random event settings.”

### Repro steps

1. Open Random Event interval settings (defaults load).
2. Change minimum interval to `12`; wait for debounced save to succeed.
3. Simulate a later preference reload failure (mock `read()` reject + dispatch `storage` event for `pomo:random-event-settings:v1`).
4. Observe status message and interval inputs.

### Test evidence

```bash
pnpm exec vitest run --project=unit apps/pomo/src/.bug-hunt/random-event-settings-load-error-after-edit.spec.tsx
```

```
AssertionError: expected '랜덤 이벤트 설정을 저장하지 못했어요.' to be '랜덤 이벤트 설정을 불러오지 못했어요.'
Expected: "랜덤 이벤트 설정을 불러오지 못했어요."
Received: "랜덤 이벤트 설정을 저장하지 못했어요."
```

(`console.error` is also called with “Failed to **save** random event settings.” instead of “Failed to **load**…”.)

### Code locations (tip `0769b6cce1974316aefcc15b5beab019a686a41a`)

- [`apps/pomo/src/components/dialogue-settings/RandomEventSettings.tsx:70-86`](/workspace/apps/pomo/src/components/dialogue-settings/RandomEventSettings.tsx#L70-L86) — `edited` flag drives `isSaveError` for all errors.
- [`apps/pomo/src/components/dialogue-settings/RandomEventSettings.tsx:121-130`](/workspace/apps/pomo/src/components/dialogue-settings/RandomEventSettings.tsx#L121-L130) — sets `edited = true` on input; never cleared after successful save.

Repro test: [`apps/pomo/src/.bug-hunt/random-event-settings-load-error-after-edit.spec.tsx`](/workspace/apps/pomo/src/.bug-hunt/random-event-settings-load-error-after-edit.spec.tsx)

### Distinct from open issues

- **#1555** (auto dialogue settings optimistic UI after **save** failure) targets a different settings surface and save-time optimism, not random-event interval reload misclassification after a successful save.
- Random-event scheduler/open issues (#1560, #1534, #1533) concern pomodoro/event timing, not settings error routing.

---

## Areas checked without additional confirmed NEW bugs

- Feed stop-dismiss / listen-during-`listenAll` concurrency: stop-batch marking appears intentional (`PEventProvider.playback.spec.tsx`); `listen()` during `listenAll` was not promoted after inconclusive harness timeout.
- Weather `unknown`→clear, screen-saver, pomodoro phase edges: deferred — either overlap open issues (#1598, #1599, #1580, etc.) or need stronger product-defect proof beyond existing tests.

# Pomo bug hunt findings — 2026-09-21

Tip SHA: `a8bfb56db60466e9fb5e29519529d53f0424a370` (branch `dev`, unchanged since prior hunt)

Confirmed: **2** new bugs (cap). Repro tests live under `apps/pomo/src/.bug-hunt/`.

---

## 1. Calendar alarm: scoped save leaves legacy memo scheduled (P1)

### Summary

When a Google calendar event ID is migrated from the legacy unscoped form (`connection:abcde12345`) to the scoped form (`connection:["work","abcde12345"]`), saving an alarm on the scoped event creates a **second** active memo. The legacy memo (`calendar-alarm:connection:abcde12345`) keeps `nextExactReminderAt` set, so memory reminders can fire twice for one calendar event.

**Wrong:** Saving on the scoped event should retire or clear the legacy alarm memo for the same underlying Google event.

**Expected:** Only one schedulable alarm memo per calendar event; legacy memo is removed or its reminder cleared when the scoped alarm is saved.

### Repro steps

1. Seed storage with a legacy alarm memo: `calendar-alarm:connection:abcde12345` with `nextExactReminderAt` set.
2. Call `createCalendarAlarmSaver` with `memoId: calendar-alarm:connection:["work","abcde12345"]` for the same alarm time.
3. Observe both memos remain; legacy memo still has `nextExactReminderAt !== null`.

### Test evidence

```bash
pnpm exec vitest run apps/pomo/src/.bug-hunt/calendar-alarm-legacy-duplicate.spec.ts
```

```
FAIL  should retire the legacy calendar alarm memo when saving on the scoped event id
AssertionError: expected true to be false // Object.is equality
```

### Code locations (tip SHA)

| File                                                                     | Lines   | Role                                                     |
| ------------------------------------------------------------------------ | ------- | -------------------------------------------------------- |
| `apps/pomo/src/features/calendar-alarm/create-calendar-alarm-saver.ts`   | 22–69   | Upserts only `options.memoId`; never retires legacy memo |
| `apps/pomo/src/features/calendar-alarm/use-calendar-alarm-controller.ts` | 80–88   | `legacyAlarm` only surfaces a warning                    |
| `apps/pomo/src/features/calendar-alarm/use-calendar-alarm-controller.ts` | 120–136 | `saveAlarm` passes scoped `alarmId()` only               |
| `apps/pomo/src/features/calendar/get-legacy-event-id.ts`                 | 12–29   | Maps scoped ID → legacy ID                               |

Permalinks (tip SHA):

- https://github.com/bichikim/web/blob/a8bfb56db60466e9fb5e29519529d53f0424a370/apps/pomo/src/features/calendar-alarm/create-calendar-alarm-saver.ts#L22-L69
- https://github.com/bichikim/web/blob/a8bfb56db60466e9fb5e29519529d53f0424a370/apps/pomo/src/features/calendar-alarm/use-calendar-alarm-controller.ts#L80-L88
- https://github.com/bichikim/web/blob/a8bfb56db60466e9fb5e29519529d53f0424a370/apps/pomo/src/features/calendar-alarm/use-calendar-alarm-controller.ts#L120-L136

### Distinct from open issues

Not covered by playlist (#1731/#1743), dialogue writer (#1742), memory-assist reply queue (#1739), or any other listed open issue. This is a calendar-ID migration / duplicate-reminder defect in `calendar-alarm` + `get-legacy-event-id`.

---

## 2. UI auto-hide: chrome stays hidden after a dialog opens post-hide (P2)

### Summary

After the inactivity timer fires and `hidden` is `true`, opening a blocking dialog (e.g. programmatic modal) does **not** set `hidden` back to `false`. `isBlocked()` is evaluated only inside the scheduled timer callback; once hidden, no listener re-checks for new dialogs unless the user triggers `wake()` via pointer/keyboard/visibility.

**Wrong:** Focus-room chrome (overlays under PStudio) can remain `hidden` while a modal is open.

**Expected:** Any newly opened blocking dialog should force UI visible, matching the existing “defer hide while dialog open” behavior during an active countdown.

### Repro steps

1. Enable UI auto-hide (default 30s).
2. Wait for inactivity timeout → `hidden() === true`.
3. Append a visible `[role="dialog"]` to the document **without** dispatching pointer/visibility events.
4. `hidden()` remains `true`.

### Test evidence

```bash
pnpm exec vitest run apps/pomo/src/.bug-hunt/ui-auto-hide-dialog-after-hidden.spec.ts
```

```
FAIL  should reveal UI when a blocking dialog opens after auto-hide already hid chrome
AssertionError: expected true to be false // Object.is equality
```

### Code locations (tip SHA)

| File                                                                  | Lines | Role                                                       |
| --------------------------------------------------------------------- | ----- | ---------------------------------------------------------- |
| `apps/pomo/src/features/ui-auto-hide/create-inactivity-controller.ts` | 19–31 | `wake()` resets timer; `isBlocked()` only in callback      |
| `apps/pomo/src/features/ui-auto-hide/create-inactivity-controller.ts` | 25–30 | After `onHiddenChange(true)`, no further `isBlocked` watch |
| `apps/pomo/src/features/ui-auto-hide/use-ui-auto-hide.ts`             | 11–31 | Wires `isBlocked` to dialog query; no MutationObserver     |

Permalinks (tip SHA):

- https://github.com/bichikim/web/blob/a8bfb56db60466e9fb5e29519529d53f0424a370/apps/pomo/src/features/ui-auto-hide/create-inactivity-controller.ts#L19-L31
- https://github.com/bichikim/web/blob/a8bfb56db60466e9fb5e29519529d53f0424a370/apps/pomo/src/features/ui-auto-hide/use-ui-auto-hide.ts#L11-L31

Existing test `use-ui-auto-hide.spec.tsx` covers dialog-open **during** countdown only, not **after** hide.

### Distinct from open issues

Unrelated to desktop settings prefs flash (#1520), wallpaper deferred executor (#1737), volume ducking (#1736), screen-saver (separate feature), or dialogue/playlist clusters.

---

## Additional repros (not filed — cap reached)

These also fail locally under `apps/pomo/src/.bug-hunt/` but were not promoted to findings:

| Test file                                  | Behavior                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| `random-event-hidden-tab.spec.ts`          | Random dialogue events fire while `document.visibilityState === 'hidden'` |
| `picture-diary-save-after-unmount.spec.ts` | `useEntryEditing.save()` calls `onSaved` after hook cleanup               |

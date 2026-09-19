# Bug hunt findings — tip `652c34f3e571e008e5e80993ad7bd05d2751a352`

Two **new** confirmed bugs in `apps/pomo`, each with a failing repro under `apps/pomo/src/.bug-hunt/`.

---

## 1. Feed sync re-fetches unseen items when generation settings resolve to null

**Severity:** P1

### Summary

When `resolveGenerationSettings` returns `null` (for example the feed connection was removed from the repository during synchronization while the connection is still present in the `connections` array), `processFeedItem` returns without calling `repository.saveItems` or `repository.queue`. The feed item ID is never recorded, so every later sync treats it as unseen again: the RSS URL is fetched repeatedly and `resolveGenerationSettings` is invoked again, with no terminal feed-item status for the UI.

**Expected:** Persist a terminal feed-item record (for example `failed` with an explanatory message), matching other early-exit paths in `processFeedItem`, so the item is not retried on every poll.

**Actual:** No record is written; the same item is reprocessed on every sync while settings keep returning `null`.

### Repro steps

1. Subscribe to a feed connection with one new RSS item.
2. Run `synchronizeFeeds` with `resolveGenerationSettings` mocked to return `null` (simulates connection removed from the repository during sync).
3. Run `synchronizeFeeds` again with the same inputs.
4. Observe the fetcher is invoked twice and `items` stays empty.

### Test evidence

```bash
pnpm exec vitest run --project=unit apps/pomo/src/.bug-hunt/feed-sync-null-settings-retry.spec.ts
```

```
FAIL  apps/pomo/src/.bug-hunt/feed-sync-null-settings-retry.spec.ts
AssertionError: expected "vi.fn()" to be called once, but got 2 times
 ❯ apps/pomo/src/.bug-hunt/feed-sync-null-settings-retry.spec.ts:42:19
     42|   expect(fetcher).toHaveBeenCalledOnce()
```

### Code (tip `652c34f3`)

- Early return without persistence: [`apps/pomo/src/features/focus-room-feed/feed-sync.ts` L223–L227](https://github.com/bichikim/web/blob/652c34f3e571e008e5e80993ad7bd05d2751a352/apps/pomo/src/features/focus-room-feed/feed-sync.ts#L223-L227)
- Unseen-item detection (only stored IDs are skipped): [`apps/pomo/src/features/focus-room-feed/feed-sync.ts` L298–L302](https://github.com/bichikim/web/blob/652c34f3e571e008e5e80993ad7bd05d2751a352/apps/pomo/src/features/focus-room-feed/feed-sync.ts#L298-L302)
- Repro test: [`apps/pomo/src/.bug-hunt/feed-sync-null-settings-retry.spec.ts`](https://github.com/bichikim/web/blob/652c34f3e571e008e5e80993ad7bd05d2751a352/apps/pomo/src/.bug-hunt/feed-sync-null-settings-retry.spec.ts)

### Distinct from open issues

- **#1573** — expired-feed cleanup leaves orphan `feedItems` that block resync; this bug is an early return in `processFeedItem` with no persisted row at all.
- **#1582 / #1570** — server history-generation cron/recovery paths; unrelated to focus-room RSS sync.
- Existing `feed-sync.spec.ts` only asserts a single sync does not queue when settings are `null`; it does not cover repeated sync retry.

---

## 2. Pomodoro BroadcastChannel sync applies expired running state without catch-up before persistence

**Severity:** P2

### Summary

The `BroadcastChannel` message handler in `usePomodoroTimer` batch-sets `config`, `isAutoStartEnabled`, and `state` directly from the remote tab snapshot. It does **not** call `synchronizePomodoroTimer` (unlike `refresh`, `initializePomodoroTimer`, and user actions). A `createEffect` immediately writes `state()` to `localStorage` when storage is ready.

If another tab broadcasts an already-expired **running** timer, the receiving tab persists that expired running snapshot (`endsAt` in the past, `status: 'running'`) before the next animation frame runs `refresh()` to catch up.

**Expected:** Incoming cross-tab snapshots should be synchronized (or catch-up applied) before updating signals and persistence, so storage never contains an expired running timer.

**Actual:** Expired running state is stored and exposed until the next frame refresh (or indefinitely if the tab is backgrounded and rAF is throttled).

### Repro steps

1. Initialize `usePomodoroTimer` with storage ready.
2. Simulate a `BroadcastChannel` message carrying an expired running focus timer (`endsAt: 5000`, current time `12000`, `autoStart` off).
3. Read `localStorage` (`pomo:timer:v1`) immediately (before advancing animation frames).

### Test evidence

```bash
pnpm exec vitest run --project=unit apps/pomo/src/.bug-hunt/pomodoro-broadcast-expired-state.spec.ts
```

```
FAIL  apps/pomo/src/.bug-hunt/pomodoro-broadcast-expired-state.spec.ts
AssertionError: expected { completedFocusSessions: +0, …(3) } to deeply equal { completedFocusSessions: 1, …(3) }
+   "completedFocusSessions": 0,
+   "endsAt": 5000,
+   "phase": "focus",
+   "status": "running",
```

### Code (tip `652c34f3`)

- Handler applies remote state without `synchronizePomodoroTimer`: [`apps/pomo/src/features/pomodoro-timer/use-pomodoro-timer.ts` L223–L239](https://github.com/bichikim/web/blob/652c34f3e571e008e5e80993ad7bd05d2751a352/apps/pomo/src/features/pomodoro-timer/use-pomodoro-timer.ts#L223-L239)
- Immediate persistence of `state()`: [`apps/pomo/src/features/pomodoro-timer/use-pomodoro-timer.ts` L290–L297](https://github.com/bichikim/web/blob/652c34f3e571e008e5e80993ad7bd05d2751a352/apps/pomo/src/features/pomodoro-timer/use-pomodoro-timer.ts#L290-L297)
- Contrast — `initializePomodoroTimer` synchronizes before apply: [`apps/pomo/src/features/pomodoro-timer/initialize-pomodoro-timer.ts` L40–L53](https://github.com/bichikim/web/blob/652c34f3e571e008e5e80993ad7bd05d2751a352/apps/pomo/src/features/pomodoro-timer/initialize-pomodoro-timer.ts#L40-L53)
- Repro test: [`apps/pomo/src/.bug-hunt/pomodoro-broadcast-expired-state.spec.ts`](https://github.com/bichikim/web/blob/652c34f3e571e008e5e80993ad7bd05d2751a352/apps/pomo/src/.bug-hunt/pomodoro-broadcast-expired-state.spec.ts)

### Distinct from open issues

- **#1568** — passive-tab sync skips pomodoro **lifecycle events**; this bug is unsynchronized **state persistence** on BroadcastChannel receive.
- **#1580 / #1571 / #1563 / #1572 / #1542** — stop/reset/auto-start/mid-break/catch-up pause transitions; not cross-tab broadcast ingestion.
- No existing `use-pomodoro-timer` spec covers `BroadcastChannel` synchronization.

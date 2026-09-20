# Bug hunt findings — tip `0a06a19cb9ad54c6bddf97ec800784cda57fd978`

Hunt date: 2026-09-20. Scope: `apps/pomo` only. Confirmed bugs: **2**.

---

## 1. Feature-request create collapses `loadMore` pagination

**Severity:** P2

### Wrong vs expected

After a user loads additional feature-request pages with `loadMore`, a successful `createRequest` replaces the in-memory list with the **first page only**. Appended rows disappear and `hasMore` can flip back to `true` even though the user had already reached the end.

**Expected:** keep already-loaded pages (prepend the new request or refresh in place) and preserve pagination state after creating a request — the same behavior already implemented for `voteRequest` and admin `updateRequest`.

### Repro steps

1. Open the feature-requests view backed by `useFeatureRequests`.
2. Let the first page load (`hasMore: true`, one row).
3. Call `loadMore()` so the list contains page 1 + page 2 (`hasMore: false`).
4. Call `createRequest()` and receive `{ status: 'created' }`.
5. Observe `requests()` shrink to the first page only.

### Test evidence

```bash
pnpm exec vitest run apps/pomo/src/.bug-hunt/feature-request-create-collapses-loadmore.spec.ts
```

Fail excerpt:

```
AssertionError: expected [ { … REQUEST … } ] to deeply equal [ REQUEST, NEXT_REQUEST ]
 ❯ apps/pomo/src/.bug-hunt/feature-request-create-collapses-loadmore.spec.ts:55:29
     55|   expect(result.requests()).toEqual([REQUEST, NEXT_REQUEST])
```

### Code (tip permalinks)

- [`apps/pomo/src/features/feature-requests/use-feature-requests.ts` L104–106](https://github.com/bichikim/web/blob/0a06a19cb9ad54c6bddf97ec800784cda57fd978/apps/pomo/src/features/feature-requests/use-feature-requests.ts#L104-L106) — successful create always awaits `refresh()`, which reloads offset `0` only (see L38–56 in the same file).
- Contrast: [`use-feature-requests.ts` L116–128](https://github.com/bichikim/web/blob/0a06a19cb9ad54c6bddf97ec800784cda57fd978/apps/pomo/src/features/feature-requests/use-feature-requests.ts#L116-L128) — `voteRequest` updates the matching row in place without collapsing pages.
- Repro: [`apps/pomo/src/.bug-hunt/feature-request-create-collapses-loadmore.spec.ts`](https://github.com/bichikim/web/blob/0a06a19cb9ad54c6bddf97ec800784cda57fd978/apps/pomo/src/.bug-hunt/feature-request-create-collapses-loadmore.spec.ts)

### Distinct from open issues

- **#1657** (closed) covered the **vote** path; `voteRequest` now retains pages (see `use-feature-requests.spec.ts` L53–89). This finding is the **create** path (`createFeatureRequest` + `createRequest`), which still calls `refresh()`.
- Admin `updateRequest` was fixed in-place at tip; this is the **user-facing** create mutation, not admin status updates.
- Not related to language-learning **#1681** / **#1682**, pomodoro, feed, or merge-adjacent worker guards from tonight.

---

## 2. Desktop wallpaper noop executor swallows retainable room-enter / delayed-end actions

**Severity:** P2

### Wrong vs expected

`room-enter` and `delayed-end` event actions are queued only when **no** executor is registered (`executor === null`). In desktop wallpaper mode, `DesktopWallpaperEventActionFallback` registers a **noop** executor (`() => undefined`). Actions bound to those events therefore run immediately against the noop and are **not** queued for replay when the real executor returns (e.g. leaving desktop wallpaper or remounting `Events`).

**Expected:** retain `room-enter` / `delayed-end` actions across executor replacement, matching the behavior verified for unregister → re-register with a `null` executor (see `use-p-event-controller.spec.ts` “retain an entry action after its executor has been unregistered”).

### Repro steps

1. Register a noop event-action executor (simulates desktop wallpaper fallback).
2. Fire a `room-enter` event with a `music-stop` binding while the noop is active.
3. Unregister the noop and register a real executor.
4. Observe the real executor never receives `music-stop` — the action was consumed by the noop.

### Test evidence

```bash
pnpm exec vitest run apps/pomo/src/.bug-hunt/desktop-wallpaper-noop-swallows-retained-event-actions.spec.ts
```

Fail excerpt:

```
AssertionError: expected "vi.fn()" to be called once with arguments: [ 'music-stop' ]
Number of calls: 0
 ❯ apps/pomo/src/.bug-hunt/desktop-wallpaper-noop-swallows-retained-event-actions.spec.ts:27:24
     27|   expect(realExecutor).toHaveBeenCalledExactlyOnceWith('music-stop')
```

### Code (tip permalinks)

- [`apps/pomo/src/features/focus-room-dialogue/use-p-event-controller/event-action-runner.ts` L67–76](https://github.com/bichikim/web/blob/0a06a19cb9ad54c6bddf97ec800784cda57fd978/apps/pomo/src/features/focus-room-dialogue/use-p-event-controller/event-action-runner.ts#L67-L76) — queuing requires `executor === null`; any registered executor (including noop) bypasses the queue.
- [`apps/pomo/src/components/p-studio/PStudio.tsx` L116–124](https://github.com/bichikim/web/blob/0a06a19cb9ad54c6bddf97ec800784cda57fd978/apps/pomo/src/components/p-studio/PStudio.tsx#L116-L124) — desktop wallpaper mode registers the noop executor while `StudioUi` (real executor in `Events.tsx`) is unmounted.
- Repro: [`apps/pomo/src/.bug-hunt/desktop-wallpaper-noop-swallows-retained-event-actions.spec.ts`](https://github.com/bichikim/web/blob/0a06a19cb9ad54c6bddf97ec800784cda57fd978/apps/pomo/src/.bug-hunt/desktop-wallpaper-noop-swallows-retained-event-actions.spec.ts)

### Distinct from open issues

- **#1652** (closed via **#1679**) fixed retain-after-**unregister** when `executor === null`. This finding is the sibling case where a **noop executor is registered** (desktop wallpaper), so actions never enter the pending queue and cannot be replayed.
- Not **#1658** (sound-effect early activation), **#1681** / **#1682** (language-learning), or any pomodoro / feed / media-player issue in the avoid list.
- Adjacent to tonight’s **#1679** room-enter retain fix but a different trigger (noop registration vs null executor).

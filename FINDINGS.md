# Pomo bug hunt findings — tip `66086d214f98d87914aec3fa69820c5bd3cc3119`

Hunt date: 2026-09-20. Scope: `apps/pomo` only. Cap: 2 confirmed bugs (both proven with failing Vitest under `apps/pomo/src/.bug-hunt/`).

---

## 1. Room-enter bound action silently dropped after executor unregister

**Severity:** P2

### Summary

When a focus-room event-action executor has ever been registered and is then unregistered, a subsequent `enterFocusRoom()` fires `room-enter` bound actions while `eventActionExecutor === null`. Unlike `delayed-end` actions, `room-enter` actions are **not** queued in this state (`hasRegisteredEventActionExecutor` stays `true`), so `executeEventAction` no-ops and the bound action is permanently lost for that session. Entry dialogue may still play.

**Expected:** `room-enter` bound actions (e.g. `music-stop`) should run or queue until an executor is available, matching `delayed-end` behavior after unregister.

**Actual:** Action is silently skipped; re-registering the executor does not replay it.

### Repro

1. Configure a `room-enter` event binding with `actionIds: ['music-stop']`.
2. Register an event-action executor, then call its unregister function (simulates `PStudioEvents` unmount or desktop mode switch gap).
3. Call `enterFocusRoom()`.
4. Register a new executor.

Observe: `music-stop` never runs.

**Plausible production trigger:** Desktop wallpaper mode switch where `PStudioEvents` unmounts before `DesktopWallpaperEventActionFallback` mounts, while `useStudioRuntime` `onMount` calls `enterFocusRoom()`.

### Test evidence

```bash
pnpm exec vitest run --project=unit apps/pomo/src/.bug-hunt/room-enter-action-after-unregister.spec.ts --reporter=verbose
```

```
× should queue a room-enter action after its executor was temporarily unregistered
AssertionError: expected "vi.fn()" to be called once with arguments: [ 'music-stop' ]
Number of calls: 0
```

Repro test: [`apps/pomo/src/.bug-hunt/room-enter-action-after-unregister.spec.ts`](apps/pomo/src/.bug-hunt/room-enter-action-after-unregister.spec.ts)

### Root cause (tip `66086d21`)

| File                                                                                                                                                                                   | Lines   | Role                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------- |
| [`apps/pomo/src/features/focus-room-dialogue/use-p-event-controller/event-action-runner.ts`](apps/pomo/src/features/focus-room-dialogue/use-p-event-controller/event-action-runner.ts) | 63–79   | `shouldQueueAction` excludes `room-enter` when `hasRegisteredEventActionExecutor` is true |
| Same                                                                                                                                                                                   | 28–37   | `executeEventAction` no-ops when executor is null                                         |
| Same                                                                                                                                                                                   | 104–117 | Unregister clears executor but leaves `hasRegisteredEventActionExecutor = true`           |
| [`apps/pomo/src/features/focus-room-dialogue/use-p-event-controller.ts`](apps/pomo/src/features/focus-room-dialogue/use-p-event-controller.ts)                                         | 128–138 | Entry playback invokes `eventActionRunner.run([FOCUS_ROOM_ENTRY_EVENT])` on room enter    |
| [`apps/pomo/src/features/focus-room-dialogue/use-p-event-controller/entry-playback.ts`](apps/pomo/src/features/focus-room-dialogue/use-p-event-controller/entry-playback.ts)           | 73–77   | `hasTriggeredEvent` latch prevents retry                                                  |

Contrast: [`apps/pomo/src/features/focus-room-dialogue/__tests__/use-p-event-controller.route.spec.tsx`](apps/pomo/src/features/focus-room-dialogue/__tests__/use-p-event-controller.route.spec.tsx) (279–322) already tests that **delayed-end** actions queue after unregister.

### Distinct from open issues

| Issue              | Why different                                                                                                                                                                          |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **#1609**          | `onEvent()` promise **rejection** + `hasTriggeredEvent` latch; here `onEvent()` resolves immediately because the action is dropped synchronously inside `run()`, not via async failure |
| **#1614**          | Missing dialogue marks session complete / blocks dialogue retry; this bug can occur with valid dialogue bindings while only the **action** is lost                                     |
| **#1552** (closed) | Cancelled **dialogue sequence** retry semantics; does not involve action-executor lifecycle                                                                                            |

---

## 2. Today-in-history feed allows duplicate subscriptions differing only by `timeZone` query

**Severity:** P2

### Summary

Feed connection duplicate detection compares raw stored `href` strings. The same owned today-in-history feed can be saved twice when one URL includes `?timeZone=…` and the other omits it (or uses a different zone). At fetch time, `getFeedRequestUrl` overwrites `timeZone` with the viewer's current zone, so both connections resolve to the same effective feed — duplicate generation, duplicate list entries, and confusing settings UI.

**Expected:** Adding the canonical today-in-history URL should be rejected when an equivalent subscription (same path, timeZone normalized) already exists.

**Actual:** Both URLs are stored as separate connections.

### Repro

1. Add recommended today-in-history feed (URL includes `?timeZone=America/New_York`).
2. Manually add `https://www.pomofi.io/api/feeds/today-in-history/rss.xml` (no query).

Observe: two connections; both fetch the same date-sensitive feed.

### Test evidence

```bash
pnpm exec vitest run --project=unit apps/pomo/src/.bug-hunt/today-in-history-feed-url-dedup.spec.ts --reporter=verbose
```

```
× should reject adding the same today-in-history feed with a different timeZone query
AssertionError: expected [ … ] to have a length of 1 but got 2
```

Repro test: [`apps/pomo/src/.bug-hunt/today-in-history-feed-url-dedup.spec.ts`](apps/pomo/src/.bug-hunt/today-in-history-feed-url-dedup.spec.ts)

### Root cause (tip `66086d21`)

| File                                                                                                                               | Lines | Role                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------- |
| [`apps/pomo/src/features/focus-room-feed/use-feed-connections.ts`](apps/pomo/src/features/focus-room-feed/use-feed-connections.ts) | 77–90 | Duplicate check: `connection.url === normalizedUrl.value` (literal href)                       |
| [`apps/pomo/src/features/focus-room-feed/schema.ts`](apps/pomo/src/features/focus-room-feed/schema.ts)                             | 53–72 | `normalizeFeedUrl` strips hash only; preserves query params                                    |
| [`apps/pomo/src/features/focus-room-feed/feed-request-url.ts`](apps/pomo/src/features/focus-room-feed/feed-request-url.ts)         | 8–25  | Fetch rewrites `timeZone` on owned date-sensitive feeds                                        |
| [`apps/pomo/src/components/feed-settings/Content.tsx`](apps/pomo/src/components/feed-settings/Content.tsx)                         | 63–84 | Recommendations use `getFeedRequestUrl` for display dedup, but manual `addConnection` does not |

### Distinct from open issues

| Issue                        | Why different                                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **#1635** (closed via #1630) | Fixed **recommended** feed URLs omitting `timeZone`; this is **saved-connection dedup** still using literal URLs after that fix |
| **#1634** (closed)           | Preserves `listenedAt` across reload for the same `dialogueId`; unrelated to connection URL equivalence                         |
| **#1608 / #1618**            | Feed listen/mark timing bugs; not subscription deduplication                                                                    |
| **#1575 / #1566**            | Calendar / server-side timezone validation; client-side feed connection storage                                                 |

---

## Areas checked without additional confirmed bugs

- Album draft persistence (#1636): cover/field serialization via shared queue — no distinct race found.
- Memory-assist recall mode (#1630): recall-after-exact-toggle covered by merged fix.
- Text-mood prepare-when-ready (#1633): no stronger adjacent bug than optional loading-UI gap (not filed).
- Feed listened mark on dialogue regeneration after recovery: plausible but not filed (cap reached; needs heavier integration repro).

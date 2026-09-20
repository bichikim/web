# Bug hunt findings — 2026-09-21 (tip `a8bfb56db60466e9fb5e29519529d53f0424a370`)

Scope: `apps/pomo` only. Cap: 2 confirmed bugs. No GitHub issues or PRs opened.

---

## 1. Automatic weather scene stays visible after revalidation returns an expired `available` feed

**Severity:** P1

**Summary:** When automatic scene mode is enabled and weather revalidation returns `status: 'available'` with a feed whose `expiresAt` is already in the past (but `stale: false`), `sceneCondition()` still resolves to the observed condition (e.g. `'clear'`). Expected: hide the automatic scene until fresh weather is available, matching the behavior when `collecting` / `unavailable` / `failed` revalidation retains an expired feed via `getRetainedFeedState`.

**Wrong vs expected:**

- **Wrong:** `case 'available'` stores `result.feed` verbatim; `sceneCondition()` only checks `feed.stale`, not `expiresAt`.
- **Expected:** Expired feeds should be treated as stale for automatic scene gating, consistent with `getRetainedFeedState` (lines 69–70).

**Repro steps:**

1. Enable weather with `sceneMode: 'auto'`.
2. Load a valid feed, then advance time past `expiresAt`.
3. Trigger revalidation that returns `{ status: 'available', feed: <same expired feed, stale: false> }` (e.g. via `onLocationChange` with the same location).
4. Observe `sceneCondition()` — it returns `'clear'` instead of `undefined`.

**Test evidence:**

```bash
pnpm vitest run --project=unit apps/pomo/src/.bug-hunt/weather-expired-available-scene.spec.ts
```

```
AssertionError: expected 'clear' to be undefined
 ❯ apps/pomo/src/.bug-hunt/weather-expired-available-scene.spec.ts:115:40
```

**Source (tip SHA):**

- [`apps/pomo/src/features/weather/use-weather.ts:132-134`](https://github.com/bichikim/web/blob/a8bfb56db60466e9fb5e29519529d53f0424a370/apps/pomo/src/features/weather/use-weather.ts#L132-L134) — `available` path skips stale computation
- [`apps/pomo/src/features/weather/use-weather.ts:69-70`](https://github.com/bichikim/web/blob/a8bfb56db60466e9fb5e29519529d53f0424a370/apps/pomo/src/features/weather/use-weather.ts#L69-L70) — `getRetainedFeedState` correctly marks expiry
- [`apps/pomo/src/features/weather/use-weather.ts:185-189`](https://github.com/bichikim/web/blob/a8bfb56db60466e9fb5e29519529d53f0424a370/apps/pomo/src/features/weather/use-weather.ts#L185-L189) — scene gate trusts `feed.stale` only

**Repro test:** [`apps/pomo/src/.bug-hunt/weather-expired-available-scene.spec.ts`](https://github.com/bichikim/web/blob/a8bfb56db60466e9fb5e29519529d53f0424a370/apps/pomo/src/.bug-hunt/weather-expired-available-scene.spec.ts)

**Why distinct:** Not covered by open issues. Existing test [`use-weather.spec.ts:287`](https://github.com/bichikim/web/blob/a8bfb56db60466e9fb5e29519529d53f0424a370/apps/pomo/src/features/weather/__tests__/use-weather.spec.ts#L287) covers `unavailable`/`failed` revalidation retaining stale feeds, not the `available` path. Distinct from closed #1619 (weather clear-on-stale) — this is the inverse failure mode where an expired feed is re-applied as fresh via `available`.

---

## 2. Reply speech queue dispose leaves in-flight `enqueue` promises pending

**Severity:** P1

**Summary:** `useReplySpeechQueue` rejects only queued (not yet started) requests on cleanup. If `speak()` is in flight when the hook disposes (e.g. P-Studio unmount), the caller's `enqueue()` promise never settles. The in-flight request is already removed from `requests()` before `speak` starts, so `onCleanup` cannot reach it.

**Wrong vs expected:**

- **Wrong:** In-flight `enqueue` promise hangs forever after dispose.
- **Expected:** All outstanding `enqueue` promises reject with `AbortError` on dispose, matching pending-queue behavior (lines 45–49).

**Repro steps:**

1. Create `useReplySpeechQueue` with `isOccupied: false`.
2. Call `enqueue(text)` and wait until `speak` is invoked.
3. Call `cleanup()` before `speak`'s promise resolves.
4. Observe the `enqueue` promise never resolves or rejects.

**Test evidence:**

```bash
pnpm vitest run --project=unit apps/pomo/src/.bug-hunt/reply-speech-queue-dispose-inflight.spec.ts
```

```
AssertionError: expected false to be true // settled flag never flips
 ❯ apps/pomo/src/.bug-hunt/reply-speech-queue-dispose-inflight.spec.ts:36:19
```

**Source (tip SHA):**

- [`apps/pomo/src/components/p-studio/use-reply-speech-queue.ts:35-42`](https://github.com/bichikim/web/blob/a8bfb56db60466e9fb5e29519529d53f0424a370/apps/pomo/src/components/p-studio/use-reply-speech-queue.ts#L35-L42) — in-flight request removed from queue; resolve/reject wired only to `speak` completion
- [`apps/pomo/src/components/p-studio/use-reply-speech-queue.ts:45-49`](https://github.com/bichikim/web/blob/a8bfb56db60466e9fb5e29519529d53f0424a370/apps/pomo/src/components/p-studio/use-reply-speech-queue.ts#L45-L49) — cleanup rejects only remaining queued requests

**Repro test:** [`apps/pomo/src/.bug-hunt/reply-speech-queue-dispose-inflight.spec.ts`](https://github.com/bichikim/web/blob/a8bfb56db60466e9fb5e29519529d53f0424a370/apps/pomo/src/.bug-hunt/reply-speech-queue-dispose-inflight.spec.ts)

**Why distinct:** Not #1738 (entry playback user-stop commits session), not #1727 (delayed-end catch-up double-play), not #1737 (desktop wallpaper deferred executor). This is P-Studio reply TTS queue lifecycle on component dispose while `speak()` is in flight.

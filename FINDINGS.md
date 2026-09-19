# Pomo bug hunt — tip `652c34f3e571e008e5e80993ad7bd05d2751a352`

Confirmed **2** new bugs (repro tests under `apps/pomo/src/.bug-hunt/`). No GitHub issues opened.

---

## 1. Feature requests: stale `loadMore` appends after concurrent `refresh` (vote)

**Severity:** P1

### Summary

`useFeatureRequests().loadMore()` captures `offset` and awaits the network without tracking whether a concurrent `refresh()` (triggered by voting or creating a request) has reset the list. When the stale `loadMore` response resolves after `refresh`, it appends page items onto the freshly refreshed list, producing duplicate entries and wrong ordering.

**Expected:** After `refresh`, the list should reflect only the latest server page(s); in-flight `loadMore` results should be discarded.

**Actual:** Stale `loadMore` pages are appended to the post-refresh list (e.g. four items with a duplicated id).

### Repro

1. Open the feature-request list with `hasMore: true` (e.g. one item on screen).
2. Scroll to trigger `loadMore` (network slow or in flight).
3. While `loadMore` is pending, vote on a request (or create one) so `refresh()` runs and replaces the list.
4. Let the original `loadMore` response complete.
5. Observe duplicate / extra rows in the list.

### Test evidence

```bash
pnpm exec vitest run --project=unit apps/pomo/src/.bug-hunt/feature-requests-loadmore-refresh-race.spec.ts
```

```
FAIL  apps/pomo/src/.bug-hunt/feature-requests-loadmore-refresh-race.spec.ts
AssertionError: expected [ …(4) ] to have a length of 3 but got 4
```

Full log: `/opt/cursor/artifacts/bug-hunt-test-output.log`

### Code (tip `652c34f3`)

- [`apps/pomo/src/features/feature-requests/use-feature-requests.ts:37-51`](https://github.com/bichikim/web/blob/652c34f3e571e008e5e80993ad7bd05d2751a352/apps/pomo/src/features/feature-requests/use-feature-requests.ts#L37-L51) — `refresh` replaces `requests` wholesale
- [`apps/pomo/src/features/feature-requests/use-feature-requests.ts:54-71`](https://github.com/bichikim/web/blob/652c34f3e571e008e5e80993ad7bd05d2751a352/apps/pomo/src/features/feature-requests/use-feature-requests.ts#L54-L71) — `loadMore` has no generation token / abort; always appends on resolve

**Note:** The same pattern exists in `use-admin-feature-requests.ts:40-74` (admin list).

### Distinct from open issues

Not covered by any open issue (#1587–#1520). Unrelated to feed playback, pomodoro, playlist, calendar, or preference-sync bugs listed in the brief.

---

## 2. Weather auto-scene: initial fetch error drives sunny `clear` background

**Severity:** P2

### Summary

When automatic weather scenes are enabled (`sceneMode: 'auto'`) and the initial feed fetch fails (`status: 'error'`), `sceneCondition()` still returns `'clear'`. The focus-room background therefore shows a sunny scene while weather data is unavailable—opposite of the loading path, which correctly returns `undefined` until a feed is ready.

**Expected:** On fetch error with no prior ready feed, `sceneCondition()` should stay `undefined` (hold previous scene / show neutral) rather than assuming clear weather.

**Actual:** `sceneCondition()` is `'clear'` whenever `state.status === 'error'`.

### Repro

1. Enable weather with `sceneMode: 'auto'` (default).
2. Simulate or wait for an initial `weatherFeedQuery` failure (`failed` / `unavailable`, no cached ready feed).
3. Observe `state().status === 'error'` but the studio background uses the clear/sunny weather scene.

### Test evidence

```bash
pnpm exec vitest run --project=unit apps/pomo/src/.bug-hunt/weather-auto-scene-error-clear.spec.ts
```

```
FAIL  apps/pomo/src/.bug-hunt/weather-auto-scene-error-clear.spec.ts
AssertionError: expected 'clear' to be undefined
```

Full log: `/opt/cursor/artifacts/bug-hunt-test-output.log`

### Code (tip `652c34f3`)

- [`apps/pomo/src/features/weather/use-weather.ts:185-195`](https://github.com/bichikim/web/blob/652c34f3e571e008e5e80993ad7bd05d2751a352/apps/pomo/src/features/weather/use-weather.ts#L185-L195) — only `loading` yields `undefined`; `error` falls through to `'unknown'`
- [`apps/pomo/src/features/weather/scene-mode.ts:31-32`](https://github.com/bichikim/web/blob/652c34f3e571e008e5e80993ad7bd05d2751a352/apps/pomo/src/features/weather/scene-mode.ts#L31-L32) — `'unknown'` maps to `'clear'`

### Distinct from open issues

- Not #1579 (display-theme stale web overwrite).
- Not #1584 / #1587 / #1573 (feed sync / listened-before-play / orphan feedItems).
- Not #1575 / #1566 / #1581 / #1583 (calendar / picture-diary / service-calculator date paths).
- Existing `use-weather.spec.ts` asserts `state` on failure but never `sceneCondition`.

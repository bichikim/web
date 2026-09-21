# Bug hunt findings — 2026-09-21

Tip SHA: `a8bfb56db60466e9fb5e29519529d53f0424a370` (unchanged)

Confirmed: **1** · Investigated, not confirmed: **0** (cap 2)

---

## 1. Background slideshow advances slides early after a system clock jump (P2)

### Summary

`usePlayback` measures photo/video slide deadlines with `Date.now()` instead of a monotonic clock. After a slide starts, if the OS wall clock jumps forward and the slide timer effect re-runs (for example when `photoSeconds` changes), the hook recalculates `remaining` with the jumped clock and can call `advance()` immediately—even though only a few seconds of real playback time have elapsed.

Screen saver already avoids this class of bug by using `getMonotonicTime()` and has a regression test for clock skew.

### Expected vs actual

- **Expected:** A photo configured for 10 seconds should stay visible for ~10 seconds of elapsed playback time, regardless of NTP/DST/manual clock adjustments while it is showing.
- **Actual:** After 4 s of playback, a +60 s system clock jump plus a harmless preference tweak (`photoSeconds` 10 → 9) advances to the next slide immediately.

### Repro (test)

1. Mount `usePlayback` with two photo items and `photoSeconds: 10`.
2. Call `onReady()` on the first slide.
3. Advance fake timers by 4 s.
4. Jump system time forward by 60 s (`vi.setSystemTime`).
5. Update preferences (e.g. change `photoSeconds` to trigger the effect).
6. Observe current slide is already `photo-b`.

### Test evidence

```bash
pnpm exec vitest run --project=unit apps/pomo/src/.bug-hunt/background-playback-wall-clock.spec.tsx
```

```
FAIL  should not advance a photo early when preferences change after a system clock jump
AssertionError: expected 'photo-b' to be 'photo-a'
```

Repro file: [`apps/pomo/src/.bug-hunt/background-playback-wall-clock.spec.tsx`](apps/pomo/src/.bug-hunt/background-playback-wall-clock.spec.tsx)

### Code locations (tip SHA)

- Deadline calculation: [`apps/pomo/src/features/background/use-playback.ts` L78–L84](https://github.com/bichikim/web/blob/a8bfb56db60466e9fb5e29519529d53f0424a370/apps/pomo/src/features/background/use-playback.ts#L78-L84)
- `startedAt` capture: [`apps/pomo/src/features/background/use-playback.ts` L109–L116](https://github.com/bichikim/web/blob/a8bfb56db60466e9fb5e29519529d53f0424a370/apps/pomo/src/features/background/use-playback.ts#L109-L116)
- Prior art (monotonic clock): [`apps/pomo/src/features/screen-saver/use-screen-saver.ts` L6](https://github.com/bichikim/web/blob/a8bfb56db60466e9fb5e29519529d53f0424a370/apps/pomo/src/features/screen-saver/use-screen-saver.ts#L6), [`apps/pomo/src/features/screen-saver/__tests__/use-screen-saver.spec.tsx` L255–L277](https://github.com/bichikim/web/blob/a8bfb56db60466e9fb5e29519529d53f0424a370/apps/pomo/src/features/screen-saver/__tests__/use-screen-saver.spec.tsx#L255-L277)

### Distinct from open issues

Not covered by open issues #1749–#1735 (dialogue, diary, playlist, workers, weather, etc.). This is desktop **background slideshow** timing, separate from screen saver idle (#1746), desktop wallpaper deferred executor (#1737), and focus-room media/playlist bugs.

---

## Empty / not filed

No second confirmed bug met the repro bar this round. Candidates examined and rejected:

- **Supertonic concurrent `initialize()`** — duplicate of open #1733.
- **Feature-request `hasMore` on manual refresh** — current behavior is covered by existing tests in `use-feature-requests.spec.ts` (intentional preserve-on-refresh).
- **Event-action-runner waiter resolution with deferred executor** — covered by existing `event-action-runner.spec.ts`; premature resolution is intentional so entry playback can proceed while actions queue for the active executor.

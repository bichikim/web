# Bug hunt findings — tip `652c34f3e571e008e5e80993ad7bd05d2751a352`

Hunt date: 2026-09-19. Scope: `apps/pomo` only. Cap: 2 confirmed NEW bugs (3 repro tests written; third finding kept as local repro only).

---

## 1. Stale shuffle queue replays wrong track after controlled playlist shrink

**Severity:** P1

### Wrong vs expected

**Wrong:** When shuffle is enabled and a controlled playlist (`props.tracks`) shrinks (fewer tracks) without calling `resetOrder()`, the shuffle queue still holds indices from the longer list. `selectRandomTrack` normalizes stale indices with modulo (`normalizeTrackIndex`), so a queue head of `2` on a 2-track list becomes index `0` — replaying the current track instead of the next surviving track.

**Expected:** After the playlist shrinks, shuffle navigation should select the next track from the **new** list (e.g. index `1` when at index `0` on `[A, B]`), or rebuild the shuffle queue for the new `trackCount`.

### Repro steps

1. Start shuffle with 4 tracks at index `0` and initial queue `[2, 3, 1]`.
2. Shrink `trackCount` to `2` **without** `resetOrder()` (simulates controlled `props.tracks` update).
3. Call `selectNextTrack()`.
4. Observe index `0` selected (replay) instead of index `1`.

### Test evidence

```bash
pnpm vitest run --project=unit apps/pomo/src/.bug-hunt/shuffle-stale-indices-after-track-shrink.spec.ts
```

```
FAIL ... should play the next surviving track when shrink happens before consuming stale queue head
AssertionError: expected +0 to be 1 // Object.is equality

- Expected: 1
+ Received: 0
```

### Source locations (tip `652c34f3`)

| File                                                                                                                                                                                                                       | Lines   | Role                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------- |
| [`apps/pomo/src/components/media-player/use-playback-order.ts`](https://github.com/bichikim/web/blob/652c34f3e571e008e5e80993ad7bd05d2751a352/apps/pomo/src/components/media-player/use-playback-order.ts#L100-L127)       | 100–127 | `selectRandomTrack` consumes stale queue head and normalizes with modulo                             |
| [`apps/pomo/src/features/focus-room-audio/playback-policy.ts`](https://github.com/bichikim/web/blob/652c34f3e571e008e5e80993ad7bd05d2751a352/apps/pomo/src/features/focus-room-audio/playback-policy.ts#L75-L82)           | 75–82   | `normalizeTrackIndex` wraps out-of-range indices instead of invalidating                             |
| [`apps/pomo/src/components/media-player/use-player-controller.ts`](https://github.com/bichikim/web/blob/652c34f3e571e008e5e80993ad7bd05d2751a352/apps/pomo/src/components/media-player/use-player-controller.ts#L254-L269) | 254–269 | Controlled-track `createEffect` resumes playback but never calls `order.resetOrder()` on list change |

`resetOrder()` is only invoked from `create-player-queue-controller.ts` on queue edits, not when `props.tracks` length changes.

### Distinct from open issues

- **#1537** (CLOSED): `MEDIA_ERR_ABORTED` during next-track media prep — transport/abort, not shuffle index staleness.
- **#1567**: duplicate track ID write/read mismatch — playlist persistence validation, not shuffle queue after shrink.

---

## 2. Calendar `todayKey` and month grid use browser TZ while events use `Asia/Seoul`

**Severity:** P1

### Wrong vs expected

**Wrong:** `useMonth` sets `environment.timeZone()` to `'Asia/Seoul'` for API loads and `groupCalendarEvents`, but `todayKey` comes from `useLocalDate` → `formatLocalDate`, which uses the **browser-local** timezone. Around KST midnight with a non-Seoul browser TZ (e.g. `UTC`), `todayKey` stays on the previous civil date and the month grid initializes to the wrong month.

**Expected:** `todayKey`, selected date, and month boundaries should follow the display timezone (`environment.timeZone()` / `Asia/Seoul`), consistent with event grouping.

### Repro steps

1. Set `process.env.TZ = 'UTC'`.
2. Render `useMonth` with `environment.now() = 2026-08-31T16:00:00.000Z` (2026-09-01 01:00 KST) and `environment.timeZone() = 'Asia/Seoul'`.
3. Read `todayKey()`.
4. Observe `'2026-08-31'` instead of `'2026-09-01'`.

### Test evidence

```bash
pnpm vitest run --project=unit apps/pomo/src/.bug-hunt/calendar-today-key-timezone-mismatch.spec.ts
```

```
FAIL ... should use Asia/Seoul civil date for todayKey when environment timeZone is Asia/Seoul
AssertionError: expected '2026-08-31' to be '2026-09-01' // Object.is equality

Expected: "2026-09-01"
Received: "2026-08-31"
```

### Source locations (tip `652c34f3`)

| File                                                                                                                                                                                                   | Lines   | Role                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------- |
| [`apps/pomo/src/components/calendar-month/use-month.ts`](https://github.com/bichikim/web/blob/652c34f3e571e008e5e80993ad7bd05d2751a352/apps/pomo/src/components/calendar-month/use-month.ts#L108-L118) | 108–118 | `todayKey` from `useLocalDate`; `month` from `dayjs(today).startOf('month')` — both browser-local |
| [`apps/pomo/src/utils/format-local-date/index.ts`](https://github.com/bichikim/web/blob/652c34f3e571e008e5e80993ad7bd05d2751a352/apps/pomo/src/utils/format-local-date/index.ts#L3-L4)                 | 3–4     | `formatLocalDate` uses `dayjs(date)` without display timezone                                     |
| [`apps/pomo/src/features/civil-date/use-local-date.ts`](https://github.com/bichikim/web/blob/652c34f3e571e008e5e80993ad7bd05d2751a352/apps/pomo/src/features/civil-date/use-local-date.ts#L17-L24)     | 17–24   | Midnight refresh also uses browser-local `formatLocalDate`                                        |

### Distinct from open issues

- **#1566**: calendar query `'이번주'` (no space) maps to 30-day range — query parsing, not `todayKey`/month grid TZ split.
- No other open issue covers browser-local civil date vs `Asia/Seoul` display timezone for the month widget.

---

## Local repro only (cap reached — not filed)

A third confirmed bug exists in all-day calendar alarm defaults (`getEventAlarmAt` uses `new Date(y, m-1, d, 9)` in browser TZ instead of 09:00 KST). Repro: [`apps/pomo/src/.bug-hunt/all-day-alarm-browser-timezone.spec.ts`](apps/pomo/src/.bug-hunt/all-day-alarm-browser-timezone.spec.ts). Distinct from #1566 and finding #2 above (alarm scheduling vs month grid).

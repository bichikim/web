# Bug hunt findings — 2026-09-19 (tip `652c34f3`)

Hunt scope: `apps/pomo` only. Tip SHA unchanged: `652c34f3e571e008e5e80993ad7bd05d2751a352`.

**Confirmed new bugs: 2**

---

## 1. Picture diary saves yesterday’s date after local midnight (P2)

### Summary

`PictureDiary` sets the writing `date` signal once on mount from `formatLocalDate(environment.now())` and never refreshes it when the local civil day rolls over. If the user keeps the writing view open across midnight and saves, the entry is stored with the previous day’s `date` while `createdAt` / `updatedAt` reflect the new day.

**Expected:** Saved `date` should match the local civil day at save time (or roll forward at midnight like `useLocalDate` elsewhere).

**Actual:** `date` stays frozen at mount-time value; save uses `snapshot.date` from that stale signal.

### Repro steps

1. Open picture diary writing view shortly before local midnight (e.g. 23:55).
2. Add text or a drawing; do not change the date field.
3. Wait until after local midnight (e.g. 00:05).
4. Tap **일기 저장**.

### Test evidence

```bash
pnpm exec vitest run --project=unit apps/pomo/src/.bug-hunt/picture-diary-midnight-date.spec.tsx
```

```
FAIL  picture-diary-midnight-date.spec.tsx
AssertionError: expected save with date "2026-09-05", received date "2026-09-04"
  (createdAt/updatedAt already "2026-09-05T00:05:00.000Z")
```

Repro test: [`apps/pomo/src/.bug-hunt/picture-diary-midnight-date.spec.tsx`](apps/pomo/src/.bug-hunt/picture-diary-midnight-date.spec.tsx)

### Source (tip `652c34f3`)

| File | Lines | Role |
|------|-------|------|
| [`apps/pomo/src/components/memory-assist/PictureDiary.tsx`](https://github.com/bichikim/web/blob/652c34f3e571e008e5e80993ad7bd05d2751a352/apps/pomo/src/components/memory-assist/PictureDiary.tsx#L101) | 101 | `date` initialized once, no midnight refresh |
| [`apps/pomo/src/components/memory-assist/PictureDiary.tsx`](https://github.com/bichikim/web/blob/652c34f3e571e008e5e80993ad7bd05d2751a352/apps/pomo/src/components/memory-assist/PictureDiary.tsx#L145-L157) | 145–157 | `handleSave` persists stale `snapshot.date` while `now` is current |

### Distinct from open issues

- Not calendar month/`todayKey` TZ mismatch (**#1575**).
- Not calendar query `이번주` spacing (**#1566**).
- Civil-date midnight edge in picture diary only; no overlap with listed open bugs.

---

## 2. Pomodoro “end session” stops after one phase when multiple phases expired (P2)

### Summary

When a running timer has expired through more than one phase (focus → short break → focus, etc.) but UI sync has not caught up (background tab / throttled rAF), `onStop` synchronizes with **single-phase** `advancePomodoroTimer` even if auto-start is enabled. The session ends in the wrong phase (e.g. idle `shortBreak`) instead of the wall-clock phase (e.g. idle `focus` after focus+break elapsed).

`onPause` and `refresh` pass `{ autoStartNextPhase: isAutoStartEnabled() }`; `onStop` does not.

**Expected:** With auto-start ON, stop should catch up through all expired phases (same as pause/refresh) before landing idle.

**Actual:** `synchronizePomodoroTimer` without `autoStartNextPhase` advances only once; `stopPomodoroTimer` then idles at that intermediate phase.

### Repro steps

1. Enable auto-start; start a focus phase (e.g. 10s focus, 4s short break).
2. Let wall clock pass focus end **and** short-break end without UI refresh (simulate stale running focus state at `now = 15s` after start at `t = 1s`).
3. Call **end session** (`onStop`).

### Test evidence

```bash
pnpm exec vitest run --project=unit apps/pomo/src/.bug-hunt/pomodoro-stop-multi-phase-catchup.spec.ts
```

```
FAIL  pomodoro-stop-multi-phase-catchup.spec.ts
Expected stop result: { phase: "focus", completedFocusSessions: 1, status: "idle" }
Received:             { phase: "shortBreak", completedFocusSessions: 1, status: "idle" }

(Full auto-start sync at same instant correctly yields running focus.)
```

Repro test: [`apps/pomo/src/.bug-hunt/pomodoro-stop-multi-phase-catchup.spec.ts`](apps/pomo/src/.bug-hunt/pomodoro-stop-multi-phase-catchup.spec.ts)

### Source (tip `652c34f3`)

| File | Lines | Role |
|------|-------|------|
| [`apps/pomo/src/features/pomodoro-timer/use-pomodoro-timer.ts`](https://github.com/bichikim/web/blob/652c34f3e571e008e5e80993ad7bd05d2751a352/apps/pomo/src/features/pomodoro-timer/use-pomodoro-timer.ts#L357-L363) | 357–363 | `onStop` omits `autoStartNextPhase` |
| [`apps/pomo/src/features/pomodoro-timer/model.ts`](https://github.com/bichikim/web/blob/652c34f3e571e008e5e80993ad7bd05d2751a352/apps/pomo/src/features/pomodoro-timer/model.ts#L152-L164) | 152–164 | Without flag, sync calls `advancePomodoroTimer` once |
| [`apps/pomo/src/features/pomodoro-timer/model.ts`](https://github.com/bichikim/web/blob/652c34f3e571e008e5e80993ad7bd05d2751a352/apps/pomo/src/features/pomodoro-timer/model.ts#L206-L224) | 206–224 | `stopPomodoroTimer` idles at single-step sync result |

### Distinct from open issues

- Not `onReset` emitting `focus-end` for running focus (**#1571**).
- Not auto-start OFF restore catch-up (**#1563**).
- Not catch-up pause spurious `break-start` (**#1572**).
- Not mid-break non-overtime config (**#1542**).
- Not passive tab skipping lifecycle events (**#1568**) — this is wrong **final idle phase** after explicit stop, not missing events.

---

## Areas checked, no additional confirmed bugs

- Admin-music heartbeat during cover replace: hypothesis not reproduced (heartbeat did not regress reference in tested harness).
- Controlled playlist shuffle growth, playback persistence races, weather UTC billing month: inspected; no additional failing repro added within cap.

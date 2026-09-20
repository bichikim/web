# Bug hunt findings — tip `d4d6e6b143519a0fb1041b19a530d3b4547e710e`

Hunt date: 2026-09-20. Scope: `apps/pomo`. Confirmed bugs: **2** (cap). Repro tests live under [`apps/pomo/src/.bug-hunt/`](apps/pomo/src/.bug-hunt/).

---

## 1. Pomodoro `stopOnUnmount` skips auto-start multi-phase catch-up before persisting idle state

**Severity:** P2

### Wrong vs expected

When auto-start is enabled and multiple timer phases have elapsed while the timer was running (focus expired, break expired), hiding the pomodoro panel (`stopOnUnmount`) persists **short-break idle with partial remaining** (`phase: shortBreak`, `remainingSeconds: 4`). Expected: same end state as explicit **Stop** after full catch-up — **focus idle with full remaining** (`phase: focus`, `remainingSeconds: 10`).

### Repro steps

1. Enable pomodoro auto-start.
2. Start a focus session (e.g. 10s focus / 4s break config).
3. Advance time past both focus and break expiry (e.g. to 15s).
4. Hide the pomodoro panel (or unmount `usePomodoroTimer` with `stopOnUnmount: true`) without pressing Stop.
5. Reload timer state from storage.

### Test evidence

```bash
pnpm exec vitest run --project=unit apps/pomo/src/.bug-hunt/stop-on-unmount-auto-start-catch-up.spec.ts
```

```
AssertionError: expected { completedFocusSessions: 1, …(3) } to deeply equal { completedFocusSessions: 1, …(3) }

- Expected
+ Received

  {
    "completedFocusSessions": 1,
-   "phase": "focus",
-   "remainingSeconds": 10,
+   "phase": "shortBreak",
+   "remainingSeconds": 4,
    "status": "idle",
  }
```

### Code locations (tip `d4d6e6b`)

| Path                                                                                                                         | Lines   | Role                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------- |
| [`apps/pomo/src/features/pomodoro-timer/use-pomodoro-timer.ts`](apps/pomo/src/features/pomodoro-timer/use-pomodoro-timer.ts) | 283–293 | `stopOnUnmount` cleanup calls `synchronizePomodoroTimer` **without** `autoStartNextPhase` |
| [`apps/pomo/src/features/pomodoro-timer/use-pomodoro-timer.ts`](apps/pomo/src/features/pomodoro-timer/use-pomodoro-timer.ts) | 365–374 | `onStop` passes `autoStartNextPhase: isAutoStartEnabled()` — fixed path from #1604        |
| [`apps/pomo/src/features/pomodoro-timer/model.ts`](apps/pomo/src/features/pomodoro-timer/model.ts)                           | 152–176 | Multi-phase catch-up loop gated on `options.autoStartNextPhase`                           |
| [`apps/pomo/src/components/p-studio/Events.tsx`](apps/pomo/src/components/p-studio/Events.tsx)                               | 189–195 | Wires `stopOnUnmount={props.pomodoroVisible === false}`                                   |

### Distinct from open issues

- **#1604 / closed #1580** fixed **user Stop** (`onStop`) only; `stopOnUnmount` cleanup was not updated.
- Not **#1571** (onReset emits focus-end), **#1563** (auto-start OFF restore catch-up), **#1572** (pause catch-up spurious break-start), **#1585** (BroadcastChannel expiry), or **#1568** (passive tab sync) — this is **unmount persistence** with auto-start ON and multi-phase expiry.

---

## 2. Background hold mode resets slide deadline when `onVideoStart` follows `onReady`

**Severity:** P2

### Wrong vs expected

In `videoMode: 'hold'`, `Canvas` calls `playback.onReady()` when `showFrame` completes, then `FrameRenderer` fires `onVideoStart` when decoding/play begins. `onVideoStart` **always** overwrites `startedAt`, shortening the elapsed window used after the video ends. Expected: hold deadline stays anchored to when the frame became ready (`onReady`), so total visible time equals `photoSeconds` (video time + post-end hold).

Concrete failure: with `photoSeconds: 10`, `onReady` at t=0, `onVideoStart` at t=5s, video ends at t=9s — slide should advance at t=10s (1s hold after end). Actual: advance at t=15s (6s hold after end); slide stays on the finished video **5 seconds too long**.

### Repro steps

1. Set background preferences to `videoMode: 'hold'`, `photoSeconds: 10`.
2. Present a video slide where `showFrame` resolves (`onReady`) before the renderer emits `onVideoStart` (normal Canvas order in [`Canvas.tsx`](apps/pomo/src/components/frame/Canvas.tsx)).
3. Let the video finish.
4. Observe slide advance occurs later than `photoSeconds` after the frame first became ready.

### Test evidence

```bash
pnpm exec vitest run --project=unit apps/pomo/src/.bug-hunt/video-hold-deadline-on-video-start.spec.tsx
```

```
AssertionError: expected 'video' to be 'photo' // Object.is equality

Expected: "photo"
Received: "video"
```

(at t=10s from first `onReady`, after 1s post-end hold)

### Code locations (tip `d4d6e6b`)

| Path                                                                                                     | Lines   | Role                                                                                               |
| -------------------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------- |
| [`apps/pomo/src/features/background/use-playback.ts`](apps/pomo/src/features/background/use-playback.ts) | 59–85   | Hold-mode deadline: `photoSeconds - (Date.now() - startedAt)` after video ends                     |
| [`apps/pomo/src/features/background/use-playback.ts`](apps/pomo/src/features/background/use-playback.ts) | 109–116 | `onReady` sets `startedAt` once; `onVideoStart` unconditionally resets it                          |
| [`apps/pomo/src/components/frame/Canvas.tsx`](apps/pomo/src/components/frame/Canvas.tsx)                 | 38, 104 | `onVideoStart` wired to renderer; `onReady` after `showFrame` — natural order is ready-before-play |

### Distinct from open issues

- **#1631 / closed #1624** fixed **canceled** `present()` returning null (slideshow freeze on unmount). This is **hold-mode timing** when presentation succeeds but video start is delayed.
- Unrelated to feed, pomodoro, weather, or preference dual-write open issues.

---

## Additional confirmed repro (not filed — hunt cap)

[`apps/pomo/src/.bug-hunt/room-enter-action-after-unregister.spec.ts`](apps/pomo/src/.bug-hunt/room-enter-action-after-unregister.spec.ts) also fails: after an executor registers once, temporary unregister drops subsequent `room-enter` bound actions instead of re-queueing. Distinct from **#1552** (cancelled playback retry), **#1609** (onEvent failure), and **#1614** (missing dialogue completion). Omitted from the cap; repro preserved locally.

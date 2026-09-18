# Pomo Bug Hunt — `e63744851031732146adedf5f446fc28abf7db9e`

**Scope:** `apps/pomo` · **Focus:** #1501 (delayed-end / event actions / PNumberInput / versioned prefs)  
**Confirmed NEW bugs:** 2 (cap) · **Repro tests:** `apps/pomo/src/.bug-hunt/`

---

## Finding 1 — P2: 데스크톱 설정에서 지정 시간 종료 시작 버튼이 무반응

### Summary

`/desktop/dialog/settings` 등 비-홈 경로에서는 `PEventProvider`의 `isPlaybackEnabled`가 `false`입니다. `DelayedEndEventSettings`의 **시작** 버튼은 활성화되지만, `useDelayedEndEvent.start()`는 `isEnabled()`가 `false`이면 즉시 반환하여 타이머가 전혀 시작되지 않습니다. 사용자에게 오류나 비활성 표시가 없어 기능이 고장난 것처럼 보입니다.

### Repro steps

1. 데스크톱 설정 창(`/desktop/dialog/settings`)을 엽니다.
2. 대화 설정 → **지정 시간 후 종료**로 이동합니다.
3. 유효한 대기 시간(예: 1분)을 입력하고 **시작**을 누릅니다.
4. `delayedEndEventIsRunning`은 `false`로 남고, 타이머가 동작하지 않습니다.

### Test

- **Path:** [`apps/pomo/src/.bug-hunt/delayed-end-non-home-start.spec.ts`](apps/pomo/src/.bug-hunt/delayed-end-non-home-start.spec.ts)
- **Command:** `pnpm vitest run --project=unit apps/pomo/src/.bug-hunt/delayed-end-non-home-start.spec.ts`
- **Failure excerpt:**

```
FAIL  delayed-end-non-home-start.spec.ts > should start the delayed-end timer when playback is disabled on desktop settings routes
AssertionError: expected false to be true // Object.is equality

- Expected: true  (delayedEndEventIsRunning)
+ Received: false
```

### Code (tip SHA)

- [`use-delayed-end-event.ts#L39-L42`](https://github.com/bichikim/web/blob/e63744851031732146adedf5f446fc28abf7db9e/apps/pomo/src/features/focus-room-dialogue/use-delayed-end-event.ts#L39-L42) — `start()` no-op when `!isEnabled()`
- [`PFocusRoomLayout.tsx#L16-L21`](https://github.com/bichikim/web/blob/e63744851031732146adedf5f446fc28abf7db9e/apps/pomo/src/components/p-focus-room-layout/PFocusRoomLayout.tsx#L16-L21) — `isPlaybackEnabled` only on `/`
- [`DelayedEndEventSettings.tsx#L63-L72`](https://github.com/bichikim/web/blob/e63744851031732146adedf5f446fc28abf7db9e/apps/pomo/src/components/dialogue-settings/DelayedEndEventSettings.tsx#L63-L72) — Start calls `startDelayedEndEvent()` without route guard
- [`use-p-event-controller.ts#L349-L351`](https://github.com/bichikim/web/blob/e63744851031732146adedf5f446fc28abf7db9e/apps/pomo/src/features/focus-room-dialogue/use-p-event-controller.ts#L349-L351) — delayed-end `isEnabled` tied to playback scope

---

## Finding 2 — P2: 지정 시간 종료 시 일회성 음성(pomoSay)이 중단되지 않음

### Summary

뽀모도로·랜덤 이벤트는 `Events.tsx`의 `handlePomodoroEvents`를 통해 `playDialogueEvents(..., props.pomoSay.stop)`로 재생 전에 일회성 음성을 멈춥니다. 지정 시간 종료 타이머는 `use-p-event-controller`에서 `playDialogueEvents([DELAYED_END_EVENT])`만 호출하여 `onBeforePlayback`이 전달되지 않습니다. 타이머가 만료될 때 채팅/답변 음성이 재생 중이면 대화와 겹쳐 재생됩니다.

### Repro steps

1. 홈(`/`)에서 일회성 채팅 답변 음성(`pomoSay`)을 재생 중인 상태로 만듭니다.
2. 지정 시간 종료를 1분으로 설정하고 **시작**합니다.
3. 타이머 만료 시 `pomoSay.stop`이 호출되지 않고, 대화 재생이 음성과 겹칩니다.

### Test

- **Path:** [`apps/pomo/src/.bug-hunt/delayed-end-speech-stop.spec.ts`](apps/pomo/src/.bug-hunt/delayed-end-speech-stop.spec.ts)
- **Command:** `pnpm vitest run --project=unit apps/pomo/src/.bug-hunt/delayed-end-speech-stop.spec.ts`
- **Failure excerpt:**

```
FAIL  delayed-end-speech-stop.spec.ts > should stop active one-off speech before delayed-end dialogue playback
AssertionError: expected "vi.fn()" to be called once, but got 0 times

  expect(stopExternalSpeech).toHaveBeenCalledOnce()
  // timer-fired path: playSequence ran, stopExternalSpeech never called
```

### Code (tip SHA)

- [`use-p-event-controller.ts#L349-L351`](https://github.com/bichikim/web/blob/e63744851031732146adedf5f446fc28abf7db9e/apps/pomo/src/features/focus-room-dialogue/use-p-event-controller.ts#L349-L351) — `onEvent` omits `onBeforePlayback`
- [`use-p-event-controller.ts#L310-L346`](https://github.com/bichikim/web/blob/e63744851031732146adedf5f446fc28abf7db9e/apps/pomo/src/features/focus-room-dialogue/use-p-event-controller.ts#L310-L346) — `onBeforePlayback?.()` only when caller supplies it
- [`Events.tsx#L116-L133`](https://github.com/bichikim/web/blob/e63744851031732146adedf5f446fc28abf7db9e/apps/pomo/src/components/p-studio/Events.tsx#L116-L133) — pomodoro/random pass `pomoSay.stop`; delayed-end bypasses this path

---

## Additional candidate (not counted — cap 2)

**P3: 저장 실패 롤백 후 UI draft와 시그널 불일치로 잘못된 시간에 타이머 시작**  
Repro: [`apps/pomo/src/.bug-hunt/delayed-end-draft-duration.spec.tsx`](apps/pomo/src/.bug-hunt/delayed-end-draft-duration.spec.tsx) — Start uses `delayedEndEventDurationMinutes()` (30) while input shows 45 after failed save.

---

## Areas scanned — no NEW confirmed bug

| Area | Result |
|------|--------|
| Timer leak on unmount | Covered by existing `use-delayed-end-event.spec.ts` |
| Double-fire delayed end | `start()` cancels prior timer |
| `PNumberInput` NaN → persisted prefs | Invalid input skips `saveDuration`; schema rejects |
| Versioned preference repo races | Revision guards + existing tests |
| #1488 weather flash | Open #1497 / #1496 — not re-filed |
| #1487 SFX retry/drop | Closed #1494 / #1495 — not re-filed |
| Canvas texture dispose | Closed #1489 — not re-filed |

---

## Run all repro tests

```bash
pnpm vitest run --project=unit apps/pomo/src/.bug-hunt/
```

Expected: 3 failing tests (2 reported findings + 1 additional P3 candidate).

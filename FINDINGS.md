# Bug Hunt Findings — 2026-09-21

**Tip SHA:** `1fef737716c5d5d08aff8d4df75f7aec743bb28f`  
**Scope:** `apps/pomo` only  
**Repro tests:** `apps/pomo/src/.bug-hunt/`

---

## 1. Delayed-end: `cancelDelayedEndEvent`가 pending catch-up을 지우지 않음

**Severity:** P1

### Summary

`cancelDelayedEndEvent`는 `useDelayedEndEvent.cancel`만 호출해 타이머를 멈추고, `delayedEndPlayback.clearPendingEvent()`는 호출하지 않습니다. 반면 `startDelayedEndEvent`는 시작 시 `clearPendingEvent()`를 호출합니다.

off-home에서 타이머가 만료되면 `delayedEndPlayback.request()`가 `hasPendingEvent=true`로 남기고, 사용자가 설정에서 취소한 뒤 홈으로 돌아와도 `createEffect`가 pending을 보고 catch-up dialogue를 재생합니다.

**기대:** 사용자가 delayed-end를 취소하면 pending catch-up도 함께 무시되어야 함.  
**실제:** 취소 후 홈 복귀 시 delayed-end dialogue가 재생됨.

**부가 증상 (동일 root cause):** in-flight catch-up 중 취소해도 `playback.cancel()`이 호출되지 않아 stale dialogue가 계속 재생될 수 있음 (`cancel-delayed-end-inflight-gap.spec.tsx`).

### Repro

1. delayed-end 타이머 시작
2. playback 비활성(off-home) → 타이머 만료 → `hasPendingEvent=true`
3. `cancelDelayedEndEvent()` 호출
4. playback 재활성(home) → catch-up dialogue 재생 (취소했어도)

### Test evidence

```bash
pnpm exec vitest run apps/pomo/src/.bug-hunt/cancel-delayed-end-pending-clear-gap.spec.tsx
```

```
AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times
  at expect(playback.playSequence).not.toHaveBeenCalled()
```

In-flight variant:

```bash
pnpm exec vitest run apps/pomo/src/.bug-hunt/cancel-delayed-end-inflight-gap.spec.tsx
```

```
AssertionError: expected "vi.fn()" to be called 2 times, but got 1 times
  at expect(playback.cancel).toHaveBeenCalledTimes(2)
```

### Code locations (tip SHA)

- [`use-p-event-controller.ts#L341`](https://github.com/bichikim/web/blob/1fef737716c5d5d08aff8d4df75f7aec743bb28f/apps/pomo/src/features/focus-room-dialogue/use-p-event-controller.ts#L341) — `cancelDelayedEndEvent: delayedEndEvent.cancel` (playback 연동 없음)
- [`use-p-event-controller.ts#L506-L510`](https://github.com/bichikim/web/blob/1fef737716c5d5d08aff8d4df75f7aec743bb28f/apps/pomo/src/features/focus-room-dialogue/use-p-event-controller.ts#L506-L510) — `startDelayedEndEvent`만 `clearPendingEvent()` 호출
- [`use-p-event-controller.ts#L520-L527`](https://github.com/bichikim/web/blob/1fef737716c5d5d08aff8d4df75f7aec743bb28f/apps/pomo/src/features/focus-room-dialogue/use-p-event-controller.ts#L520-L527) — `hasPendingEvent()` 시 catch-up 트리거
- [`delayed-end-playback.ts#L32-L36`](https://github.com/bichikim/web/blob/1fef737716c5d5d08aff8d4df75f7aec743bb28f/apps/pomo/src/features/focus-room-dialogue/use-p-event-controller/delayed-end-playback.ts#L32-L36) — off-home 시 pending 설정
- [`delayed-end-playback.ts#L64-L66`](https://github.com/bichikim/web/blob/1fef737716c5d5d08aff8d4df75f7aec743bb28f/apps/pomo/src/features/focus-room-dialogue/use-p-event-controller/delayed-end-playback.ts#L64-L66) — `clearPendingEvent` (cancel 경로에서 미호출)

### Why distinct

- **#1755:** playback **실패** 시 pending이 지워져 재시도 불가 (failure path).
- **#1754:** `startDelayedEndEvent`가 in-flight catch-up을 cancel하지 않음 (start/restart path).
- **이번 건:** `cancelDelayedEndEvent`가 pending을 지우지 않아 **취소 후** catch-up이 실행됨 (cancel path). #1754 body cap-note에서 언급됐으나 미집계 — 이번에 repro 테스트로 확인.

---

## 2. Feature-request: 삭제된 ghost 항목이 `loadMore` offset을 부풀려 서버 행을 건너뜀

**Severity:** P2

### Summary

`refresh()`의 `preserveLoadedPages` 병합은 서버 page 1에 없는 로컬 항목(삭제·모더레이션 등)을 tail에 유지합니다. `loadMore()`는 `offset = requests().length`를 사용하므로, ghost 항목이 offset을 부풀려 실제 서버 목록보다 큰 offset으로 요청합니다. 삭제 후 서버에 남은 행이 fetch되지 않을 수 있습니다.

**기대:** pagination offset이 서버 실제 행 수와 일치하거나, refresh 시 서버에 없는 항목은 제거.  
**실제:** ghost B가 남아 offset=2로 요청 → 서버에 A,C만 있으면 C를 건너뜀.

### Repro

1. page 1 `[A]`, `loadMore` → `[A, B]`
2. 서버에서 B 삭제, `refresh()` → 로컬 `[A, B]` (B ghost 유지)
3. `loadMore()` → `offset: 2` → 서버 `[A, C]`에서 C 미수신

### Test evidence

```bash
pnpm exec vitest run apps/pomo/src/.bug-hunt/feature-request-ghost-offset-gap.spec.ts
```

```
AssertionError: expected [ A, B ] to deeply equal [ A, B, C ]
  at expect(result.requests()).toEqual([REQUEST_A, REQUEST_B, REQUEST_C])
```

(API는 `{offset: 2}`로 호출됨 — ghost가 offset을 1만큼 부풀림)

### Code locations (tip SHA)

- [`use-feature-requests.ts#L90-L98`](https://github.com/bichikim/web/blob/1fef737716c5d5d08aff8d4df75f7aec743bb28f/apps/pomo/src/features/feature-requests/use-feature-requests.ts#L90-L98) — refresh 시 서버에 없는 로컬 항목 유지
- [`use-feature-requests.ts#L127`](https://github.com/bichikim/web/blob/1fef737716c5d5d08aff8d4df75f7aec743bb28f/apps/pomo/src/features/feature-requests/use-feature-requests.ts#L127) — `offset = requests().length`
- [`feature-requests/index.ts#L106-L131`](https://github.com/bichikim/web/blob/1fef737716c5d5d08aff8d4df75f7aec743bb28f/apps/pomo/src/server/repositories/feature-requests/index.ts#L106-L131) — SQL `OFFSET` pagination

### Why distinct

- **#1728:** refresh 실패 시 `hasMore`가 false로 고정되는 문제.
- **이번 건:** refresh **성공** 후 ghost retention + `offset = requests().length`로 인한 **pagination skip** — `hasMore`와 별개의 offset bookkeeping 결함.

---

## Priority 0 dismissals

| Item                                           | Result                                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------- |
| `cancelDelayedEndEvent` pending clear API gap  | **Confirmed** (Finding 1)                                                 |
| Background slideshow transition → `markFailed` | **Not reported** — `Canvas.spec.tsx`가 현재 동작을 intentional로 테스트함 |
| Feature-request ghost offset                   | **Confirmed** (Finding 2)                                                 |

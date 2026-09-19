# Bug hunt findings — 2026-09-19 (tip `652c34f3`)

Scope: `apps/pomo` only. Two NEW confirmed bugs (repro tests under `apps/pomo/src/.bug-hunt/`). No GitHub issues opened.

---

## 1. History cron skips OpenAI submit when daily run is stuck in `preparing` without a response ID

**Severity:** P1

### Wrong vs expected

- **Wrong:** If `prepareGenerationRun` already created today's row but the worker dies before `submitHistoryResponse`, every later `startHistoryGeneration` call sees `created: false` and returns `{ status: 'existing' }` without calling OpenAI. The row stays in `preparing` with `openAiResponseId: null` until recovery eventually marks it expired (~30 minutes), and `prepareGenerationRun` still will not resubmit expired `preparing` rows—so the daily "today in history" generation can stall for that publication date.
- **Expected:** When the existing daily run is still `preparing` and has no `openAiResponseId`, the cron should submit (or reopen) that run instead of treating it as complete.

### Repro steps

1. Cron invokes `startHistoryGeneration`; `prepareGenerationRun` inserts a row (`status: 'preparing'`, `openAiResponseId: null`).
2. Process crashes before `submitHistoryResponse` runs.
3. Cron invokes `startHistoryGeneration` again with the same target date.
4. `prepare` returns `{ created: false, run: <preparing, null responseId> }`.
5. Observe early return at lines 60–66 with `status: 'existing'`; `submit` is never called.

### Test evidence

```bash
pnpm vitest run --project=unit apps/pomo/src/.bug-hunt/history-generation-preparing-no-resubmit.spec.ts
```

```
AssertionError: expected { responseId: null, …(3) } to match object { responseId: 'resp-resubmit', …(1) }

- Expected
+ Received

  {
-   "responseId": "resp-resubmit",
-   "status": "submitted",
+   "responseId": null,
+   "status": "existing",
  }

expect(submit).toHaveBeenCalledOnce()  // submit mock call count: 0
```

Repro test: [`apps/pomo/src/.bug-hunt/history-generation-preparing-no-resubmit.spec.ts`](apps/pomo/src/.bug-hunt/history-generation-preparing-no-resubmit.spec.ts)

### Source (tip `652c34f3`)

- [`apps/pomo/src/server/history-generation/start-generation.ts:60-66`](apps/pomo/src/server/history-generation/start-generation.ts#L60-L66) — unconditional early return when `!prepared.created`
- [`apps/pomo/src/server/repositories/history-generation/index.ts:123-183`](apps/pomo/src/server/repositories/history-generation/index.ts#L123-L183) — `prepareGenerationRun` returns existing `preparing` row without reopening when `submissionState` is null or `expired`

### Distinct from open issues

- **#1570** covers ambiguous submission stalls after an unknown/rejected acceptance path, not a never-submitted `preparing` row with `submissionState: null`.
- Recovery tests explicitly expect expired ambiguous runs **not** to auto-resubmit via `prepareGenerationRun` ([`index.spec.ts:51-59`](apps/pomo/src/server/repositories/history-generation/__tests__/index.spec.ts)); this bug is the complementary gap where `startHistoryGeneration` also never submits the still-unsubmitted row.

---

## 2. Military service calculator shows empty state before mount because `useLocalDate()` starts as `''`

**Severity:** P2

### Wrong vs expected

- **Wrong:** `Service` calls `useLocalDate()` without `initialDate`. Until `onMount`, `today()` is `''`, so `calculateService` receives an unparseable today and returns `null` even when a valid enlistment date is already saved. The UI shows the fallback “입대일과 복무기간을 확인해주세요.” and a blank “현재 기기의 날짜  기준” line on first paint / SSR hydration.
- **Expected:** With a saved enlistment date, remaining days and discharge estimate should be available on the first render (same pattern as the calendar month hook, which passes `initialDate` into `useLocalDate`).

### Repro steps

1. Persist a valid enlistment date (e.g. `2024-03-01`) in service settings.
2. Open the military service calculator (`Service` component).
3. Before `onMount` runs, `useLocalDate()` returns `''`.
4. `calculateService({ start: '2024-03-01', today: '', branch: 'army' })` returns `null`.
5. Result block stays on the error/empty fallback until mount completes.

### Test evidence

```bash
pnpm vitest run --project=unit apps/pomo/src/.bug-hunt/service-empty-today.spec.tsx
```

```
AssertionError: expected null not to be null

expect(view.result.initialToday).toBe('')   // passes — today is empty pre-mount
expect(view.result.initialResult).not.toBeNull()  // fails — calculateService returns null
```

Repro test: [`apps/pomo/src/.bug-hunt/service-empty-today.spec.tsx`](apps/pomo/src/.bug-hunt/service-empty-today.spec.tsx)

### Source (tip `652c34f3`)

- [`apps/pomo/src/components/tools/Service.tsx:24-38`](apps/pomo/src/components/tools/Service.tsx#L24-L38) — `useLocalDate()` without `initialDate`; feeds `today()` into `calculateService`
- [`apps/pomo/src/features/civil-date/use-local-date.ts:11-13`](apps/pomo/src/features/civil-date/use-local-date.ts#L11-L13) — default signal is `''` when `initialDate` is omitted
- [`apps/pomo/src/features/tools/calculate-service.ts:20-24`](apps/pomo/src/features/tools/calculate-service.ts#L20-L24) — `parseDate('')` → `null` → whole calculation aborted
- Contrast: [`apps/pomo/src/components/calendar-month/use-month.ts:109`](apps/pomo/src/components/calendar-month/use-month.ts#L109) passes `initialDate` to avoid this gap

### Distinct from open issues

- **#1575** / **#1566** — calendar month grid / query-range timezone bugs, not the tools service calculator.
- **#1581** — picture diary midnight save date, not `useLocalDate` pre-mount blank in the service tool.

---

## Areas checked without a new confirmed bug

- Pomodoro auto-start catch-up from expired non-boundary phases: `synchronizePomodoroTimer` reaches cycle-boundary `skipWholeCycles` within a few iterations even after long absence; no failing repro under `.bug-hunt/`.
- Focus-room playback pending-position persistence skip: covered by intentional tests in [`use-focus-room-playback-persistence.spec.ts`](apps/pomo/src/features/focus-room-audio/__tests__/use-focus-room-playback-persistence.spec.ts).

# Pomo bug hunt — tip `0769b6cce1974316aefcc15b5beab019a686a41a`

Confirmed **2** new bugs (cap). Each has a failing repro under `apps/pomo/src/.bug-hunt/`.

---

## 1. Feed listen: stop before playback still marks item listened

**Severity:** P2

**Summary:** When a user starts listening to a single feed dialogue and stops before audio begins (`onDialogueStart` never fires), `createFeedPlaybackController.listen` still marks the item as listened via `onSequenceStop → markDialoguesListened`. Expected: only dialogues that actually started playing (or were intentionally dismissed in batch mode) should be marked listened; a pre-start stop should leave `listenedAt` null.

**Repro steps:**
1. Have one unlistened feed dialogue in state.
2. Call `listen(dialogueId)`; simulate playback stopping immediately (queue settles with `stopped` before `onDialogueStart`).
3. Observe `markListened` is called and local `listenedAt` is set even though playback never started.

**Test evidence:**

```bash
pnpm exec vitest run --project=unit apps/pomo/src/.bug-hunt/feed-listen-stop-before-start.spec.ts
```

```
× should not mark a feed item listened when the user stops before audio starts
→ expected "vi.fn()" to not be called at all, but actually been called 1 times
  1st vi.fn() call: ["feed-item-1", "2026-08-14T01:00:00.000Z"]
```

**Source (tip `0769b6cc`):**
- [`apps/pomo/src/features/focus-room-feed/feed-playback.ts:35-59`](/workspace/apps/pomo/src/features/focus-room-feed/feed-playback.ts#L35-L59) — `markDialoguesListened` marks every pending ID without checking whether playback started.
- [`apps/pomo/src/features/focus-room-feed/feed-playback.ts:91-97`](/workspace/apps/pomo/src/features/focus-room-feed/feed-playback.ts#L91-L97) — single `listen` wires the same `onSequenceStop: markDialoguesListened` used for batch dismiss.
- [`apps/pomo/src/features/focus-room-dialogue/entry-playback-controller/queue.ts:79-82`](/workspace/apps/pomo/src/features/focus-room-dialogue/entry-playback-controller/queue.ts#L79-L82) — `stopped` completion always invokes `onSequenceStop` with the full sequence.

**Distinct from open issues:**
- **#1587** (closed): pre-play *mark* race during normal listen flow — not user stop before start.
- **#1573**: orphan feedItems blocking resync — unrelated persistence.
- **#1607 / #1606**: dialogue editor / random-event settings — unrelated.

---

## 2. Entry room-enter: failed event action is never retried but dialogue still plays

**Severity:** P2

**Summary:** `createEntryEventPlayback` sets `hasTriggeredEvent = true` before `onEvent` resolves. If `onEvent` rejects, the catch handler clears `pendingEventExecution` but leaves `hasTriggeredEvent` true. A later `tryPlay()` skips `onEvent` and proceeds directly to `startPlayback()`, so entry dialogue can play without the bound room-enter action ever succeeding.

**Repro steps:**
1. Enter focus room with entry dialogue configured and `onEvent` bound to a room-enter action.
2. Make `onEvent` reject once (e.g. transient storage error).
3. Call `tryPlay()` again after the failure.
4. Observe `onEvent` is not called again while `playSequence` runs.

**Test evidence:**

```bash
pnpm exec vitest run --project=unit apps/pomo/src/.bug-hunt/entry-event-action-no-retry-after-failure.spec.ts
```

```
× should retry the room-enter event action before playing entry dialogue after a failure
→ expected "vi.fn()" to be called 2 times, but got 1 times
```

**Source (tip `0769b6cc`):**
- [`apps/pomo/src/features/focus-room-dialogue/use-p-event-controller/entry-playback.ts:73-77`](/workspace/apps/pomo/src/features/focus-room-dialogue/use-p-event-controller/entry-playback.ts#L73-L77) — `hasTriggeredEvent` flipped before `onEvent` outcome is known.
- [`apps/pomo/src/features/focus-room-dialogue/use-p-event-controller/entry-playback.ts:126-137`](/workspace/apps/pomo/src/features/focus-room-dialogue/use-p-event-controller/entry-playback.ts#L126-L137) — retry path calls `startPlayback` when `pendingEventExecution` is cleared, without resetting `hasTriggeredEvent` or re-invoking `onEvent`.

**Distinct from open issues:**
- **#1607**: stale session draft overwrites in-flight editor edits — different surface (dialogue editor load), not entry `onEvent` retry.
- **#1547**: entry greeting *cancelled* → no retry for greeting audio — cancellation/lifecycle, not failed bound action before playback.
- **#1546** (closed via #1559): bound actions after dialogue ordering — different ordering bug, already fixed.
- **#1534 / #1533**: catch-up bound actions / double-play — pomodoro catch-up, not focus-room entry.

---

## Additional confirmed repros (not filed — cap 2)

These also fail at tip `0769b6cc` but are omitted from the cap:

| Repro file | One-line issue |
|---|---|
| `language-learning-delete-case-insensitive.spec.ts` | `deleteLanguageLearningWord` is case-sensitive while `appendLanguageLearningWords` dedupes case-insensitively. |
| `memory-memo-web-migration-on-empty-toss.spec.ts` | `createMemoryMemoRepository.read` wipes web memos when Toss returns `null` instead of migrating web data. |

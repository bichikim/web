# Bug hunt findings — tip `df4494a8df4260ff0c62835f31e522ed3447e867`

Scope: `apps/pomo` only. Two **new confirmed** bugs with failing repro tests under [`apps/pomo/src/.bug-hunt/`](apps/pomo/src/.bug-hunt/). No GitHub issues or PRs opened.

---

## 1. Feature requests: concurrent refresh reverts a successful vote

**Severity:** P2

### Summary

`useFeatureRequests()` applies vote results optimistically via `updateRequestVote`, but a concurrent `refresh()` replaces the entire list with the fetched page. When refresh completes after the vote API succeeds, the UI reverts to pre-vote `voteCount` / `votedByCurrentUser` even though the server recorded the vote.

**Expected:** A completed vote stays visible after refresh (or refresh merges server state with in-flight optimistic updates).

**Actual:** Refresh unconditionally calls `setRequests(page.requests)` and overwrites the optimistic vote.

### Repro steps

1. Open the feature-request list (initial page loads).
2. Start voting on a request (slow mocked/API vote).
3. Trigger refresh while the vote is in flight.
4. Wait for vote to succeed — UI briefly shows `votedByCurrentUser: true` and incremented `voteCount`.
5. Wait for refresh to finish — vote state reverts to pre-vote values.

### Test evidence

```bash
cd /workspace
pnpm exec vitest run apps/pomo/src/.bug-hunt/vote-refresh-race.spec.ts
```

Failure excerpt:

```
AssertionError: expected voteCount 3 / votedByCurrentUser true
Received: voteCount 2 / votedByCurrentUser false
```

Repro test: [`apps/pomo/src/.bug-hunt/vote-refresh-race.spec.ts`](apps/pomo/src/.bug-hunt/vote-refresh-race.spec.ts)

### Code locations (tip `df4494a8`)

| Path                                                                                                                                 | Lines   | Role                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------- | ------------------------------------------------------------------------------ |
| [`apps/pomo/src/features/feature-requests/use-feature-requests.ts`](apps/pomo/src/features/feature-requests/use-feature-requests.ts) | 38–64   | `refresh()` unconditionally `setRequests(page.requests)`                       |
| [`apps/pomo/src/features/feature-requests/use-feature-requests.ts`](apps/pomo/src/features/feature-requests/use-feature-requests.ts) | 116–145 | `updateRequestVote` / `voteRequest` optimistic update with no merge on refresh |

### Why distinct from open issues

- **#1683** — `createRequest()` after `loadMore()` collapses pagination via `refresh()` at offset 0 (create path, pagination loss).
- **Closed #1671 / #1657** — vote-triggered refresh collapsing loaded pages; vote no longer calls `refresh()`.
- This bug is a **concurrent refresh + vote race**: pagination is unchanged, but an in-flight optimistic vote is clobbered by a stale refresh response. Not covered by existing open issues.

---

## 2. Sound-generation worker: overlapping requests run in parallel

**Severity:** P2

### Summary

The sound-generation worker handles each `postMessage` in a fire-and-forget `onmessage` handler with **no in-flight guard**. Two requests dispatched before the first `generateExtendedSound` / `generateLoopSound` / `generateSound` completes both run, emit progress/result messages, and can race on shared runtime state.

Chat, dialogue-writer, and album-translation workers gained `generationInFlight` / `translationInFlight` guards in recent merges (#1668, #1680, #1674). Sound-generation was not updated.

`useSoundGeneration()` blocks a second UI `generate()` via `busy()`, but the worker itself remains unsafe for concurrent messages (custom callers, future refactors, or a reused worker instance).

**Expected:** Second in-flight worker request is ignored or serialized (same pattern as [`apps/pomo/src/features/chat/worker.ts`](apps/pomo/src/features/chat/worker.ts) L217–224).

**Actual:** Both handlers invoke generation; `generateExtendedSound` is called twice.

### Repro steps

1. Load the sound-generation worker in a test harness (see repro spec).
2. Post a `SoundRequest` and await the mocked generator (hold first call pending).
3. Post a second `SoundRequest` before the first resolves.
4. Resolve the first generation.
5. Observe two generation calls and two `result` messages.

### Test evidence

```bash
cd /workspace
pnpm exec vitest run apps/pomo/src/.bug-hunt/sound-generation-worker-inflight.spec.ts
```

Failure excerpt:

```
AssertionError: expected "vi.fn()" to be called once, but got 2 times
```

Repro test: [`apps/pomo/src/.bug-hunt/sound-generation-worker-inflight.spec.ts`](apps/pomo/src/.bug-hunt/sound-generation-worker-inflight.spec.ts)

### Code locations (tip `df4494a8`)

| Path                                                                                                                                 | Lines | Role                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------ | ----- | ------------------------------------------------------------- |
| [`apps/pomo/src/features/sound-generation/worker.ts`](apps/pomo/src/features/sound-generation/worker.ts)                             | 37–66 | `scope.onmessage` async handler with no in-flight guard       |
| [`apps/pomo/src/features/sound-generation/use-sound-generation.ts`](apps/pomo/src/features/sound-generation/use-sound-generation.ts) | 37–42 | Hook-level `busy()` only; does not protect worker concurrency |

Contrast (fixed sibling pattern): [`apps/pomo/src/features/chat/worker.ts`](apps/pomo/src/features/chat/worker.ts) L38, L217–224 — `generationInFlight` guard.

### Why distinct from open issues

- Sibling of **closed** worker-guard fixes (#1668 chat, #1680 dialogue-writer, #1674 album-translation), not a restatement of any **open** issue.
- Unrelated to #1684 (desktop wallpaper event executor), feed issues (#1651, #1573, #1683), language-learning (#1681, #1682), pomodoro, media player, calendar, etc.

---

## Hunt notes

- Tip change since prior hunt: docs-only (#1675); product code unchanged.
- Additional worker overlap (speech-to-text transcribe) was observed but not reported here to stay within the **2-bug cap**.
- Repro tests are local only; run from monorepo root (`/workspace`) so Vitest project config resolves correctly.

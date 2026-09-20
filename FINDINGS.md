# Bug hunt findings — tip `91f7c7f26fd1c360b81477561a405923e0ea36fb`

Hunt date: 2026-09-20. Scope: `apps/pomo` only. Confirmed bugs: **2**.

---

## 1. Admin feature-request status update collapses `loadMore` pagination

**Severity:** P2

### Wrong vs expected

After an administrator loads additional feature-request pages with `loadMore`, a successful status update replaces the in-memory list with the **first page only**. Appended rows disappear and `hasMore` can flip back to `true` even though the user had already reached the end.

**Expected:** keep already-loaded pages (or refresh through the same offset window) and preserve pagination state after a single-row admin update.

### Repro steps

1. Open the admin feature-requests view backed by `useAdminFeatureRequests`.
2. Let the first page load (`hasMore: true`, one row).
3. Call `loadMore()` so the list contains page 1 + page 2 (`hasMore: false`).
4. Call `updateRequest()` for a row on page 1 and receive `{ status: 'updated' }`.
5. Observe `requests()` shrink to the first page only.

### Test evidence

```bash
pnpm exec vitest run apps/pomo/src/.bug-hunt/admin-feature-request-update-collapses-loadmore.spec.ts
```

Fail excerpt:

```
AssertionError: expected [ { … REQUEST … } ] to deeply equal [ REQUEST, NEXT_REQUEST ]
 ❯ apps/pomo/src/.bug-hunt/admin-feature-request-update-collapses-loadmore.spec.ts:56:29
     56|   expect(result.requests()).toEqual([REQUEST, NEXT_REQUEST])
```

### Code (tip permalinks)

- [`apps/pomo/src/features/feature-requests/use-admin-feature-requests.ts` L99–108](https://github.com/bichikim/web/blob/91f7c7f26fd1c360b81477561a405923e0ea36fb/apps/pomo/src/features/feature-requests/use-admin-feature-requests.ts#L99-L108) — successful admin update always awaits `refresh()`, which reloads offset `0` only (see L41–56 in the same file).
- Repro: [`apps/pomo/src/.bug-hunt/admin-feature-request-update-collapses-loadmore.spec.ts`](https://github.com/bichikim/web/blob/91f7c7f26fd1c360b81477561a405923e0ea36fb/apps/pomo/src/.bug-hunt/admin-feature-request-update-collapses-loadmore.spec.ts)

### Distinct from open issues

- **#1657** covers the **user** `voteRequest()` path after `loadMore`, not the **admin** `updateRequest()` path (`updateAdminFeatureRequest` + admin dashboard UI).
- Different API, controller, and mutation trigger; same pagination symptom but not the issue already filed for voting.

---

## 2. Chat worker allows overlapping `generate` requests

**Severity:** P2

### Wrong vs expected

The chat dedicated worker handles each incoming `message` by calling `handleRequest()` with **no in-flight guard**. Two `generate` messages dispatched before the first finishes both run `generateAnswer()` concurrently and emit independent `token` / `draft` / `complete` streams. Responses carry no request correlation beyond `replyId` inside payloads, so a host that dispatches twice (tests, future callers, or races around worker restart) can interleave or duplicate completion events.

**Expected:** at most one generation runs at a time per worker, or each response is tagged so the client can ignore stale generations.

### Repro steps

1. Load the chat worker test harness (see repro spec).
2. Stub `textRuntime.generate` with two deferred promises.
3. Dispatch `generate` for `reply-a`, then immediately dispatch `generate` for `reply-b` without awaiting the first.
4. Resolve both deferred promises.
5. Observe **two** `complete` postMessages (one per reply).

### Test evidence

```bash
pnpm exec vitest run apps/pomo/src/.bug-hunt/chat-worker-concurrent-generate.spec.ts
```

Fail excerpt:

```
AssertionError: expected [ …, … ] to have a length of 1 but got 2
 ❯ apps/pomo/src/.bug-hunt/chat-worker-concurrent-generate.spec.ts:158:31
    158|     expect(completeResponses).toHaveLength(1)
```

### Code (tip permalinks)

- [`apps/pomo/src/features/chat/worker.ts` L213–232](https://github.com/bichikim/web/blob/91f7c7f26fd1c360b81477561a405923e0ea36fb/apps/pomo/src/features/chat/worker.ts#L213-L232) — `handleRequest` / message listener start a new async handler per message with no queue or active-generation check; `generateAnswer` (L171–211) always posts `complete`.
- Related client surface: [`apps/pomo/src/features/chat/use-chat.ts` L208–221](https://github.com/bichikim/web/blob/91f7c7f26fd1c360b81477561a405923e0ea36fb/apps/pomo/src/features/chat/use-chat.ts#L208-L221) merges responses without generation IDs.
- Repro: [`apps/pomo/src/.bug-hunt/chat-worker-concurrent-generate.spec.ts`](https://github.com/bichikim/web/blob/91f7c7f26fd1c360b81477561a405923e0ea36fb/apps/pomo/src/.bug-hunt/chat-worker-concurrent-generate.spec.ts)

### Distinct from open issues

- Draft PR **#1654** targets shared text-generation executor cancellation across features, not this chat-worker message handler lacking generation serialization.
- No open issue describes overlapping chat-worker `generate` handlers or uncorrelated worker `complete` events.

---

## Rejected candidates (not confirmed product bugs)

| Candidate | Reason |
|-----------|--------|
| Screen saver / scene style stale web overwrites native | Current behavior is covered by intentional repair tests in `storage.spec.ts` / `style-storage.spec.ts` (web copy wins when present). |
| `useTextMood.prepare()` after mid-load `setText()` | Model readiness is text-agnostic; `ready` after prepare is correct even if the textarea changed during download. |

---

## Repro tests location

Failing repro specs are kept under [`apps/pomo/src/.bug-hunt/`](https://github.com/bichikim/web/tree/91f7c7f26fd1c360b81477561a405923e0ea36fb/apps/pomo/src/.bug-hunt). Run from repository root as shown above.

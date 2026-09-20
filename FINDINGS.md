# Bug hunt findings — 2026-09-20 (tip `55c4b001ba1df70239704cc556eb4e4b3a76bfb8`)

Scope: `apps/pomo` Priority 0 edges (admin album-translation / dialogue-writer workers).  
Prior #1664 dual-write parity probes not re-run. No GitHub issues or PRs opened.

---

## 1. Album translation worker emits duplicate `complete` for overlapping translate requests (P1)

### Summary

`apps/pomo/src/features/album-translation/worker.ts` handles every `message` event with a fire-and-forget `translateAlbum()` call. When two translate requests overlap on the same Worker, both runs finish and each posts `type: 'complete'`. The UI hook (`useAlbumTranslation`) has no request correlation, so a slower first request can overwrite a newer second result.

**Expected:** Only the latest in-flight translate should emit `complete` (or earlier runs should be cancelled/ignored).  
**Actual:** Every overlapping run emits `complete`; hooks apply whichever arrives last.

### Repro steps

1. Load the album-translation worker test harness (see repro test).
2. Dispatch two `translate` messages before the first `textRuntime.generate()` resolves.
3. Resolve both deferred generates in order.
4. Observe two `complete` responses; the first request’s payload can be the final one applied at the hook layer.

### Test evidence

```bash
pnpm exec vitest run apps/pomo/src/.bug-hunt/album-translation-overlap.spec.ts --reporter=verbose
pnpm exec vitest run apps/pomo/src/.bug-hunt/use-album-translation-overlap.spec.ts --reporter=verbose
```

```
FAIL … should emit only one complete for the latest overlapping translate request
AssertionError: expected [ …(2) ] to have a length of 1 but got 2
```

Hook-level stale overwrite:

```
FAIL … should not apply a stale complete after a newer translate has already finished
AssertionError: expected last "vi.fn()" call to have been called with [ SECOND ] but received FIRST
```

### Code locations (tip `55c4b001ba1df70239704cc556eb4e4b3a76bfb8`)

- Worker fan-out: [`apps/pomo/src/features/album-translation/worker.ts`](apps/pomo/src/features/album-translation/worker.ts#L42-L50)
- Hook accepts any `complete`: [`apps/pomo/src/features/album-translation/use-album-translation.ts`](apps/pomo/src/features/album-translation/use-album-translation.ts#L75-L82)

### Distinct from open issues

- **#1662** — chat worker `generateAnswer` duplicate `complete` (different feature/worker; draft #1668).
- **#1654** — chat cancellation draft PR, not album translation.
- Not a preference/dual-write/storage race (#1579, #1561, etc.).

---

## 2. Dialogue writer worker emits duplicate `complete` for overlapping generate requests (P1)

### Summary

`apps/pomo/src/features/dialogue-writer/worker.ts` dispatches each `generate` message concurrently via `handleRequest()` without tracking in-flight work. Overlapping generates each emit `started` → tokens → `complete`. `useDialogueWriter` applies every `complete`, so a stale first answer can replace a newer second answer in `output` / `onComplete`.

**Expected:** At most one `complete` per latest generate request.  
**Actual:** Multiple concurrent generates all complete; last-arriving (not latest-started) wins in the hook.

### Repro steps

1. Load the dialogue-writer worker test harness.
2. Dispatch two `generate` messages before the first mocked `textRuntime.generate()` resolves.
3. Resolve both in order.
4. Observe two `complete` messages (`첫 번째 답변.` then `두 번째 답변.`).

### Test evidence

```bash
pnpm exec vitest run apps/pomo/src/.bug-hunt/dialogue-writer-overlap.spec.ts --reporter=verbose
pnpm exec vitest run apps/pomo/src/.bug-hunt/use-dialogue-writer-overlap.spec.ts --reporter=verbose
```

```
FAIL … should emit only one complete for the latest overlapping generate request
AssertionError: expected [ { text: '첫 번째 답변.', … }, … ] to have a length of 1 but got 2
```

Hook-level stale overwrite:

```
FAIL … should not apply a stale complete after a newer generate has already finished
AssertionError: expected last "vi.fn()" call to have been called with [ '두 번째 답변.' ] but received '첫 번째 답변.'
```

### Code locations (tip `55c4b001ba1df70239704cc556eb4e4b3a76bfb8`)

- Worker fan-out: [`apps/pomo/src/features/dialogue-writer/worker.ts`](apps/pomo/src/features/dialogue-writer/worker.ts#L61-L79)
- Hook accepts any `complete`: [`apps/pomo/src/features/dialogue-writer/use-dialogue-writer.ts`](apps/pomo/src/features/dialogue-writer/use-dialogue-writer.ts#L160-L166)

### Distinct from open issues

- **#1662** — same failure _class_ but confined to the **chat** worker path; dialogue-writer is a separate Worker and admin/dev surface.
- Not covered by chat draft **#1654** / **#1668**.

---

## Notes

- Normal UI paths gate a second call with `isBusy()` / `canGenerate()`, but the Workers remain unsafe (no serialization or request ids). Any double `postMessage`—transport edge, future caller, or client reuse—surfaces wrong translations/output.
- Repro tests live under `apps/pomo/src/.bug-hunt/` (intentionally failing).

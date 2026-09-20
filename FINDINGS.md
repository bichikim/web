# Bug hunt findings — 2026-09-21 07:43 KST

Tip SHA: `a8bfb56db60466e9fb5e29519529d53f0424a370` (unchanged since 06:40 hunt)

Scope: `apps/pomo` only. Two NEW confirmed bugs (cap 2). Repro tests live under [`apps/pomo/src/.bug-hunt/`](apps/pomo/src/.bug-hunt/).

---

## 1. Dialogue writer: late `ready` downgrades `generating` mid-stream

**Severity:** P2

**Summary:** While dialogue output is still streaming (`generating`), a concurrent or late worker `{type: 'ready'}` response overwrites UI state to `ready`. Status text switches to “모델 준비가 끝났어요…” and `isBusy()` becomes false even though tokens are still arriving. Expected: `ready` must not replace an in-flight `generating` (or `complete`) state.

**Repro steps**

1. Prepare the dialogue writer model until `ready`.
2. Start generation; receive `started` and at least one `{type: 'token'}`.
3. Emit another `{type: 'ready'}` (e.g. overlapping worker `prepare` completes during generation).
4. Observe `state().status === 'ready'` while `output()` still holds partial text.

**Test evidence**

```bash
pnpm exec vitest run apps/pomo/src/.bug-hunt/dialogue-writer-ready-during-generating.spec.ts --project unit
```

```
FAIL … should keep generating status when a late ready arrives during token streaming
AssertionError: expected { status: 'ready' } to deeply equal { status: 'generating' }
 ❯ apps/pomo/src/.bug-hunt/dialogue-writer-ready-during-generating.spec.ts:77:32
```

**Source (tip permalinks)**

- [`apps/pomo/src/features/dialogue-writer/use-dialogue-writer.ts#L181-L182`](https://github.com/bichikim/web/blob/a8bfb56db60466e9fb5e29519529d53f0424a370/apps/pomo/src/features/dialogue-writer/use-dialogue-writer.ts#L181-L182) — `ready` unconditionally `setState({status: 'ready'})`
- [`apps/pomo/src/features/dialogue-writer/use-dialogue-writer.ts#L190-L192`](https://github.com/bichikim/web/blob/a8bfb56db60466e9fb5e29519529d53f0424a370/apps/pomo/src/features/dialogue-writer/use-dialogue-writer.ts#L190-L192) — `started` correctly sets `generating`
- [`apps/pomo/src/features/dialogue-writer/worker.ts#L64-L79`](https://github.com/bichikim/web/blob/a8bfb56db60466e9fb5e29519529d53f0424a370/apps/pomo/src/features/dialogue-writer/worker.ts#L64-L79) — `prepare` bypasses `generationInFlight` guard

**Distinct from avoid list**

- Not **#1738** (entry dialogue user stop commits session).
- Not **#1739** (reply speech queue dispose hangs in-flight enqueue).
- Not **#1734/#1735/#1733/#1732/#1673** (other worker prepare/coalesce patterns).
- Not draft **#1654** (chat cancel/abort). This is the **dialogue-writer hook + worker** path.

---

## 2. Controlled playlist: saved playback dropped when restore runs before tracks arrive

**Severity:** P2

**Summary:** In controlled-queue mode (`tracks` prop set), `usePlaylistRestoration` restores playback exactly once on mount when `readPPlayback()` resolves. If `tracks()` is still empty at that moment, `resolvePlaybackRestore` discards stored position (`playback: null`). When tracks populate later, no second restore runs—saved seek position is lost permanently for that session.

**Repro steps**

1. Persist playback (e.g. `pomo:focus-room-playback:v1`) with a known `positionSeconds` and `trackId`.
2. Mount a controlled player with `tracks={[]}` (album/surface still loading).
3. Let `readPPlayback()` resolve while the queue is empty.
4. Populate `tracks` with the saved track.
5. Observe playback starts at position 0; saved seconds are never applied.

**Test evidence**

```bash
pnpm exec vitest run apps/pomo/src/.bug-hunt/controlled-playlist-empty-restore.spec.ts --project unit
```

```
FAIL … should restore saved playback after controlled tracks populate from an empty queue
AssertionError: expected "vi.fn()" to be called with arguments: [ [TRACK], STORED_PLAYBACK ]
Received:
  1st vi.fn() call: [ [], { positionSeconds: 8, trackId: 'track-1', … } ]
Number of calls: 1
 ❯ apps/pomo/src/.bug-hunt/controlled-playlist-empty-restore.spec.ts:80:23
```

**Source (tip permalinks)**

- [`apps/pomo/src/components/media-player/use-playlist-restoration.ts#L54-L63`](https://github.com/bichikim/web/blob/a8bfb56db60466e9fb5e29519529d53f0424a370/apps/pomo/src/components/media-player/use-playlist-restoration.ts#L54-L63) — controlled branch: single `onRestore(props.tracks(), playback)` on mount
- [`apps/pomo/src/features/focus-room-audio/playback-restore.ts#L19-L21`](https://github.com/bichikim/web/blob/a8bfb56db60466e9fb5e29519529d53f0424a370/apps/pomo/src/features/focus-room-audio/playback-restore.ts#L19-L21) — empty `tracks` forces `playback: null`
- [`apps/pomo/src/components/media-player/create-player-queue-controller.ts#L87-L113`](https://github.com/bichikim/web/blob/a8bfb56db60466e9fb5e29519529d53f0424a370/apps/pomo/src/components/media-player/create-player-queue-controller.ts#L87-L113) — `initializePlayback` sets pending position from restoration result

**Distinct from avoid list**

- Not **#1731** (duplicate track ID on `queueChanged` / `onLoad` restore to first occurrence in **uncontrolled** mode).
- Not **#1727** (delayed-end catch-up double replay).
- Not **#1720** (closed shuffle-order restore). This is **controlled-queue timing**: one-shot restore before parent supplies tracks.

---

## Not reported (this hunt)

- **#1740 / #1739** — already filed on this tip at 06:40; skipped per BRIEF.
- Screen-saver activity throttle — intentional per [`use-screen-saver.spec.tsx`](apps/pomo/src/features/screen-saver/__tests__/use-screen-saver.spec.tsx) (“should throttle repeated activity while inactive without delaying the next activation”).
- Text-model download worker overlapping prepares — related to open worker-coalescing family; not confirmed as a separate filing this round (cap reached).

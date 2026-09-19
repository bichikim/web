# Bug hunt findings — tip `652c34f3e571e008e5e80993ad7bd05d2751a352`

Confirmed **2** new bugs in `apps/pomo`, each backed by a failing repro test under [`apps/pomo/src/.bug-hunt/`](apps/pomo/src/.bug-hunt/).

---

## 1. Playback restore clobbers a user seek that happens before pending position is applied

**Severity:** P2

### Wrong vs expected

- **Wrong:** While a track is loading and a stored playback position is pending restore, if the user seeks to a new position before `applyPendingPosition()` runs, `persistSeekedPlayback()` is ignored and restore snaps playback back to the stale pending seconds.
- **Expected:** A user seek during the restore window should be persisted and win over the pending restore value.

### Repro steps

1. Restore a playlist track with stored playback at 30s (`setPendingPosition({ positionSeconds: 30, ... })`).
2. Before calling `applyPendingPosition()`, set `audioElement.currentTime = 45` and call `persistSeekedPlayback()`.
3. Call `applyPendingPosition()`.
4. Observe stored playback and `audioElement.currentTime` remain at 30s instead of 45s.

### Test evidence

```bash
pnpm exec vitest run --project=unit apps/pomo/src/.bug-hunt/playback-persistence-pre-restore-seek.spec.ts
```

```
FAIL  should not overwrite a user seek that happens before pending restore applies
AssertionError: expected "vi.fn()" to be called with arguments: [ { positionSeconds: 45, ... } ]
Received: { positionSeconds: 30, ... }
```

### Code locations (tip `652c34f3`)

- [`apps/pomo/src/features/focus-room-audio/use-focus-room-playback-persistence.ts`](apps/pomo/src/features/focus-room-audio/use-focus-room-playback-persistence.ts) — `persistPlayback` returns early when `pendingPosition` matches the current track (lines 53–63), so seek persistence is skipped; `applyPendingPosition` then writes the stale pending value (lines 100–126).
- [`apps/pomo/src/components/media-player/use-player-controller.ts`](apps/pomo/src/components/media-player/use-player-controller.ts) — `setPendingPosition` + deferred `restorePendingPlayback` → `applyPendingPosition` (lines 249–252, 173–206).

### Distinct from open issues

- Not playlist shrink / `currentIndex` OOR ([#1578](https://github.com/bichikim/web/issues/1578)).
- Not shuffle queue stale after shrink ([#1574](https://github.com/bichikim/web/issues/1574)).
- Not `MEDIA_ERR_ABORTED` during next-track prep ([#1537](https://github.com/bichikim/web/issues/1537), closed).
- Not playlist duplicate-ID write/read mismatch ([#1567](https://github.com/bichikim/web/issues/1567)).
- Existing persistence tests only cover seek **after** restore (`use-focus-room-playback-persistence.spec.ts` lines 143–158), not seek **before** restore.

---

## 2. Feed listen marks a dialogue as listened before playback actually starts

**Severity:** P1

### Wrong vs expected

- **Wrong:** `createFeedPlaybackController` wires `onDialogueStart: markListened`, and entry playback invokes `onDialogueStart` before `audio.play()` succeeds. When autoplay is blocked or playback fails (`NotAllowedError`, missing audio, etc.), the feed item is still persisted as listened and drops out of `unlistenedDialogues()` even though the user never heard it.
- **Expected:** Listen state should commit only after playback actually begins (or revert when start fails).

### Repro steps

1. Have one unlistened feed dialogue in local state.
2. Mock `playDialogueSequence` to call `onDialogueStart(dialogueId)` and then return without successful playback (simulates autoplay block / failed start).
3. Call `listen(dialogueId)`.
4. Observe `repository.markListened` was called and `metadata.listenedAt` is set despite no audio playing.

### Test evidence

```bash
pnpm exec vitest run --project=unit apps/pomo/src/.bug-hunt/feed-playback-premature-listened.spec.ts
```

```
FAIL  should not mark a feed dialogue listened when playback fails after onDialogueStart
AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times
  1st call: ["blocked", "2026-08-14T00:00:00.000Z"]
```

### Code locations (tip `652c34f3`)

- [`apps/pomo/src/features/focus-room-feed/feed-playback.ts`](apps/pomo/src/features/focus-room-feed/feed-playback.ts) — `markListened` passed as `onDialogueStart` for `listen` / `listenAll` (lines 87–97, 117–122); `markDialoguesListened` persists `listenedAt` immediately (lines 35–59).
- [`apps/pomo/src/features/focus-room-dialogue/entry-playback-controller.ts`](apps/pomo/src/features/focus-room-dialogue/entry-playback-controller.ts) — `onDialogueStart` awaited before `start()` / `audio.play()` (lines 331–370); `start()` can return early on `NotAllowedError` without throwing (lines 262–265).

### Distinct from open issues

- Not orphan `feedItems` blocking resync ([#1573](https://github.com/bichikim/web/issues/1573)).
- Not null generation settings infinite retry ([#1584](https://github.com/bichikim/web/issues/1584)).
- Not unavailable-audio recovery path (existing tests in `use-focus-room-feeds-playback.spec.ts` lines 414–450 correctly skip `markListened` for `onDialogueUnavailable`, not for failed/blocked **start**).
- Not entry greeting cancelled with no retry ([#1547](https://github.com/bichikim/web/issues/1547)) — that is session entry greeting, not feed listen bookkeeping.

---

## Repro tests (kept locally)

| Test | Path |
|------|------|
| Pre-restore seek clobber | [`apps/pomo/src/.bug-hunt/playback-persistence-pre-restore-seek.spec.ts`](apps/pomo/src/.bug-hunt/playback-persistence-pre-restore-seek.spec.ts) |
| Premature feed listened | [`apps/pomo/src/.bug-hunt/feed-playback-premature-listened.spec.ts`](apps/pomo/src/.bug-hunt/feed-playback-premature-listened.spec.ts) |

Run all: `pnpm exec vitest run --project=unit apps/pomo/src/.bug-hunt/`

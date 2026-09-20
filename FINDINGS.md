# Bug hunt findings — 2026-09-20 16:45 KST routine

Tip SHA: `91f7c7f26fd1c360b81477561a405923e0ea36fb` (unchanged since 15:48 hunt)

Confirmed: **2** new bugs (repro tests under `apps/pomo/src/.bug-hunt/`). No GitHub issues opened.

---

## 1. Feature requests: voting after `loadMore` drops previously loaded pages

**Severity:** P2

### Wrong vs expected

- **Wrong:** After the user loads additional pages with `loadMore`, voting on any request calls `refresh()`, which replaces the in-memory list with only the first API page (~20 rows). Rows from later pages disappear from the UI even though they were already fetched.
- **Expected:** Voting should update the voted row in place, or at minimum preserve every page the user already loaded.

### Repro steps

1. Open the feature-requests list with more than one page of results.
2. Scroll / tap “load more” until page 2 is appended (22+ items visible).
3. Vote on an item that appeared only on page 2.
4. Observe the list shrink back to the first page only.

### Test evidence

```bash
pnpm exec vitest run --project=unit apps/pomo/src/.bug-hunt/feature-request-vote-collapses-pagination.bug-repro.spec.ts
```

```
FAIL  should keep every loaded page after voting on a later page item
AssertionError: expected [ …(20) ] to have a length of 22 but got 20

 ❯ apps/pomo/src/.bug-hunt/feature-request-vote-collapses-pagination.bug-repro.spec.ts:57:29
     57|   expect(result.requests()).toHaveLength(22)
```

### Code locations (tip `91f7c7f`)

| File | Lines | Role |
|------|-------|------|
| [`apps/pomo/src/features/feature-requests/use-feature-requests.ts`](apps/pomo/src/features/feature-requests/use-feature-requests.ts) | 116–124 | `voteRequest` always calls `refresh()` after a successful vote |
| [`apps/pomo/src/features/feature-requests/use-feature-requests.ts`](apps/pomo/src/features/feature-requests/use-feature-requests.ts) | 38–54 | `refresh()` replaces `requests` with the first page only |
| [`apps/pomo/src/features/feature-requests/use-feature-requests.ts`](apps/pomo/src/features/feature-requests/use-feature-requests.ts) | 67–84 | `loadMore()` appends subsequent pages |

### Distinct from open issues

- Not #1655 / #1656 (prior hunt on same tip).
- Brief “feature-request pagination” guidance excludes the closed `loadMore`+`refresh` race (#1598 area); this is a **post-loadMore vote path** that still collapses accumulated pages.
- Unrelated to feed, pomodoro, language-learning, room-enter, settings reload/save, playlist shrink, or version-marker races (#1569).

---

## 2. Sound effects: first user gesture before catalog load is discarded

**Severity:** P3

### Wrong vs expected

- **Wrong:** `SoundEffectsProvider` ignores `pointerdown` / `keydown` while the effect catalog is still loading (`playbacks().size === 0`). After the catalog finishes loading, that first user gesture is not replayed; playback stays silent until the user interacts again.
- **Expected:** The first user activation should unlock autoplay once playbacks register, matching the provider test “retry global playback on the first user interaction” when the catalog is already ready.

### Repro steps

1. Mount the focus room with sound effects enabled while the catalog fetch is still in flight.
2. Click anywhere on the page (first user gesture).
3. Wait for the catalog to finish loading.
4. Sound effects remain stopped until a **second** click, even though the first click was intended to unlock audio.

### Test evidence

```bash
pnpm exec vitest run --project=unit apps/pomo/src/.bug-hunt/sound-effects-early-gesture-wasted.bug-repro.spec.tsx
```

```
FAIL  should unlock playback on the first user gesture even when the catalog is still loading
AssertionError: expected "vi.fn()" to be called once, but got 0 times

 ❯ apps/pomo/src/.bug-hunt/sound-effects-early-gesture-wasted.bug-repro.spec.tsx:70:29
     70|   expect(playback.activate).toHaveBeenCalledOnce()
```

### Code locations (tip `91f7c7f`)

| File | Lines | Role |
|------|-------|------|
| [`apps/pomo/src/features/sound-effects/SoundEffectsProvider.tsx`](apps/pomo/src/features/sound-effects/SoundEffectsProvider.tsx) | 94–102 | `handleUserActivation` returns early when `playbacks().size === 0` |
| [`apps/pomo/src/features/sound-effects/SoundEffectsProvider.tsx`](apps/pomo/src/features/sound-effects/SoundEffectsProvider.tsx) | 104–117 | Catalog loads asynchronously after listeners are attached |
| [`apps/pomo/src/features/sound-effects/SoundEffectsProvider.tsx`](apps/pomo/src/features/sound-effects/SoundEffectsProvider.tsx) | 76–83 | `activate()` is the unlock path that never runs for the early gesture |

### Distinct from open issues

- Less-mined **sound-effects** area per brief; no open issue covers provider-level gesture timing.
- Unrelated to volume-ducking save/reload (#1611/#1606), feed listen overlap (#1655), media playlist shrink (#1578/#1574), or version-marker concurrency (#1569).

---

## Areas checked without new confirmations

- Re-probed #1655 / #1656 edges: skipped per brief.
- Playlist duplicate write/read (#1567), viewed-release web race (#1569): already filed.
- Version-notice desktop-surface trigger hide: intentional per existing spec (`PVersionNotice.spec.tsx` “hide the desktop-surface trigger after opening”).
- Notification/push APIs: not present in `apps/pomo`.

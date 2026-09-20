# Bug hunt findings — tip `0769b6cce1974316aefcc15b5beab019a686a41a`

Scope: `apps/pomo` only · Priority 2 less-mined domains (wallpaper/background slideshow, admin-music draft lifecycle) · 2 confirmed bugs with failing repro tests under `apps/pomo/src/.bug-hunt/`.

---

## 1. Background slideshow freezes when transition presentation fails (returns null)

**Severity:** P2

**Summary:** When `showFrame()` finishes loading media but `renderer.present()` resolves to `false` (cancelled/failed transition), it returns `null`. [`Canvas.tsx`](apps/pomo/src/components/frame/Canvas.tsx) treats a resolved `null` as a silent no-op: it neither calls `playback.onReady()` nor `playback.onError()`. Playback stays `isLoaded === false`, the slide timer never starts, the slide is not marked failed, and the slideshow never advances. Throwing errors already route through `.catch` → `onError()` → `markFailed()` → advance; the `null` path is the gap.

**Expected:** Failed or cancelled transitions should mark the current slide failed (or otherwise recover) and advance to the next eligible item, same as thrown presentation errors.

**Repro (manual):**

1. Open focus-room frame/wallpaper mode with multiple photos.
2. Trigger a transition that loads successfully but fails/cancels at `present()` (e.g. rapid slide change aborting in-flight transition, or renderer returning `false` from `present`).
3. Observe slideshow stuck on loading state for the current slide; timer never fires; no retry overlay for that failure class.

**Test evidence:**

```bash
pnpm exec vitest run --project=unit apps/pomo/src/.bug-hunt/background-present-failure-freezes-slideshow.spec.tsx
```

```
FAIL … should mark the slide failed and advance instead of freezing playback
AssertionError: expected "vi.fn()" to be called with arguments: [ '11111111-1111-4111-8111-111111111111' ]
Number of calls: 0
```

Repro test: [`apps/pomo/src/.bug-hunt/background-present-failure-freezes-slideshow.spec.tsx`](apps/pomo/src/.bug-hunt/background-present-failure-freezes-slideshow.spec.tsx)

**Root-cause lines (tip SHA):**

- [`apps/pomo/src/components/frame/Canvas.tsx` L92–L99](https://github.com/bichikim/web/blob/0769b6cce1974316aefcc15b5beab019a686a41a/apps/pomo/src/components/frame/Canvas.tsx#L92-L99) — resolved `null` skips both `onReady()` and `onError()`
- [`apps/pomo/src/features/background/show-frame.ts` L65–L71](https://github.com/bichikim/web/blob/0769b6cce1974316aefcc15b5beab019a686a41a/apps/pomo/src/features/background/show-frame.ts#L65-L71) — `present === false` → `null`
- [`apps/pomo/src/features/background/use-playback.ts` L64–L66, L97–L102, L103–L108](https://github.com/bichikim/web/blob/0769b6cce1974316aefcc15b5beab019a686a41a/apps/pomo/src/features/background/use-playback.ts#L64-L108) — timer gated on `isLoaded`; `onError()` marks failed and indirectly advances

**Distinct from open issues:** Not text-mood (#1622), memory-assist (#1623), weather, feed listen/reload, pomodoro, dual-write prefs, session draft editor (#1607), or screen-saver. This is wallpaper/frame **slideshow stall on non-throwing transition failure**, a separate class from renderer init failure (covered in existing `Canvas.spec.tsx`).

---

## 2. Album draft: queued field persist overwrites newer cover metadata

**Severity:** P2

**Summary:** `createDraftPersistence()` snapshots `getDraftData()` **at enqueue time** and serializes writes through a promise chain. Cover add/replace/clear bypasses that queue via `persistPreparedCover()` / `removePreparedCoverDraft()`. If a field edit is queued while a slow earlier persist is pending, or a cover is saved while a queued field write still holds a stale snapshot, the later-running queued write persists **old** `coverDraftId` / `hasCoverFile` and clobbers the cover the user just selected.

**Expected:** The latest draft state (including cover) should win; field and cover persistence should share one serialized pipeline or re-read `getDraftData()` at execution time.

**Repro (manual):**

1. Open admin-music album draft form.
2. Edit a text field (translations, URL, etc.) so a field persist is queued.
3. Before that write completes, select a cover image (persists via the direct cover path).
4. When the earlier queued field persist finishes, reload the tab or inspect session draft — cover metadata reverts to empty even though the UI still shows the preview until reload.

**Test evidence:**

```bash
pnpm exec vitest run --project=unit apps/pomo/src/.bug-hunt/album-draft-queued-persist-reverts-cover.spec.tsx
```

```
FAIL … should not overwrite a persisted cover with a stale queued field snapshot
AssertionError: expected stored draft to keep coverDraftId/hasCoverFile
Received: coverDraftId: null, hasCoverFile: false
```

Repro test: [`apps/pomo/src/.bug-hunt/album-draft-queued-persist-reverts-cover.spec.tsx`](apps/pomo/src/.bug-hunt/album-draft-queued-persist-reverts-cover.spec.tsx)

**Root-cause lines (tip SHA):**

- [`apps/pomo/src/features/admin-music/use-album-draft.ts` L184–L198](https://github.com/bichikim/web/blob/0769b6cce1974316aefcc15b5beab019a686a41a/apps/pomo/src/features/admin-music/use-album-draft.ts#L184-L198) — draft captured at `persist()` enqueue
- [`apps/pomo/src/features/admin-music/use-album-draft.ts` L41–L63, L96–L127, L388–L446](https://github.com/bichikim/web/blob/0769b6cce1974316aefcc15b5beab019a686a41a/apps/pomo/src/features/admin-music/use-album-draft.ts#L41-L446) — field vs cover persistence split

**Distinct from open issues:** Not track-import dead-end (#1551 closed), playlist duplicate IDs (#1567), media-player shrink (#1578/#1574), focus-room dialogue session draft (#1607), memory-assist (#1623), or edited-flag/reload-as-save settings twins (#1606/#1611). This is **admin-music album draft cross-path persistence ordering**, not generic settings edited-flag misclassification.

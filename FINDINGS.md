# Bug hunt findings — 2026-09-21 (tip `1fef737716c5d5d08aff8d4df75f7aec743bb28f`)

Scope: `apps/pomo` only. Two confirmed behavioral bugs with failing repro tests under [`apps/pomo/src/.bug-hunt/`](apps/pomo/src/.bug-hunt/).

---

## 1. Memory assist: native bridge read wipes browser memos when Toss storage is empty

**Severity:** P1

**Summary:** When the Apps in Toss native storage bridge is active and native Toss storage returns `null`, `createMemoryMemoRepository.read()` writes an empty array to web storage and returns `[]`, discarding memos that exist only in browser `localStorage`. Peer storage layers (`playback-storage`, `playlist-storage`, `auto-start-storage`) keep or migrate web data in the same situation.

**Expected:** Return web memos and migrate them to native storage (mirror [`playback-storage.spec.ts`](apps/pomo/src/features/focus-room-audio/__tests__/playback-storage.spec.ts) “should keep browser playback when native storage is empty”).

**Actual:** Web memos are erased; UI shows no memos.

**Repro steps:**
1. Create memory memos while running as regular web (stored in `localStorage` under `pomo:memory-memos:v1`).
2. Open the same profile in Apps in Toss (native bridge available) with empty native storage.
3. Call `readMemoryMemos()` / load the memory-assist UI.
4. All browser memos disappear.

**Test evidence:**

```bash
cd apps/pomo && pnpm exec vitest run src/.bug-hunt/memory-memo-native-empty-wipes-web.spec.ts
```

```
FAIL  src/.bug-hunt/memory-memo-native-empty-wipes-web.spec.ts > should keep browser memos when native storage is empty on first read
AssertionError: expected [] to deeply equal [ { …(16) } ]
```

**Code (tip SHA permalinks):**
- [`apps/pomo/src/features/memory-assist/repository.ts#L44-L61`](https://github.com/bichikim/web/blob/1fef737716c5d5d08aff8d4df75f7aec743bb28f/apps/pomo/src/features/memory-assist/repository.ts#L44-L61) — empty native branch calls `writeWeb([])` instead of falling back to `readWeb()`.

**Distinct from open issues:** Not picture-diary unmount save ([#1748](https://github.com/bichikim/web/issues/1748)). Not delayed-end, feature-request pagination, or any item in the brief avoid-list. This is a native/web migration gap in the memory-memo repository only.

---

## 2. Focus-room dialogue editor: zero-byte Supertonic download progress becomes `NaN`

**Severity:** P2

**Summary:** `createDialogueModelSession` passes Supertonic `onProgress` byte counts directly to `getDownloadPercentage` without guarding `totalBytes === 0`. Supertonic can emit `{loadedBytes: 0, totalBytes: 0}` on download failure (see model-download controller tests). `getDownloadPercentage(0, 0)` is intentionally `NaN` (caller must guard). The dialogue editor then stores `progress: NaN` in preparing state, breaking progress UI math. `model-download/controller.ts` and `feed-runtime.ts` already use `totalBytes > 0 ? … : 0`.

**Expected:** Preparing progress stays a finite number (0 when total size is unknown/zero).

**Actual:** Progress becomes `NaN` after a zero-byte progress event.

**Repro steps:**
1. Open the focus-room dialogue editor and trigger model `prepare()`.
2. Supertonic `initialize` reports `onProgress({fileName: 'vocoder.onnx', loadedBytes: 0, totalBytes: 0})` then fails (e.g. HTTP 503).
3. Editor preparing state shows `progress: NaN`.

**Test evidence:**

```bash
cd apps/pomo && pnpm exec vitest run src/.bug-hunt/dialogue-model-session-zero-byte-progress.spec.ts
```

```
FAIL  src/.bug-hunt/dialogue-model-session-zero-byte-progress.spec.ts > should not set NaN progress when supertonic reports zero-byte download progress
AssertionError: expected NaN to be +0 // Object.is equality
```

**Code (tip SHA permalinks):**
- [`apps/pomo/src/features/focus-room-dialogue/use-focus-room-dialogue-editor/model-session.ts#L27-L28`](https://github.com/bichikim/web/blob/1fef737716c5d5d08aff8d4df75f7aec743bb28f/apps/pomo/src/features/focus-room-dialogue/use-focus-room-dialogue-editor/model-session.ts#L27-L28) — unguarded `getProgress` helper.
- [`apps/pomo/src/features/focus-room-dialogue/use-focus-room-dialogue-editor/model-session.ts#L67-L73`](https://github.com/bichikim/web/blob/1fef737716c5d5d08aff8d4df75f7aec743bb28f/apps/pomo/src/features/focus-room-dialogue/use-focus-room-dialogue-editor/model-session.ts#L67-L73) — `onProgress` writes `NaN` into editor state.
- Contrast (correct guard): [`apps/pomo/src/features/model-download/controller.ts#L137-L138`](https://github.com/bichikim/web/blob/1fef737716c5d5d08aff8d4df75f7aec743bb28f/apps/pomo/src/features/model-download/controller.ts#L137-L138).
- Same unguarded pattern (not separately tested here): [`apps/pomo/src/features/chat-voice/index.ts#L234`](https://github.com/bichikim/web/blob/1fef737716c5d5d08aff8d4df75f7aec743bb28f/apps/pomo/src/features/chat-voice/index.ts#L234).

**Distinct from open issues:** Not Supertonic concurrent `initialize()` hang ([#1733](https://github.com/bichikim/web/issues/1733)), STT shared `preparePromise` ([#1734](https://github.com/bichikim/web/issues/1734)), or feed `prepareModel` loop ([#1735](https://github.com/bichikim/web/issues/1735)). This is a missing zero-byte guard in the dialogue editor model session (and chat-voice), unrelated to delayed-end or feature-request pagination ([#1760](https://github.com/bichikim/web/issues/1760)/[#1759](https://github.com/bichikim/web/issues/1759)).

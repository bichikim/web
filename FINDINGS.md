# Pomo bug hunt findings — tip `0769b6cce1974316aefcc15b5beab019a686a41a`

Hunt date: 2026-09-20. Scope: `apps/pomo` only. Repro tests live under [`apps/pomo/src/.bug-hunt/`](apps/pomo/src/.bug-hunt/).

Confirmed **2** new bugs (cap reached). No GitHub issues or PRs opened per brief.

---

## 1. Entry greeting marks session played when dialogue is unavailable

**Severity:** P2

### Wrong vs expected

- **Wrong:** When the bound entry dialogue (or its audio) is missing, `createEntryPlaybackController.playSequence` resolves `'ended'` after skipping unavailable items. `createEntryEventPlayback` treats any non-`'failed'` completion as success and writes `pomo:focus-room-entry-playback:v1`, so later `tryPlay()` calls in the same session are suppressed even if the dialogue becomes available.
- **Expected:** Unavailable entry dialogue should behave like a failed playback attempt: do **not** persist the session marker; allow automatic retry when bindings/assets become ready (same retry policy already used for `'failed'` completions).

### Repro steps

1. Bind a `room-enter` dialogue id that does not exist in the repository (or has no audio).
2. Enter the focus room with entry playback enabled.
3. Observe `playSequence` completes with `'ended'` and session storage is set.
4. Add/fix the dialogue and call `tryPlay()` again in the same browser session.
5. Entry playback does not run.

### Test evidence

```bash
pnpm exec vitest run --project=unit apps/pomo/src/.bug-hunt/entry-playback-missing-dialogue.spec.ts
```

Fail excerpt:

```
FAIL  entry-playback-missing-dialogue.spec.ts > … > should allow retry after unavailable entry dialogue resolves as ended
AssertionError: expected 'true' to be null
 ❯ apps/pomo/src/.bug-hunt/entry-playback-missing-dialogue.spec.ts:60:57
```

### Code locations (tip `0769b6cc`)

| File                                                                                                                                                                                                 | Lines            | Role                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------- |
| [`apps/pomo/src/features/focus-room-dialogue/use-p-event-controller/entry-playback.ts`](apps/pomo/src/features/focus-room-dialogue/use-p-event-controller/entry-playback.ts)                         | 112–118          | Writes session for every completion except `'failed'`                                           |
| [`apps/pomo/src/features/focus-room-dialogue/entry-playback-controller.ts`](apps/pomo/src/features/focus-room-dialogue/entry-playback-controller.ts)                                                 | 342–348, 416–420 | Missing dialogue/audio resolves item as `'missing'`, advances queue, sequence ends as `'ended'` |
| [`apps/pomo/src/features/focus-room-dialogue/__tests__/entry-playback-controller-playback.spec.ts`](apps/pomo/src/features/focus-room-dialogue/__tests__/entry-playback-controller-playback.spec.ts) | 135–150          | Existing proof that missing dialogue/audio returns `'ended'`                                    |

### Distinct from open issues

- **#1547** (entry greeting cancelled → no retry): covers user-cancelled greeting, not missing assets resolving as `'ended'`.
- **#1609** (room-enter `onEvent` failure skips retry): covers bound **action** execution failure, not dialogue/audio availability.
- **#1613 / #1612**: language-learning editor / pronunciation — unrelated domain.

---

## 2. Scene preferences stop reading native storage after one write failure

**Severity:** P2

### Wrong vs expected

- **Wrong:** In Apps-in-Toss mode, a single failed `writeToss` sets `nativeWriteFailed = true`. All subsequent `read()` calls skip native storage and return the web copy only, even after native storage recovers with newer preferences.
- **Expected:** After a transient native write failure, `read()` should continue to prefer native storage (or at least retry native reads) so recovered native data is not ignored for the rest of the page lifetime.

### Repro steps

1. Run in Toss storage mode (`usesTossStorage() === true`).
2. `read()` successfully loads preferences from native and mirrors them to web.
3. `write()` fails on native (transient error) but succeeds on web.
4. Native storage later holds updated preferences (e.g. from another device or a recovered write).
5. `read()` returns stale web preferences; `readToss` is never consulted again until a successful native write clears the flag.

### Test evidence

```bash
pnpm exec vitest run --project=unit apps/pomo/src/.bug-hunt/scene-preferences-native-read-bypass.spec.ts
```

Fail excerpt:

```
FAIL  scene-preferences-native-read-bypass.spec.ts > … > should read recovered native preferences after a transient native write failure
AssertionError: expected { activity: 'reading', … } to deeply equal { activity: 'writing', … }
 ❯ apps/pomo/src/.bug-hunt/scene-preferences-native-read-bypass.spec.ts:40:36
```

### Code locations (tip `0769b6cc`)

| File                                                                                                                                                                                           | Lines     | Role                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------- |
| [`apps/pomo/src/features/focus-room-scene-preferences/create-p-scene-preferences-repository.ts`](apps/pomo/src/features/focus-room-scene-preferences/create-p-scene-preferences-repository.ts) | 37, 45–46 | `nativeWriteFailed` makes `read()` bypass native                              |
| Same file                                                                                                                                                                                      | 62–72     | Failed `writeToss` sets `nativeWriteFailed`; only cleared on successful write |

### Distinct from open issues

- **#1556** (native write fail → reload overwrites web recovery): covers reload **overwriting** web recovery after write failure, not permanent **read** bypass of native.
- **#1561 / #1579 / #1558 / #1544**: other preference dual-write surfaces (versioned prefs, display theme, generic stale-native-after-web-recovery) — different repositories and failure modes.
- **#1599 / #1611 / #1606**: screen-saver / settings edited-flag misclassification — unrelated.

---

## Areas checked without new confirmed bugs

- Feature-request pagination reset after vote (`use-feature-requests.ts`) — intentional per existing spec (`should refresh after creating and voting`).
- Text-mood analyze-without-prepare progress — worker `loading` events update UI via shared `onProgress` callback.
- Memory-memo draft recall-mode coercion on read — covered by existing `draft-storage.spec.ts` contract.

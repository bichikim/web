# Bug hunt findings — 2026-09-20 (tip `a8bfb56`)

Scope: `apps/pomo` only. Tip SHA unchanged since prior hunt (#1733, #1734). Two NEW confirmed bugs below (cap 2).

---

## 1. Feed generation prep spins forever when `modelId` keeps changing

**Severity:** P1

### Summary

`prepareFeedGeneration` re-reads generation settings after each `prepareModel` call and loops while `latestSettings.modelId !== settings.modelId`. If settings keep alternating between two model IDs (rapid user edits, flaky resolver, or storage race), the `while` loop never reaches `status: 'ready'` and keeps calling `prepareModel` indefinitely. The feed job stays in `generating` with no terminal outcome.

### Expected

Preparation should converge or fail with a bounded retry/abort path (e.g. iteration cap, debounce, or “settings changed during prep” terminal status).

### Actual

Unbounded loop; each oscillation triggers another full model prepare.

### Repro

1. Queue a feed dialogue job.
2. Mock or drive `resolveGenerationSettings` so `modelId` alternates `'int8'` ↔ `'full'` on every read after prepare.
3. Call `prepareFeedGeneration`.
4. Observe repeated `prepareModel` calls and no `ready` / `model-preparation-failed` / `connection-missing` return.

### Test evidence

```bash
pnpm exec vitest run --project=unit apps/pomo/src/.bug-hunt/feed-generation-model-oscillation.spec.ts --reporter=verbose
```

```
FAIL  apps/pomo/src/.bug-hunt/feed-generation-model-oscillation.spec.ts
Error: prepareFeedGeneration exceeded 8 model switches
 ❯ prepareFeedGeneration apps/pomo/src/features/focus-room-feed/generation-preparation.ts:76:42
```

Repro test: [`apps/pomo/src/.bug-hunt/feed-generation-model-oscillation.spec.ts`](apps/pomo/src/.bug-hunt/feed-generation-model-oscillation.spec.ts)

### Source (tip `a8bfb56`)

- Loop without bound: [`apps/pomo/src/features/focus-room-feed/generation-preparation.ts#L65-L94`](https://github.com/bichikim/web/blob/a8bfb56db60466e9fb5e29519529d53f0424a370/apps/pomo/src/features/focus-room-feed/generation-preparation.ts#L65-L94)
- Model switch branch: [`apps/pomo/src/features/focus-room-feed/generation-preparation.ts#L82-L93`](https://github.com/bichikim/web/blob/a8bfb56db60466e9fb5e29519529d53f0424a370/apps/pomo/src/features/focus-room-feed/generation-preparation.ts#L82-L93)

### Distinct from open issues

Not STT/Supertonic worker coalescing (#1734, #1733), image in-flight (#1732), album-translate (#1673), playlist restore (#1731), feature-request pagination (#1728), delayed-end playback (#1727), or pomodoro BroadcastChannel (#1585). Feed prep loop is a separate bounded-retry gap in `focus-room-feed/generation-preparation.ts`.

---

## 2. Dialogue volume ducking: settings UI updates before player gain applies

**Severity:** P2

### Summary

`useVolumeDucking` (settings panel) updates local `settings` immediately but persists to preference storage after a 300ms debounce. `usePlayerVolumeDucking` (media player) reads only `storedSettings()` from `usePreference`. Until debounced write completes and propagates, dialogue playback ducks using the **previous** persisted volume even though the settings UI already shows the new value.

Unmount flushes pending edits (`onCleanup`), but a user who changes volume and dialogue starts within 300ms while settings remain mounted hears the old duck level.

### Expected

Player ducking gain should match the volume shown in the settings UI as soon as the user edits it (or both should stay in sync).

### Actual

UI shows e.g. 10%; player applies 50% (last persisted default) until debounce + preference sync.

### Repro

1. Open dialogue volume ducking settings (hook mounted).
2. Drag volume to 10% (`changeVolume(10)`).
3. Before 300ms elapses, start dialogue playback (`isDialogueActive = true`).
4. Observe player `onGainChange(0.5)` instead of `0.1`.

### Test evidence

```bash
pnpm exec vitest run --project=unit apps/pomo/src/.bug-hunt/volume-ducking-settings-player-split.spec.ts --reporter=verbose
```

```
FAIL  apps/pomo/src/.bug-hunt/volume-ducking-settings-player-split.spec.ts
AssertionError: expected last "vi.fn()" call to have been called with [ 0.1 ]
Received: [ 0.5 ]
```

Repro test: [`apps/pomo/src/.bug-hunt/volume-ducking-settings-player-split.spec.ts`](apps/pomo/src/.bug-hunt/volume-ducking-settings-player-split.spec.ts)

### Source (tip `a8bfb56`)

- Immediate UI, debounced persist: [`apps/pomo/src/components/dialogue-settings/use-volume-ducking.ts#L103-L118`](https://github.com/bichikim/web/blob/a8bfb56db60466e9fb5e29519529d53f0424a370/apps/pomo/src/components/dialogue-settings/use-volume-ducking.ts#L103-L118)
- Player reads stored prefs only: [`apps/pomo/src/features/focus-room-dialogue/use-player-volume-ducking.ts#L24-L34`](https://github.com/bichikim/web/blob/a8bfb56db60466e9fb5e29519529d53f0424a370/apps/pomo/src/features/focus-room-dialogue/use-player-volume-ducking.ts#L24-L34)
- Gain resolver: [`apps/pomo/src/features/focus-room-dialogue/use-player-volume-ducking.ts#L17-L20`](https://github.com/bichikim/web/blob/a8bfb56db60466e9fb5e29519529d53f0424a370/apps/pomo/src/features/focus-room-dialogue/use-player-volume-ducking.ts#L17-L20)

### Distinct from open issues

Unrelated to playlist (#1731), workers (#1734/#1733/#1732/#1673), feature-request (#1728), delayed-end (#1727), pomodoro timer (#1585), or desktop display prefs (#1520). Existing `use-volume-ducking.spec.ts` / `use-player-volume-ducking.spec.ts` cover each hook in isolation; the split-brain between optimistic settings UI and player gain is untested until this repro.

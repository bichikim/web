# Bug hunt findings — tip `652c34f3e571e008e5e80993ad7bd05d2751a352` (2026-09-19)

Two NEW confirmed bugs in `apps/pomo`, each with a failing repro under `apps/pomo/src/.bug-hunt/`.

---

## 1. Display theme: stale web copy overwrites native preference after partial write — **P1**

### Wrong vs expected

**Wrong:** On Apps in Toss, when `localStorage` still holds an older theme but a new choice is written successfully to native storage while the web write fails, the repository resolves the write without invalidating the stale web copy. The next `read()` always prefers the web value and even repairs native storage back to that stale theme, undoing the user's selection.

**Expected:** Match the screen-saver repository pattern in [`apps/pomo/src/features/screen-saver/storage.ts`](apps/pomo/src/features/screen-saver/storage.ts) (lines 101–107): after a successful native write with a failed web write, remove/invalidate the stale web copy so native becomes authoritative.

### Repro steps

1. Run in Apps in Toss (or harness with `usesTossStorage: true`).
2. Seed web storage with `dark`; leave native empty.
3. Call `write('bright')` with web write mocked to throw; native write succeeds.
4. Call `read()`.

### Test evidence

```bash
pnpm exec vitest run --project=unit apps/pomo/src/.bug-hunt/display-theme-stale-web.spec.ts
```

```
FAIL  display-theme-stale-web.spec.ts
AssertionError: expected 'dark' to be 'bright' // Object.is equality

Expected: "bright"
Received: "dark"
```

### Source (tip `652c34f3`)

- [`apps/pomo/src/features/display-theme/storage.ts:59-71`](apps/pomo/src/features/display-theme/storage.ts#L59-L71) — `read()` prefers web and repairs native from stale web.
- [`apps/pomo/src/features/display-theme/storage.ts:86-102`](apps/pomo/src/features/display-theme/storage.ts#L86-L102) — `write()` ignores web write failure after native success (no `removeWeb` equivalent).

### Distinct from open issues

- **#1544 / #1556 / #1561** — versioned-preference race machinery (`create-versioned-preference-repository`); this is the hand-rolled display-theme repository missing web/native convergence on partial write failure.
- **#1545** — screen-saver loading delay; unrelated feature (screen-saver already implements the correct invalidation pattern this code lacks).

---

## 2. Controlled playlist shrink leaves out-of-range index and undefined current track — **P1**

### Wrong vs expected

**Wrong:** In controlled mode (`props.tracks` provided), when the parent replaces the track list with a shorter array while playback is at an index beyond the new length, `currentIndex` stays out of range, `currentTrack()` becomes `undefined`, and playback intent remains active. No clamping, stop, or rebind occurs.

**Expected:** When controlled tracks shrink past the active index, clamp the index to a valid track (or stop playback and clear state) so `currentTrack`, persistence, and the audio element stay consistent.

### Repro steps

1. Render `usePlayerController` in controlled mode with four tracks.
2. `selectChosenTrack(3)` and `onPlay()`.
3. Replace `tracks` prop with only the first two tracks.
4. Observe `currentIndex() === 3`, `currentTrack() === undefined`, `isPlaying() === true`.

### Test evidence

```bash
pnpm exec vitest run --project=unit apps/pomo/src/.bug-hunt/controlled-playlist-shrink.spec.tsx
```

```
FAIL  controlled-playlist-shrink.spec.tsx
AssertionError: expected 3 to be less than 2
 ❯ controlled-playlist-shrink.spec.tsx:86:37
```

### Source (tip `652c34f3`)

- [`apps/pomo/src/components/media-player/use-player-controller.ts:66`](apps/pomo/src/components/media-player/use-player-controller.ts#L66) — `currentTrack` indexes `tracks()[currentIndex()]` without bounds guard.
- [`apps/pomo/src/components/media-player/use-player-controller.ts:255-269`](apps/pomo/src/components/media-player/use-player-controller.ts#L255-L269) — controlled-track effect resumes only when `track !== null`; no handling when shrink leaves index invalid.

### Distinct from open issues

- **#1574** — shuffle queue head goes stale and **plays the wrong track** after shrink; this bug is index out-of-range with **undefined** `currentTrack` and no clamp/stop (shuffle not required).
- **#1567** — playlist duplicate track ID write/read mismatch; unrelated.
- **#1537** (closed) — `MEDIA_ERR_ABORTED` during next-track prep; unrelated transport error path.

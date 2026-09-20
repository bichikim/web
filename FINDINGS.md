# Bug hunt findings — tip `0769b6cce1974316aefcc15b5beab019a686a41a`

Hunt date: 2026-09-20. Scope: `apps/pomo` only. Cap: 2 confirmed bugs (both met).

Repro tests live under [`apps/pomo/src/.bug-hunt/`](apps/pomo/src/.bug-hunt/).

---

## 1. Feed reload overwrites in-memory `listenedAt` without merge

**Severity:** P2

### Wrong vs expected

**Wrong:** `reloadDialogues()` replaces the entire in-memory dialogue list with whatever `loadFeedDialogueList()` returns. When reload captures a stale metadata snapshot (for example, reload starts before a concurrent `markListened` persistence finishes, or generation completion triggers reload while playback is marking items), previously recorded `listenedAt` values in memory are wiped back to `null`. The UI then shows already-heard dialogues as unlistened and `listenAll` can replay them.

**Expected:** Reload should merge persisted or in-memory `listenedAt` values for dialogues that remain in the list, or defer reload until in-flight listen marks complete. At minimum, a reload must not regress `listenedAt` from a non-null in-memory value to `null`.

### Repro steps

1. Load feed dialogues and mark one as listened (`listenedAt` set in memory and IndexedDB).
2. Trigger `reloadDialogues()` while the reload loader still returns a stale snapshot where that dialogue’s metadata has `listenedAt: null` (happens when reload’s `listMetadata()` snapshot predates the mark, or when generation `onCompleted` reload races with playback marking).
3. Observe the dialogue’s `listenedAt` becomes `null` again in `feedState.dialogues()`.

### Test evidence

```bash
pnpm exec vitest run --project=unit apps/pomo/src/.bug-hunt/feed-reload-wipes-listened-at.spec.ts
```

Fail excerpt:

```
FAIL  apps/pomo/src/.bug-hunt/feed-reload-wipes-listened-at.spec.ts
  × should keep in-memory listenedAt when reload returns a stale metadata snapshot
AssertionError: expected null to be '2026-08-14T01:00:00.000Z'
```

### Code locations (tip blob links)

| Area | Path | Lines |
|------|------|-------|
| Full list replace on reload | [`apps/pomo/src/features/focus-room-feed/feed-state.ts`](https://github.com/bichikim/web/blob/0769b6cce1974316aefcc15b5beab019a686a41a/apps/pomo/src/features/focus-room-feed/feed-state.ts#L80-L85) | 80–85 |
| Reload after generation completes | [`apps/pomo/src/features/focus-room-feed/use-focus-room-feeds.ts`](https://github.com/bichikim/web/blob/0769b6cce1974316aefcc15b5beab019a686a41a/apps/pomo/src/features/focus-room-feed/use-focus-room-feeds.ts#L117-L122) | 117–122 |
| Reload after expired cleanup / delete | [`apps/pomo/src/features/focus-room-feed/feed-state.ts`](https://github.com/bichikim/web/blob/0769b6cce1974316aefcc15b5beab019a686a41a/apps/pomo/src/features/focus-room-feed/feed-state.ts#L116-L117) | 116–117, 143–144 |
| Listen mark writes DB then memory (race window) | [`apps/pomo/src/features/focus-room-feed/feed-playback.ts`](https://github.com/bichikim/web/blob/0769b6cce1974316aefcc15b5beab019a686a41a/apps/pomo/src/features/focus-room-feed/feed-playback.ts#L47-L58) | 47–58 |
| Loader snapshots metadata once | [`apps/pomo/src/features/focus-room-feed/feed-dialogue-lifecycle.ts`](https://github.com/bichikim/web/blob/0769b6cce1974316aefcc15b5beab019a686a41a/apps/pomo/src/features/focus-room-feed/feed-dialogue-lifecycle.ts#L52-L69) | 52–69 |

### Distinct from open issues

| Issue | Why distinct |
|-------|--------------|
| **#1608** (stop before start marks listened) | Playback callback marks before audio starts; this bug is reload overwriting persisted/heard state, not premature marking during single listen. |
| **#1618** (listen during listenAll) | Concurrent playback guard missing on `listen()`; unrelated to reload merge. |
| **#1587** (closed, listened before play) | Fixed pre-play mark timing; reload wipe is a separate state-sync regression. |
| **#1573** (orphan feedItems block resync) | Expired-item cleanup leaves orphan records blocking sync; not about `listenedAt` merge on reload. |

---

## 2. Recommended “today in history” feed omits viewer timezone → wrong calendar day

**Severity:** P2

### Wrong vs expected

**Wrong:** The in-app recommended subscription URL for “오늘 있었던 역사적 순간” is `/api/feeds/today-in-history/rss.xml` with no `timeZone` query parameter. The public feed registry defaults missing `timeZone` to `UTC`, so the provider queries historical moments for the **UTC calendar date**. Korean viewers (and anyone ahead of UTC) often see **yesterday’s** moments for the first ~9 hours of their local day, and the wrong day entirely near date boundaries.

**Expected:** The recommended URL should include the viewer’s IANA timezone (same pattern as dev feeds: `?timeZone=Asia%2FSeoul`), so “today” matches the user’s local calendar day.

### Repro steps

1. Fix clock to `2026-08-14T20:00:00.000Z` (August 15 05:00 KST).
2. Subscribe using the recommended URL built in feed settings (`new URL('/api/feeds/today-in-history/rss.xml', origin)` — no `timeZone`).
3. Server calls `listPublished` with `{ month: 8, day: 14 }` (UTC) instead of `{ month: 8, day: 15 }` (KST).

### Test evidence

```bash
pnpm exec vitest run --project=unit apps/pomo/src/.bug-hunt/today-in-history-missing-timezone.spec.ts
```

Fail excerpts:

```
× should serve the viewer-local calendar day through the recommended subscription URL
AssertionError: expected "vi.fn()" to be called with arguments: [ { day: 15, limit: 50, month: 8 } ]
Received: 1st call: { day: 14, limit: 50, month: 8 }

× should append the viewer timezone to the recommended feed subscription URL
AssertionError: expected null to be 'Asia/Seoul'
```

### Code locations (tip blob links)

| Area | Path | Lines |
|------|------|-------|
| Recommended path without timezone | [`apps/pomo/src/components/feed-settings/Content.tsx`](https://github.com/bichikim/web/blob/0769b6cce1974316aefcc15b5beab019a686a41a/apps/pomo/src/components/feed-settings/Content.tsx#L28-L35) | 28–35 |
| URL built from path only | [`apps/pomo/src/components/feed-settings/Content.tsx`](https://github.com/bichikim/web/blob/0769b6cce1974316aefcc15b5beab019a686a41a/apps/pomo/src/components/feed-settings/Content.tsx#L59-L63) | 59–63 |
| Server defaults to UTC | [`apps/pomo/src/server/feed-publisher/public-feed-registry.ts`](https://github.com/bichikim/web/blob/0769b6cce1974316aefcc15b5beab019a686a41a/apps/pomo/src/server/feed-publisher/public-feed-registry.ts#L6-L12) | 6–12 |
| Calendar date derived from timezone | [`apps/pomo/src/features/feed-publisher/historical-moments-provider.ts`](https://github.com/bichikim/web/blob/0769b6cce1974316aefcc15b5beab019a686a41a/apps/pomo/src/features/feed-publisher/historical-moments-provider.ts#L35-L40) | 35–40 |

### Distinct from open issues

| Issue | Why distinct |
|-------|--------------|
| **#1575** / **#1566** (calendar TZ) | Calendar month grid and natural-language query parsing in the calendar UI; not public RSS feed publisher date selection. |
| **#1598** / **#1619** / **#1605** (weather) | Weather scene/feed revalidation; unrelated historical-moments feed. |
| **#1618** / **#1608** / **#1573** (feed dialogue sync) | In-app generated dialogue listen/sync; not public historical-moments RSS subscription URL. |

---

## Not confirmed / skipped

- **Version notice dismiss on failed `writeViewedRelease`:** Existing product test [`PVersionNotice.spec.tsx`](apps/pomo/src/components/p-version-notice/__tests__/PVersionNotice.spec.tsx) intentionally expects the gift trigger to stay hidden after a failed persist (“should remain dismissed when persisting the viewed marker fails”). Treated as documented behavior, not a new bug.
- **Priority 0 leftover:** Confirmed as bug #1 above.

# Bug hunt findings — 2026-09-21 (tip `a8bfb56db60466e9fb5e29519529d53f0424a370`)

Hunt scope: `apps/pomo` only. Repro tests live under `apps/pomo/src/.bug-hunt/`. No GitHub issues or PRs opened.

## Confirmed bugs (2)

### 1. Supertonic client drops the first concurrent `initialize()` promise

**Severity:** P1

**Summary:** `createSupertonicClient().initialize()` stores only one `initializeResolve` callback. A second `initialize()` before `ready` overwrites that slot. When `ready` arrives, only the latest caller resolves; the first caller's promise never settles.

**Expected:** Every `initialize()` caller should resolve or reject (same contract as `generate()`, which returns `generation-busy` for concurrent work).

**Repro steps:**
1. Create one Supertonic client.
2. Call `initialize({ modelId: 'int8' })` and do not await yet.
3. Call `initialize({ modelId: 'full' })`.
4. Emit a single worker `{ type: 'ready' }` message.
5. Observe the first promise remains pending after the second resolves.

**Test evidence:**

```bash
pnpm exec vitest run apps/pomo/src/.bug-hunt/supertonic-concurrent-init.spec.ts
```

```
FAIL  supertonic concurrent initialize > should resolve every concurrent initialize caller when ready arrives
AssertionError: expected 'pending' to be 'resolved'
Expected: "resolved"
Received: "pending"
```

**Code locations (tip SHA):**
- [`apps/pomo/src/features/supertonic/client.ts:225-227`](/workspace/apps/pomo/src/features/supertonic/client.ts#L225-L227) — single `initializeResolve` consumed on `ready`
- [`apps/pomo/src/features/supertonic/client.ts:260-263`](/workspace/apps/pomo/src/features/supertonic/client.ts#L260-L263) — later `initialize()` overwrites `initializeResolve`

**Distinct from open issues:** Not image-generation worker (#1732), album translation (#1673), or sound-generation worker (closed #1695). This is the **Supertonic TTS client** init path; `generate()` already guards concurrency (`generation-busy` at lines 279–287) but `initialize()` does not.

---

### 2. Speech-to-text worker shares in-flight preparation across different `modelId` values

**Severity:** P2

**Summary:** `prepareModel()` uses one module-level `preparePromise` without tracking which `modelId` started it. If a second `prepare` or `transcribe` arrives for a different model while the first model is still loading, the second request awaits the first model's load and proceeds with the wrong transcriber weights.

**Expected:** Each distinct `modelId` should either get its own preparation pipeline or reject/busy until the in-flight model matches.

**Repro steps:**
1. In the speech worker, start `prepare` for `whisper-base` while `pipeline()` is hung.
2. Before releasing the hang, dispatch `prepare` for `moonshine-tiny-ko`.
3. Release the pipeline hang once.
4. Both requests receive `ready`, but `pipeline()` was only invoked for `whisper-base`.

**Test evidence:**

```bash
pnpm exec vitest run apps/pomo/src/.bug-hunt/speech-worker-model-switch.spec.ts
```

```
FAIL  speech worker model switch during preparation > should load the requested model when a different model is prepared while one is in flight
AssertionError: expected [ 'onnx-community/whisper-base' ] to deeply equal [ 'onnx-community/whisper-base', 'onnx-community/moonshine-tiny-ko-ONNX' ]
```

**Code locations (tip SHA):**
- [`apps/pomo/src/features/speech-to-text/worker.ts:60-90`](/workspace/apps/pomo/src/features/speech-to-text/worker.ts#L60-L90) — `preparePromise` created once, not keyed by `modelId`
- [`apps/pomo/src/features/speech-to-text/worker.ts:105-117`](/workspace/apps/pomo/src/features/speech-to-text/worker.ts#L105-L117) — `transcribe` calls `prepareModel(request.preferredBackend, request.modelId)` and can inherit the wrong loaded model

**Distinct from open issues:** Unrelated to playlist restore (#1731), image worker (#1732), or delayed-end catch-up (#1727). Existing speech tests only cover **same-model** in-flight sharing (`worker.spec.ts` “should share an in-flight model preparation between requests”); cross-model overlap is untested and broken.

---

## Not confirmed / excluded

- Text model download worker concurrent `prepare`: attempted repro; mock setup unreliable in `.bug-hunt/` (dynamic import path). Production path is serialized by `createDownloadQueue` — not reported without a clean failing test.
- Memory reminders Supertonic model switch during in-flight prep: plausible race in `use-reminders.ts` `getClient`, but deliveries are serialized and no failing repro was produced this hunt.

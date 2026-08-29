# `@winter-love/vite-plugin-key-similarity`

[English](https://github.com/bichikim/web/blob/dev/packages/vite-plugin-key-similarity/README.md) · [한국어](https://github.com/bichikim/web/blob/dev/packages/vite-plugin-key-similarity/README.ko.md) · [日本語](https://github.com/bichikim/web/blob/dev/packages/vite-plugin-key-similarity/README.ja.md) · [简体中文](https://github.com/bichikim/web/blob/dev/packages/vite-plugin-key-similarity/README.zh-CN.md) · [繁體中文](https://github.com/bichikim/web/blob/dev/packages/vite-plugin-key-similarity/README.zh-TW.md)

A Vite plugin that finds semantically similar keys by comparing static strings from source code with a local embedding model. It works with any imported function that accepts string keys, including translation messages, analytics events, and permission names.

- Uses no network connection or external API.
- Includes a q8 `Xenova/multilingual-e5-small` model.
- Lets `keyDetector` decide which function call and argument contain the key.
- Compares modules loaded by Vite in an asynchronous Worker, keeping the transform path responsive.
- Reports similar keys and source locations without modifying code.

## 1. Getting started

Install the plugin as a development dependency.

```bash
npm install --save-dev @winter-love/vite-plugin-key-similarity
```

Add the plugin to the Vite configuration and provide a `keyDetector`. The following example configuration checks the first argument of `t()` imported from `./i18n`.

```ts
import {defineConfig} from 'vite'
import {keySimilarity} from '@winter-love/vite-plugin-key-similarity'

export default defineConfig({
  plugins: [
    keySimilarity({
      keyDetector: ({imported, source}) =>
        source === './i18n' && imported === 't' ? 0 : undefined,
    }),
  ],
})
```

Run the development server or production build as usual.

```bash
npm run dev
npm run build
```

The default behavior is:

- Development server: report similar keys as warnings.
- Production build: fail the build when similar keys are found.
- Model and tokenizer: load automatically from the package `assets` directory. No environment variable or model path is required.

## 2. Selecting keys

### `keyDetector` return values

`keyDetector` receives import and call information and decides whether a call should be checked.

| Return value                | Meaning                                                                     |
| --------------------------- | --------------------------------------------------------------------------- |
| A number such as `0` or `1` | Select that argument index as an ungrouped key.                             |
| `{argumentIndex, group}`    | Select that argument index and compare it only with keys in the same group. |
| `undefined`                 | Ignore the call.                                                            |

Both direct and aliased named imports are supported.

```ts
import {t, t as translate} from './i18n'

t('Payment completed.')
translate('The payment was processed successfully.')
```

For both calls, `imported` is `t`. For the second call, `localName` is `translate`. Use the `source` condition to exclude a local function with the same name or a function imported from another module.

### Detection context

| Property    | Description                                           |
| ----------- | ----------------------------------------------------- |
| `arguments` | The `kind` and static string `value` of each argument |
| `filePath`  | Absolute path of the file containing the call         |
| `imported`  | Original imported name                                |
| `localName` | Name used in the current file                         |
| `position`  | Starting line and column of the call                  |
| `source`    | Import module specifier                               |

For example, the following detector checks the second argument of `emit(payload, key)` in the `analytics` group.

```ts
keySimilarity({
  keyDetector: ({arguments: args, filePath, imported, source}) => {
    if (filePath.endsWith('.story.tsx')) return undefined
    if (source !== '@/events' || imported !== 'emit') return undefined

    return args[1]?.kind !== 'dynamic' ? {argumentIndex: 1, group: 'analytics'} : undefined
  },
})
```

Return `1` instead of `{argumentIndex: 1, group: 'analytics'}` when grouping is unnecessary.

## 3. Supported strings

The extractor accepts the following static values.

```ts
t('single-quoted string')
t('double-quoted string')
t(`static template literal`)
```

`${email}` inside a regular string remains literal text.

```ts
t('Password reset email sent to ${email}.')
```

Simple identifiers and property access expressions inside template expressions are reconstructed as the same placeholder form.

```ts
t(`Password reset email sent to ${email}.`)
t(`Password reset email sent to ${user.profile.email}.`)
```

Expressions that require execution are not compared as static keys.

```ts
t(message)
t(`Hello, ${getName()}`)
t(`Hello, ${name ?? fallback}`)
```

Supported source extensions are TS, TSX, JS, JSX, MTS, and MJS. Named and aliased imports are supported. Object methods, namespace imports, and Vue or Svelte compiler ASTs are not supported.

## 4. Adding comparison text to a call

When a code-style key does not describe its meaning clearly enough, place `@key-similarity-with` immediately above the call. The comment text and the code literal become comparison representations of the same call.

```ts
/* @key-similarity-with Password reset email sent. */
t('password.reset.email.sent')
```

The diagnostic still reports the call location only once.

```text
src/password.ts:4:1  password.reset.email.sent  [compared as: password.reset.email.sent | Password reset email sent.]
```

### Adding multiple representations

Repeat `@key-similarity-with` to attach multiple representations to one call.

```ts
/* @key-similarity-with Password reset email sent. */
/* @key-similarity-with Password change instructions were emailed. */
t('password.reset.email.sent')
```

For two calls, the plugin evaluates every representation combination and keeps the highest-scoring combination that passes its threshold. Representations belonging to the same call are never compared with each other.

### Excluding the code literal

Combine `@key-similarity-ignore-literal` with `with` to compare only the annotated text and exclude the code literal.

```ts
/* @key-similarity-with Payment completed. */
/* @key-similarity-ignore-literal */
t('legacy.payment.completed')
```

Using `@key-similarity-ignore-literal` without `with` leaves no comparison representation, so the entire call is excluded from the check.

```ts
/* @key-similarity-ignore-literal */
t('key excluded from similarity checks')
```

Annotation comments must form a continuous block immediately above the call or its containing statement. A blank line between the comments and code prevents the annotation from binding to that call.

## 5. Adjusting the similarity threshold

The default `semanticThreshold` is `0.9`. A key pair is reported only when its score is greater than or equal to the threshold.

```ts
keySimilarity({
  keyDetector: ({imported, source}) => (source === './i18n' && imported === 't' ? 0 : undefined),
  semanticThreshold: 0.92,
})
```

Pass a function to select a threshold by key length or format. The resolver runs separately for the literal and every annotated representation.

```ts
keySimilarity({
  keyDetector: ({imported, source}) => (source === './i18n' && imported === 't' ? 0 : undefined),
  semanticThreshold: (key) => (key.length < 10 ? 0.95 : 0.9),
})
```

When two representations have different thresholds, the higher threshold is used. Raising the threshold reduces diagnostics; lowering it increases them. Calibrate the value with both pairs that should match and pairs that must remain separate in the actual project.

## 6. Reading diagnostics

Diagnostics use the following format.

```text
Similar key groups:
Group 1 (3 keys):
src/main.ts:6:3  Payment completed.
src/paraphrase.ts:3:35  The payment was processed successfully.
src/secondary.ts:3:33  Payment processing completed successfully.
group=ungrouped, semantic=0.9560–0.9843/0.9000
```

- `Group 1 (3 keys)`: three calls for which every pair is similar.
- `src/main.ts:6:3`: file, line, and column relative to the final Vite `root`.
- `group=ungrouped`: `keyDetector` returned a number without assigning a group.
- `semantic=0.9560–0.9843/0.9000`: score range for pairs in the group, followed by the applied threshold.

A transitive chain such as `A≈B`, `B≈C`, and `A≉C` is not merged into one group. Diagnostics preserve the relationship by emitting complete groups in which every pair is similar.

The plugin does not decide which key should be kept or removed. Review the reported locations and decide whether to consolidate the keys or keep them separate because of their context.

## 7. Diagnostic modes

| Option      | Default | Allowed values         | Behavior                                   |
| ----------- | ------- | ---------------------- | ------------------------------------------ |
| `serveMode` | `warn`  | `off`, `warn`          | Diagnostic mode for the development server |
| `buildMode` | `error` | `off`, `warn`, `error` | Diagnostic mode for production builds      |

Selecting `off` also prevents Worker and model initialization. Development mode does not support `error` because asynchronous comparison finishes after the transform that queued it.

When introducing the plugin to a project with existing duplicates, use `buildMode: 'warn'` while reviewing the initial results, then switch to `error` when the baseline is clean.

## 8. Options reference

| Option              | Default                                  | Description                                                  |
| ------------------- | ---------------------------------------- | ------------------------------------------------------------ |
| `keyDetector`       | Required                                 | Selects imported calls and the argument containing each key. |
| `semanticThreshold` | `0.9`                                    | A fixed number or a `(key) => number` threshold resolver     |
| `serveMode`         | `warn`                                   | Development server diagnostic mode                           |
| `buildMode`         | `error`                                  | Production build diagnostic mode                             |
| `exclude`           | Tests, generated files, and node_modules | Glob patterns excluded from Vite and CLI checks              |
| `scanInclude`       | `src/**/*.{ts,tsx,js,jsx,mts,mjs}`       | File globs used only by full-project CLI scans               |
| `cacheDir`          | `node_modules/.cache/key-similarity`     | Base directory for model and `vectors` caches                |
| `modelPath`         | Bundled model                            | Path to another local Transformers.js model                  |
| `modelIdentifier`   | Bundled model ID or `modelPath`          | Model identifier used to separate vector caches              |
| `modelRevision`     | Bundled revision or `local`              | Model revision used to separate vector caches                |
| `wasmPath`          | Automatically selected                   | Explicit path to ONNX WASM files                             |

There is no shared `include` option for Vite. Vite checks JavaScript and TypeScript modules in its module graph and applies only `exclude`. Use the CLI-only `scanInclude` option when a full-project scan is required.

## 9. Scanning the entire project with the CLI

To scan the project independently of a Vite build, create `key-similarity.config.mjs` in the project root.

```js
export default {
  keyDetector: ({imported, source}) => (source === './i18n' && imported === 't' ? 0 : undefined),
  scanInclude: ['src/**/*.{ts,tsx}'],
}
```

```bash
npx key-similarity check
npx key-similarity check --json
npx key-similarity benchmark
```

- `check`: prints scanned file, unique key, and diagnostic counts. Returns exit code `1` when diagnostics exist.
- `check --json`: prints locations, comparison representations, scores, and timing as JSON.
- `benchmark`: runs initial and warm analysis with the same model instance, then prints embedding time, cache size, and RSS memory as JSON.
- `--config path`: loads a configuration file other than the default `key-similarity.config.mjs`.

The CLI uses the current working directory as its root.

## 10. Model and cache

The default model and tokenizer are included in `assets/multilingual-e5-small`. Transformers.js remote model access is disabled, so no model is downloaded at runtime.

Vectors for normalized strings are stored in `node_modules/.cache/key-similarity/vectors` by default. A vector is reused when its model ID, revision, normalization version, and normalized string match. When selecting another local model, also set `modelIdentifier` and `modelRevision` so its vectors cannot be mixed with the previous model cache.

## 11. Execution model

Vite mode processes files in the following order.

1. Vite loads a file and passes it to `transform`.
2. The main thread immediately extracts keys and locations from the AST and adds them to a queue.
3. A separate Node Worker consumes the queue in order and performs embedding and comparison.
4. When a file changes or is deleted, previous pairs involving that file are removed.
5. At `buildEnd`, the build waits for the queue to drain and reports the accumulated result once.

Vite mode does not scan the source directory with a glob before building. It checks only files included in the current build or development server module graph.

## 12. Troubleshooting

### A similar sentence is not reported

Check the following in order.

1. Confirm that the file is imported into the current Vite module graph.
2. Confirm that `source` and `imported` exactly match the `keyDetector` conditions.
3. Confirm that the calls were not assigned to different groups.
4. Confirm that the selected argument is a supported static string.
5. Lower `semanticThreshold` slightly to inspect the actual score.

If a code-style key does not expose enough meaning, add human-readable text with `@key-similarity-with`.

### Too many unrelated sentences are reported

Raise `semanticThreshold`. If one value is unsuitable for every key, provide a `(key) => number` resolver. Use `keyDetector` groups for key categories that must never be compared.

### Development warns, but the production build fails

The defaults are `serveMode: 'warn'` and `buildMode: 'error'`. Set `buildMode: 'warn'` when production builds should report warnings without failing.

### Files outside the intended scope are checked

Add their globs to `exclude`. Because Vite has no plugin-wide `include` option, restrict calls with the `filePath`, `source`, and `imported` conditions in `keyDetector`.

## 13. Included examples

Run the examples from the package root. Every example uses the bundled local model.

```bash
npm run example:duplicate
npm run example:clean
npm run example:sentence-duplicate
npm run example:sentence-clean
```

- `example:duplicate`: reports `checkout.complete` and `checkout.completed`.
- `example:clean`: uses unrelated event keys and finishes without diagnostics.
- `example:sentence-duplicate`: reports payment messages, password reset messages, placeholders, and code-style keys connected through annotations. It also includes a similar sentence excluded with `@key-similarity-ignore-literal`.
- `example:sentence-clean`: uses unrelated translation messages and finishes without diagnostics.

# @winter-love/sw

Generate a service worker bundle (`sw.mjs`) with configurable caching and logging. The generator reads the SW template and injects the install file list plus optional runtime config.

## Install

```bash
pnpm add -D @winter-love/sw
```

## Vite usage

```ts
import {defineConfig} from 'vite'
import {generateSwWithCleanUp} from '@winter-love/sw'

const {pluginOptions} = generateSwWithCleanUp({
  assetsPattern: '_build/assets/**/*',
  cacheMaxEntries: 500,
  cacheMaxAgeSeconds: 60 * 60 * 24 * 7,
  logLevel: 'warn',
})

export default defineConfig({
  plugins: [pluginOptions],
})
```

## CLI usage

```bash
sw build <output-path>
```

Example:

```bash
sw build ./public/sw.js -r ./dist -a "**/*"
```

## GenerateSWOptions

| Option               | Type                                                              | Description                               |
| -------------------- | ----------------------------------------------------------------- | ----------------------------------------- |
| `assets`             | `string`                                                          | Glob for files to precache.               |
| `assetsRoot`         | `string`                                                          | Root directory for `assets`.              |
| `cacheName`          | `string`                                                          | Custom cache name.                        |
| `cacheVersion`       | `number`                                                          | Cache version for invalidation.           |
| `cacheStrategies`    | `Partial<Record<RequestDestination \| 'default', CacheStrategy>>` | Per-resource strategy overrides.          |
| `cachePriorities`    | `Partial<Record<RequestDestination \| 'default', number>>`        | Priority values used when trimming cache. |
| `cacheMaxEntries`    | `number`                                                          | Max number of cached entries.             |
| `cacheMaxAgeSeconds` | `number`                                                          | TTL in seconds for cached responses.      |
| `logLevel`           | `LogLevel`                                                        | Log level threshold.                      |
| `logEndpoint`        | `string`                                                          | Optional endpoint to POST logs.           |
| `logSampleRate`      | `number`                                                          | Sampling rate in `[0..1]`.                |
| `env`                | `'development' \| 'production'`                                   | Controls dev-mode logging behavior.       |
| `swTemplatePath`     | `string`                                                          | Path to custom `sw.mjs` template.         |
| `cwd`                | `string`                                                          | Working directory for file resolution.    |

## Environment variables

| Variable               | Description                                 |
| ---------------------- | ------------------------------------------- |
| `SW_CACHE_NAME`        | Cache name override.                        |
| `SW_CACHE_VERSION`     | Cache version override.                     |
| `SW_CACHE_MAX_ENTRIES` | Max cached entries.                         |
| `SW_CACHE_MAX_AGE`     | Cache TTL in seconds.                       |
| `SW_CACHE_STRATEGIES`  | JSON object for `cacheStrategies`.          |
| `SW_CACHE_PRIORITIES`  | JSON object for `cachePriorities`.          |
| `SW_LOG_LEVEL`         | Log level.                                  |
| `SW_LOG_ENDPOINT`      | Log endpoint URL.                           |
| `SW_LOG_SAMPLE_RATE`   | Log sample rate.                            |
| `SW_TEMPLATE_PATH`     | Template path override.                     |
| `NODE_ENV`             | Enables client log messages in development. |

Example `.env`:

```bash
SW_CACHE_NAME=winter-love
SW_CACHE_VERSION=2
SW_CACHE_MAX_ENTRIES=500
SW_CACHE_MAX_AGE=604800
SW_LOG_LEVEL=info
SW_LOG_SAMPLE_RATE=0.1
SW_CACHE_STRATEGIES={"image":"cache-first","font":"cache-first"}
```

## Caching strategies

Supported strategies:

- `network-first`
- `cache-first`
- `stale-while-revalidate`
- `network-only`

Default routing:

- `document`, `script`, `style`, `worker`, `manifest` → `network-first`
- `image`, `font` → `stale-while-revalidate`
- everything else → `cache-first`

## Logging

- Development mode (`env: 'development'` or `NODE_ENV=development`) posts `SW_LOG` messages to clients.
- `logEndpoint` sends JSON logs to your server.

## Client messages

- `SW_ACTIVATED`: emitted on activate with `{version}` payload.

## Examples

### Generate with runtime config

```ts
import {generateSW} from '@winter-love/sw'

await generateSW('./public/sw.js', {
  assets: '_build/assets/**/*',
  assetsRoot: './dist',
  cacheMaxEntries: 300,
  cacheMaxAgeSeconds: 60 * 60 * 24,
  logLevel: 'debug',
  cwd: process.cwd(),
})
```

### Override cache strategies

```ts
await generateSW('./public/sw.js', {
  assets: '_build/assets/**/*',
  assetsRoot: './dist',
  cacheStrategies: {
    image: 'cache-first',
    font: 'cache-first',
  },
  cwd: process.cwd(),
})
```

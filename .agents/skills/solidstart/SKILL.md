---
name: solidstart
description: Apply this repository's SolidStart conventions for routes, SSR and browser execution boundaries, client-only components, and server functions. Use when editing SolidStart routes or components, accessing browser-only APIs such as navigator, window, WebGPU, Worker, storage, canvas, or DOM globals, or creating Solid Router queries and actions.
---

# SolidStart

## Runtime Boundaries

1. Classify code before implementation: server-safe, browser-only, or shared/isomorphic.
2. Never derive SSR markup or initial reactive state from `window`, `document`, `navigator`, or `typeof ... !== 'undefined'`. Server output and the client's first hydration output must match.
3. Wrap an interactive browser-only subtree with `clientOnly` from `@solidjs/start`. Keep browser globals and browser-only imports behind its dynamic import; render a stable server fallback.
   The `clientOnly` call creates the runtime boundary; a `.client` filename suffix does not. Use a component name that describes its UI role instead.

```tsx
import {clientOnly} from '@solidjs/start'

const BrowserCanvas = clientOnly(() => import('./BrowserCanvas'), {lazy: true})
```

4. Keep SSR when only a capability check is browser-dependent: initialize a neutral `checking` state, then check inside `onMount`. Never render `unsupported` from the server.
5. Prefer `clientOnly` for WebGPU, Workers, browser ML runtimes, maps, or modules that access browser globals during import.
6. Do not use `NoHydration` as a client-only boundary for interactive UI; it deliberately leaves the server subtree unhydrated.
7. Do not disable SSR application-wide to solve one browser-only component.

## Runtime Verification

1. Verify direct navigation and client-side navigation separately.
2. Inspect server HTML only for the stable fallback; verify capabilities after hydration in the actual browser.
3. Do not infer browser capability from SSR HTML or an `unsupported` label. Confirm the client-side API and, when relevant, acquire the underlying resource such as a WebGPU adapter.

## Placement

Place Query and Action wrappers under `src/features`. Follow the `typescript-conventions` skill for feature module layout.
Place their server functions under `src/server/functions`, with `'use server'` as the first statement of each module. Never define an inline server function inside a Query or Action wrapper.

```ts
'use server'

export async function getSettings() {
  // Access server-only dependencies here.
}
```

```ts
import {query} from '@solidjs/router'
import {getSettings} from '~/server/functions/settings/get-settings'

export const getSettingsQuery = query(getSettings, 'settings')
```

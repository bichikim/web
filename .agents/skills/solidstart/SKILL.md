---
name: solidstart
description: Apply repository SolidStart conventions for routes, SSR/browser boundaries, client-only APIs, server functions, and Solid Router queries or actions.
---

# SolidStart

## Runtime Boundaries

1. Classify code before implementation: server-safe, browser-only, or shared/isomorphic.
2. When a standard global is available in every supported Node and browser runtime, use its unqualified or `globalThis` form instead of `window.*`, even in code currently rendered only on the client, to keep later runtime refactors cheap. Reserve `window` for browser-only APIs or semantics that specifically require the `Window` object.
3. Never derive SSR markup or initial reactive state from `window`, `document`, `navigator`, or `typeof ... !== 'undefined'`. Server output and the client's first hydration output must match.
4. Wrap an interactive browser-only subtree with `clientOnly` from `@solidjs/start`. Keep browser globals and browser-only imports behind its dynamic import; render a stable server fallback.
   The `clientOnly` call creates the runtime boundary; a `.client` filename suffix does not. Use a component name that describes its UI role instead.

```tsx
import {clientOnly} from '@solidjs/start'

const BrowserCanvas = clientOnly(() => import('./BrowserCanvas'), {lazy: true})
```

5. Keep SSR when only a capability check is browser-dependent: initialize a neutral `checking` state, then check inside `onMount`. Never render `unsupported` from the server.
6. Prefer `clientOnly` for WebGPU, Workers, browser ML runtimes, maps, or modules that access browser globals during import.
7. Do not use `NoHydration` as a client-only boundary for interactive UI; it deliberately leaves the server subtree unhydrated.
8. Do not disable SSR application-wide to solve one browser-only component.

## Runtime Verification

1. Verify direct navigation and client-side navigation separately.
2. Inspect server HTML only for the stable fallback; verify capabilities after hydration in the actual browser.
3. Do not infer browser capability from SSR HTML or an `unsupported` label. Confirm the client-side API and, when relevant, acquire the underlying resource such as a WebGPU adapter.

## Placement

Query and Action are client wrappers. They accept a function; they are not server functions themselves.

- An ordinary function passed to a Query or Action runs on the client.
- A separate `'use server'` function passed to a Query or Action is invoked remotely by the client wrapper.
- Do not convert an existing client function into a server function merely because it is wrapped in a Query or Action.

Place Query and Action wrappers under `src/features`. Follow the `typescript-conventions` skill for feature module layout. Only when a wrapper receives a server function, place that function under `src/server/functions`, with `'use server'` as the first statement of its module. Never define an inline server function inside a Query or Action wrapper.

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

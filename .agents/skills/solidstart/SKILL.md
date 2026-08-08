---
name: solidstart
description: Apply this repository's SolidStart conventions when creating or editing server functions, Solid Router queries, or actions. Enforce file-level `use server` and separate query/action wrappers from server implementations.
---

# SolidStart

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

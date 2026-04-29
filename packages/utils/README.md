# 🔩 Utils

SSR safe TypeScript utilities.

## Package layout

- One folder per utility under [`src/`](./src), named with **kebab-case** (for example `request-idle-callback`).
- Co-located tests live in `__tests__` next to each module.
- [`src/index.ts`](./src/index.ts) re-exports the public API; deeper modules such as [`path/`](./src/path) and [`promise/`](./src/promise) use local barrels.

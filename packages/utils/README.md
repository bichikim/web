# 🔩 Utils

TypeScript utilities grouped by responsibility and runtime.

## Package layout

- `core`: runtime-independent collections, functions, predicates, and types.
- `data`: object, path, and serialization utilities.
- `browser`: DOM, events, scheduling, scrolling, storage, and style utilities.
- `formatting`: CSS, number, and text conversion utilities.
- `domain`: cohesive domain algorithms such as spatial navigation.
- Co-located tests live in `__tests__` next to each module.
- [`src/index.ts`](./src/index.ts) keeps the root public API stable.

## Public API

All distributable modules are intentionally available through subpath exports. The module structure is part of the public surface.

## es-toolkit imports

Do not import from `es-toolkit/compat`. Use modern category subpaths such as `es-toolkit/array`, `es-toolkit/function`, `es-toolkit/predicate`, and `es-toolkit/string`. If no modern API exists, use a native platform API or a local implementation that preserves the package contract.

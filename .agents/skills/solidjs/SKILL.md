---
name: solidjs
description: Apply project conventions for Solid.js components, hooks, reactivity, and styling when editing Solid.js .tsx/.ts files.
---

# Solid.js

Open and apply the linked rule for the task. TypeScript naming, typing, formatting, and object-parameter conventions come from the typescript skill (also triggers on `.tsx` / `.ts`).

## Core Rules

1. Component files, structure, initial props, Solid naming, signal empty values, and `cx`/`cva`: See [references/component-authoring.md](references/component-authoring.md).
2. Design props optional-first. Split components by single responsibility so they can own defaults and degrade meaningfully with fewer caller requirements. Make a prop required only when the component cannot render or perform its sole meaningful function without it. See [references/props.md](references/props.md).
3. Separate non-trivial business logic from rendering: hooks/services return render-ready results; components render those results and emit events. Keep only obvious one-line presentation expressions inline; when separation seems awkward, design a view-model/result contract instead of abandoning the boundary.
4. DOM ownership: bind reactive values in JSX; use refs only for imperative capabilities and events. Via context, expose consumer needs, not raw nodes. Use `on*` only for event callbacks, not readonly accessors. See [references/dom-interaction.md](references/dom-interaction.md).
5. Built-in control flow (`Show` / `Switch` / `Match` / `For` / `Index`); Suspense + ErrorBoundary for async/errors. See [references/rendering.md](references/rendering.md).
6. Props: never destructure; `splitProps` only when needed. Effects: `onCleanup` inside `createEffect`. Hooks: do not track user callbacks — track config inputs; read signals at callback time. See [references/reactivity.md](references/reactivity.md).
7. Current SolidJS docs: context7 MCP first.
8. In SolidStart, apply the `solidstart` skill before accessing browser globals. Do not initialize reactive state from environment-dependent globals outside a `clientOnly` or `onMount` boundary.

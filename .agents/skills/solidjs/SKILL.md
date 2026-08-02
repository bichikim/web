---
name: solidjs
description: Applies project conventions for Solid.js components, custom hooks, reactivity, and styling. Use when writing or editing Solid.js .tsx/.ts files.
---

# Solid.js

Open and apply the linked rule for the task. TypeScript naming, typing, formatting, and object-parameter conventions come from the typescript skill (also triggers on `.tsx` / `.ts`).

## Core Rules

1. Component files: `PascalCase.tsx`, one public component matching the filename; stories `ComponentName.story.tsx`. See ./rules/file-naming-rules.md.
2. Structure, initial props, Solid naming, signal empty values, and `cx`/`cva`: See ./rules/component-basic-structure.md, ./rules/component-initial-prop.md, ./rules/component-variable-name.md, ./rules/component-signal-empty-value.md, and ./rules/component-class-cx.md.
3. DOM refs: `createSignal` + `ref={setElement}`; via context, expose consumer needs not raw nodes. See ./rules/dom-ref.md and ./rules/context-dom-exposure.md.
4. `on*` only for event callbacks, not readonly accessors. See ./rules/component-event-callback-naming.md.
5. Built-in control flow (`Show` / `Switch` / `Match` / `For` / `Index`); Suspense + ErrorBoundary for async/errors. See ./rules/component-control-flow.md and ./rules/component-suspense-error-boundary.md.
6. Props: never destructure; `splitProps` only when needed. Effects: `onCleanup` inside `createEffect`. Hooks: do not track user callbacks — track config inputs; read signals at callback time. See ./rules/reactivity-notes.md.
7. Current SolidJS docs: context7 MCP first.

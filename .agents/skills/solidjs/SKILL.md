---
name: solidjs
description: Applies project conventions for Solid.js components, custom hooks, reactivity, and styling. Use when writing or editing Solid.js .tsx/.ts files.
---

# Solid.js

Open and apply the linked rule for the task. TypeScript naming, typing, formatting, and object-parameter conventions come from the typescript skill (also triggers on `.tsx` / `.ts`).

## Core Rules

1. Component files: `PascalCase.tsx`, one public component matching the filename; stories `ComponentName.story.tsx`. See ./rules/file-naming-rules.md.
2. Structure, initial props, Solid naming, signal empty values, and `cx`/`cva`: See ./rules/component-basic-structure.md, ./rules/component-initial-prop.md, ./rules/component-variable-name.md, ./rules/component-signal-empty-value.md, and ./rules/component-class-cx.md.
3. Design props optional-first. Split components by single responsibility so they can own defaults and degrade meaningfully with fewer caller requirements. Make a prop required only when the component cannot render or perform its sole meaningful function without it. See ./rules/component-prop-optionality.md.
4. Separate non-trivial business logic from rendering: hooks/services return render-ready results; components render those results and emit events. Keep only obvious one-line presentation expressions inline; when separation seems awkward, design a view-model/result contract instead of abandoning the boundary.
5. DOM ownership: bind reactive values in JSX; use refs only for imperative capabilities and events. Via context, expose consumer needs, not raw nodes. See ./rules/dom-ref.md and ./rules/context-dom-exposure.md.
6. `on*` only for event callbacks, not readonly accessors. See ./rules/component-event-callback-naming.md.
7. Built-in control flow (`Show` / `Switch` / `Match` / `For` / `Index`); Suspense + ErrorBoundary for async/errors. See ./rules/component-control-flow.md and ./rules/component-suspense-error-boundary.md.
8. Props: never destructure; `splitProps` only when needed. Effects: `onCleanup` inside `createEffect`. Hooks: do not track user callbacks — track config inputs; read signals at callback time. See ./rules/reactivity-notes.md.
9. Current SolidJS docs: context7 MCP first.
10. In SolidStart, apply the `solidstart` skill before accessing browser globals. Do not initialize reactive state from environment-dependent globals outside a `clientOnly` or `onMount` boundary.

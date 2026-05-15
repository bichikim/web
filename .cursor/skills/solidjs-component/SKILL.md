---
name: solidjs-component
description: Applies project conventions for Solid.js component structure, naming, state, and styling. Use when writing or editing .tsx component files.
---

# Solidjs Component

Open and apply the reference files for the relevant section before working.

## Core Rules

1. Follow file naming, component structure, state structure, initial prop, variable naming, signal empty value, and `cx` class rules. See ./rules/file-naming-rules.md, ./rules/component-basic-structure.md, ./rules/component-state-structure.md, ./rules/component-initial-prop.md, ./rules/component-variable-name.md, ./rules/component-signal-empty-value.md, and ./rules/component-class-cx.md.
2. Use `createSignal` plus `ref={setElement}` for DOM handles and keep DOM refs inside the component. See ./rules/dom-ref.md.
3. Distinguish event callbacks from readonly accessors when naming `on*` props. See ./rules/component-event-callback-naming.md.
4. Use SolidJS built-in control-flow components from `solid-js`; preserve `<For>` vs `<Index>` based on list identity and update pattern. See ./rules/component-control-flow.md.
5. Use `<Suspense>` for async loading fallbacks and `<ErrorBoundary>` for recoverable render or resource failures. See ./rules/component-suspense-error-boundary.md.
6. Never destructure Solid props directly; use `splitProps` only when splitting is unavoidable. See ./rules/reactivity-notes.md.
7. Use `onCleanup` inside `createEffect`; do not return cleanup functions from the effect. See ./rules/reactivity-notes.md.
8. Use context7 MCP as the highest-priority reference source when current SolidJS documentation is needed.
9. See ./references/reference.md for official documentation links.

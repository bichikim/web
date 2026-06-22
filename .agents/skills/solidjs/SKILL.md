---
name: solidjs
description: Applies project conventions for Solid.js components, custom hooks, reactivity, and styling. Use when writing or editing Solid.js .tsx/.ts files.
---

# Solid.js

Open and apply the reference files for the relevant section before working.

## Core Rules

1. Solid component files must be `PascalCase.tsx`, contain one public component per file, and match the exported component name. Do not name component files after helper, adapter, wrapper, or implementation roles. Story files must be named `ComponentName.story.tsx`. See ./rules/file-naming-rules.md.
2. Follow component structure, state structure, initial prop, variable naming, signal empty value, and `cx` class rules. See ./rules/component-basic-structure.md, ./rules/component-state-structure.md, ./rules/component-initial-prop.md, ./rules/component-variable-name.md, ./rules/component-signal-empty-value.md, and ./rules/component-class-cx.md.
3. Use `createSignal` plus `ref={setElement}` for DOM handles and keep DOM refs inside the component. Through context, expose only the values consumers actually need (for example bounds for positioning), not raw DOM nodes. See ./rules/dom-ref.md and ./rules/context-dom-exposure.md.
4. Distinguish event callbacks from readonly accessors when naming `on*` props. See ./rules/component-event-callback-naming.md.
5. Use SolidJS built-in control-flow components from `solid-js`; preserve `<For>` vs `<Index>` based on list identity and update pattern. See ./rules/component-control-flow.md.
6. Use `<Suspense>` for async loading fallbacks and `<ErrorBoundary>` for recoverable render or resource failures. See ./rules/component-suspense-error-boundary.md.
7. Never destructure Solid props directly; use `splitProps` only when splitting is unavoidable. See ./rules/reactivity-notes.md.
8. Use `onCleanup` inside `createEffect`; do not return cleanup functions from the effect. See ./rules/reactivity-notes.md.
9. Do not track user callbacks in custom hooks (`createEffect`, `createMemo`, etc.). This is not React: the component body does not re-run on every update, and callback bodies should read signals/accessors at invocation time for latest values. Track reactive hook inputs (for example `wait`, `options`) instead. See ./rules/reactivity-notes.md.
10. Use context7 MCP as the highest-priority reference source when current SolidJS documentation is needed.
11. See ./references/reference.md for official documentation links.

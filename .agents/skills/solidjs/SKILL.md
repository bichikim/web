---
name: solidjs
description: Apply project conventions for Solid.js components, hooks, reactivity, and styling when editing Solid.js .tsx/.ts files.
---

# Solid.js

Open and apply the linked rule for the task. TypeScript naming, typing, formatting, and object-parameter conventions come from the typescript skill (also triggers on `.tsx` / `.ts`).

## Core Rules

1. Component files, structure, initial props, Solid naming, signal empty values, and `cx`/`cva`: See [references/component-authoring.md](references/component-authoring.md).
2. Design props optional-first. Split components by single responsibility so they can own defaults and degrade meaningfully with fewer caller requirements. Make a prop required only when the component cannot render or perform its sole meaningful function without it. See [references/props.md](references/props.md).
3. Separate non-trivial business logic from rendering: hooks/services return render-ready results; components render those results and emit events. Hooks implement state machines or state-driven follow-up work. Expose feedback as state; render notifications declaratively from that state rather than invoking imperative notification APIs in hooks or their callers. Hook operation methods drive state transitions; UI presentation belongs to components. Decide hook extraction by reuse potential using the TypeScript reuse workflow, not encapsulation alone. Hooks must encapsulate their internal state transitions and expose operations at their own abstraction level. Do not require callers to coordinate internal setters to perform an operation owned by the hook. Domain components may call those hooks directly and compose reusable UI. Do not add a component layer solely to forward props or fix presentation constants; require a substantive responsibility. Keep only obvious one-line presentation expressions inline; when separation seems awkward, design a view-model/result contract instead of abandoning the boundary.
4. DOM ownership: bind reactive values and DOM events in JSX; reserve refs for capabilities JSX cannot express. Via context, expose consumer needs, not raw nodes. Use `on*` only for event callbacks, not readonly accessors. See [references/dom-interaction.md](references/dom-interaction.md).
5. Built-in control flow (`Show` / `Switch` / `Match` / `For` / `Index`); Suspense + ErrorBoundary for async/errors. See [references/rendering.md](references/rendering.md).
6. Props: never destructure; `splitProps` only when needed. Derived values: prefer `createMemo` for simple, readable compositions. Before choosing the shape of complex derivations, apply the TypeScript function-decomposition workflow; prefer a plain accessor when the remaining logic is still a complex function composition, provided the required reactive behavior is preserved. Effects: `onCleanup` inside `createEffect`. Hooks: do not track user callbacks — track config inputs; read signals at callback time. See [references/reactivity.md](references/reactivity.md).
7. Current SolidJS docs: context7 MCP first.
8. In SolidStart, apply the `solidstart` skill before accessing browser globals. Do not initialize reactive state from environment-dependent globals outside a `clientOnly` or `onMount` boundary.

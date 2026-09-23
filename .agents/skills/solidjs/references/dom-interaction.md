# DOM and Interaction

## DOM refs

Use `createSignal` plus `ref={setElement}` for DOM handles. This matches the repository and satisfies Oxlint `no-unassigned-vars` through explicit assignment.

Keep refs inside the component and lift only the values and events the parent needs. Do not pass the DOM through a `ref` prop.

Return reactive state from hooks and bind it in JSX. Do not mirror signal state into DOM attributes or properties with `createEffect`, `setAttribute`, or direct assignment. Reserve refs for capabilities JSX cannot express.

## DOM events

Bind element events in JSX with `on*` by default. Use `on:event` only when a concrete requirement cannot be met with `on*`; establish that requirement before using it. Do not use `addEventListener` / `removeEventListener` for events JSX can bind. For shared state, Root provides handlers through context and the component that owns the element binds them in JSX. Do not collect elements through `connect` or refs merely to register listeners; an imperative-control ref does not justify manual event binding.

Compose shared handlers with caller-provided handlers without dropping either. Use manual listeners only for targets or integration requirements JSX cannot express, and pair registration with lifecycle cleanup.

## Context

Expose what consumers need, not the DOM handles used to produce it. Keep elements private in the owner:

1. Identify the consumer need.
2. Derive it inside the owner.
3. Expose plain data or actions. Do not put raw `HTMLElement` or ref accessors on context unless a consumer must mutate that exact node.

## Callback names

Use `on*` only for event-style callbacks the consumer calls. Do not use it for readonly reactive reads.

| Role                    | Naming                |
| ----------------------- | --------------------- |
| Cross-boundary callback | `on*`                 |
| Readonly reactive value | accessor without `on` |
| Internal handler        | `handle*`             |
| Framework DOM attribute | native DOM name       |

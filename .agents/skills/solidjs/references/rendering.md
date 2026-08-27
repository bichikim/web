# Rendering

## Control flow

Prefer Solid built-ins over ad-hoc `&&`, nested ternaries, or `.map()` for reactive branching and lists:

- `<Show>` for a condition and optional fallback.
- `<Switch>` / `<Match>` for exclusive branches.
- `<For>` when row identity is the item.
- `<Index>` when row identity is the position.

## Async and errors

- Wrap async or `createResource` UI in `<Suspense fallback={…}>`.
- Wrap recoverable render or resource failures in `<ErrorBoundary fallback={(error, reset) => …}>`.

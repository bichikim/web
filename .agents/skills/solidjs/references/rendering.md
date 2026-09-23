# Rendering

## Repeated UI

Declare items sharing a UI structure as data and render them through a shared component with Solid list control flow, rather than repeating component declarations. Express item-specific differences in that data as well. For roughly one to three items, use judgment to choose data-driven rendering or individual declarations based on clarity and reuse. Preserve reactive values as accessors when storing them in the item data.

## Control flow

Prefer Solid built-ins over ad-hoc `&&`, nested ternaries, or `.map()` for reactive branching and lists:

- `<Show>` for a condition and optional fallback.
- `<Switch>` / `<Match>` for exclusive branches.
- `<For>` when row identity is the item.
- `<Index>` when row identity is the position.

## Async and errors

- Wrap async or `createResource` UI in `<Suspense fallback={…}>`.
- Wrap recoverable render or resource failures in `<ErrorBoundary fallback={(error, reset) => …}>`.

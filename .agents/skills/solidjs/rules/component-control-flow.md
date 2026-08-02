# Control Flow

Prefer Solid built-ins from `solid-js` over ad-hoc `&&`, nested ternaries, or `.map()` for reactive branching / lists:

- `<Show>` — conditional (+ optional `fallback`)
- `<Switch>` / `<Match>` — exclusive branches
- `<For>` — row identity is the item (objects; insert/remove/reorder)
- `<Index>` — row identity is position (primitives; value may change at a stable index)

```tsx
// For — object list keyed by item
<For each={todos()}>{(todo, index) => <li>{todo.text} {index() + 1}</li>}</For>

// Index — primitive list keyed by position (child receives an accessor)
<Index each={todos()}>{(todo, index) => <li>{todo()} {index + 1}</li>}</Index>
```

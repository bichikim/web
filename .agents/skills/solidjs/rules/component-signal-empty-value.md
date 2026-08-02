# Optional / absent values in `createSignal`

Applies only to **`createSignal` state** — not every optional prop or API type.

Prefer **`null`** over **`undefined`** for an intentional empty signal value.

```tsx
// BAD
const [message, setMessage] = createSignal<string | undefined>(undefined)

// GOOD
const [message, setMessage] = createSignal<string | null>(null)
```

For conditional render, pass the getter to `<Show when={message}>` (not `message()`). If the child is a function, it receives the current value.

```tsx
<Show when={message}>{(msg) => <p>{msg}</p>}</Show>
```

When both empty string and “not present” are valid, use `string | null` and treat `''` as distinct from `null`.

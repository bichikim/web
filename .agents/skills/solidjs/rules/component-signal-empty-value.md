# Optional / absent values in `createSignal`

This rule applies only to **reactive state created with `createSignal`**. It does not mean you should use `null` everywhere for optional values in props, ordinary variables, API types, and other contexts.

When expressing “no value yet” or “empty” inside `createSignal`, prefer **`null`** over **`undefined`**.

- **`null`**: an intentional “nothing here” value (empty slot).
- **`undefined`**: closer to “not initialized” or “omitted property”; for a signal’s explicit “empty” state, **`null`** is more consistent.

```tsx
// BAD
const [message, setMessage] = createSignal<string | undefined>(undefined)

// GOOD
const [message, setMessage] = createSignal<string | null>(null)
```

For conditional rendering, Solid recommends the **`Show`** component. Pass the **signal getter `message`** to `when` (not `message()`) so it subscribes correctly; if the child is a function, it receives the current value so you do not need to call `message()` repeatedly.

```tsx
import {Show, createSignal} from 'solid-js'

export function OptionalMessageBanner() {
  const [message, setMessage] = createSignal<string | null>(null)

  return (
    <>
      <Show when={message}>{(msg) => <p>{msg}</p>}</Show>
    </>
  )
}
```

If you need both a string where **empty string is a valid state** and **“not present yet”**, model it as `string | null` and treat `''` as a separate meaning from `null`.

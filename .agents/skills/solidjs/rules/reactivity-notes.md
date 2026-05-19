# Solid Reactivity Notes

## Props

Implement proper code splitting but never split SolidJS props directly.

```tsx
interface Props {
  count: number
}

export function Counter(props: Props) {
  const {count} = props
  return <div>{count}</div>
}
```

Keep props reactive by reading from `props`.

```tsx
interface Props {
  count: number
}

export function Counter(props: Props) {
  return <div>{props.count}</div>
}
```

If splitting is unavoidable, use Solid's `splitProps`.

```tsx
import {splitProps} from 'solid-js'

interface Props {
  count: number
  class?: string
}

export function Counter(props: Props) {
  const [local, rest] = splitProps(props, ['count', 'class'])
  return (
    <div class={local.class} {...rest}>
      {local.count}
    </div>
  )
}
```

## createEffect Cleanup

In Solid, `createEffect` cleanup must use `onCleanup(() => ...)` inside the effect. Do not return a cleanup function.

```tsx
import {createEffect} from 'solid-js'

export function Example() {
  createEffect(() => {
    const id = window.setInterval(() => {}, 1000)
    return () => window.clearInterval(id)
  })

  return null
}
```

Use `onCleanup` inside the effect.

```tsx
import {createEffect, onCleanup} from 'solid-js'

export function Example() {
  createEffect(() => {
    const id = window.setInterval(() => {}, 1000)
    onCleanup(() => window.clearInterval(id))
  })

  return null
}
```

## Custom hook callbacks

Do not add the user's `callback` argument to `createEffect` (or similar) dependency tracking in custom hooks such as debounce, throttle, or timeout helpers.

Solid is not React: the owning component body does not re-execute on every reactive update, and a stable callback reference is normal. Latest values come from **reads inside the callback when it runs** (signals, accessors, stores), not from recreating the callback on each change.

Track reactive **hook configuration** instead (for example `wait`, `options` accessors).

```ts
// Good: callback reads latest query when the debounced fn fires
const debounced = useDebounce(() => {
  saveDraft(query())
}, 300)

// Avoid: capturing a non-reactive snapshot outside the callback
const id = route.params.id
useDebounce(() => fetch(id), 300) // `id` can stay stale; read reactively inside the callback
```

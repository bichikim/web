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

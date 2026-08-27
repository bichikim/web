# Solid Reactivity

## Props

Never destructure Solid props. Read from `props`, or use `splitProps` when splitting is unavoidable.

```tsx
const [local, rest] = splitProps(props, ['count', 'class'])
```

## Effect cleanup

Use `onCleanup` inside `createEffect`. Do not return a cleanup function.

```tsx
createEffect(() => {
  const id = window.setInterval(() => {}, 1000)
  onCleanup(() => window.clearInterval(id))
})
```

## Custom hook callbacks

Do not track a user's callback in `createEffect`, `createMemo`, or similar primitives inside custom hooks. Track reactive hook configuration such as `wait` or `options`; read signals inside the callback when it runs so it receives the latest values.

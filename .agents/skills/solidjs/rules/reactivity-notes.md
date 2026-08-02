# Solid Reactivity Notes

## Props

Never destructure Solid props. Read from `props` (or `splitProps` when splitting is unavoidable).

```tsx
// Bad — breaks reactivity
const {count} = props

// Good
props.count

// Good when splitting is needed
const [local, rest] = splitProps(props, ['count', 'class'])
```

## createEffect Cleanup

Use `onCleanup` inside the effect. Do not return a cleanup function.

```tsx
createEffect(() => {
  const id = window.setInterval(() => {}, 1000)
  onCleanup(() => window.clearInterval(id))
})
```

## Custom hook callbacks

Do not track the user's `callback` in `createEffect` / `createMemo` (or similar) inside custom hooks.

Solid is not React: the component body does not re-run on every update. Latest values come from **reads inside the callback when it runs**. Track reactive hook config (`wait`, `options`) instead.

```ts
// Good: callback reads latest query when the debounced fn fires
const debounced = useDebounce(() => {
  saveDraft(query())
}, 300)

// Avoid: non-reactive snapshot outside the callback
const id = route.params.id
useDebounce(() => fetch(id), 300)
```

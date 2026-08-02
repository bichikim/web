# Initial props with default values

Prefix one-shot defaults with `initial`. Read once with `untrack` so prop reactivity is not tracked into the signal.

```tsx
interface CounterProps {
  initialCount?: number
}

const Counter = (props: CounterProps) => {
  const initialCount = untrack(() => props.initialCount ?? 0)
  const [count, setCount] = createSignal(initialCount)

  return (
    <button type="button" onClick={() => setCount((value) => value + 1)}>
      {count()}
    </button>
  )
}
```

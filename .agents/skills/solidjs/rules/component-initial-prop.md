# Initial props with default values

Do not infer React's controlled/uncontrolled contract from the names `value`, `defaultValue`, `onInput`, or `onChange`. Treat values, native properties, and event callbacks independently unless the component explicitly defines a relationship.

Preserve `defaultValue` when it represents a native platform or existing API term. For a project component prop whose explicit meaning is “read once to seed local state,” prefer an `initial*` name for clarity. This is a project naming convention, not a Solid API requirement. Read the initial prop once with `untrack` so its reactivity is not tracked into the signal.

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

# Prop Optionality

Design component props optional-first. A missing prop should use an internal default, local state, read-only presentation, hidden optional capability, or another meaningful reduced behavior whenever possible.

## Required props

Make a prop required only when every reasonable fallback still leaves the component unable to render or perform its sole meaningful function. Before requiring it:

1. Split unrelated responsibilities into smaller components.
2. Consider internal state or a domain default.
3. Consider read-only or reduced behavior.
4. Hide or disable only the dependent optional capability.
5. Require the prop only if none of these preserves a meaningful component.

Do not require a prop merely to simplify implementation, mirror one current caller, pair a value with an event callback by convention, or catch an event the caller may not need.

When only one variant needs a value, require it in that variant's discriminated-union member instead of requiring it globally.

## State and callbacks

Solid components can own signals without React's rerender constraints. Prefer useful internal behavior with optional observation or intervention from the caller.

- Treat event props such as `onChange` and `onInput` as independent event callbacks, not mandatory companions to `value` or `defaultValue`.
- Keep event callbacks optional unless the component's sole purpose is impossible without that callback.
- Do not infer a controlled/uncontrolled mode solely from the presence of `value` or `defaultValue`; define only the behavior the component actually needs.
- For one-shot local-state initialization, prefer `initial*` props with `untrack` as a project naming convention. Preserve `defaultValue` when it is the native platform or existing API term. See ./component-initial-prop.md.
- Read optional callbacks at invocation time so the latest prop is used.

```tsx
interface CounterProps {
  initialCount?: number
  onCountChange?: (count: number) => void
}

const Counter = (props: CounterProps) => {
  const initialCount = untrack(() => props.initialCount ?? 0)
  const [count, setCount] = createSignal(initialCount)

  const increment = () => {
    const nextCount = count() + 1
    setCount(nextCount)
    props.onCountChange?.(nextCount)
  }

  return <button onClick={increment}>{count()}</button>
}
```

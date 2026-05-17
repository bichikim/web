# Initial props with default values

## Example

```tsx
import {createSignal, untrack} from 'solid-js'

interface CounterProps {
  // Initial props should use the "initial" prefix.
  initialCount?: number
}

const Counter = (props: CounterProps) => {
  // Explicitly avoid tracking props reactivity for the initial value.
  const initialCount = untrack(() => props.initialCount ?? 0)
  const [count, setCount] = createSignal(initialCount)

  const handleClick = () => {
    setCount((value) => value + 1)
  }

  return (
    <button type="button" onClick={handleClick}>
      {count()}
    </button>
  )
}
```

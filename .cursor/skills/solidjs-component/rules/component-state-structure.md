# Structure With createSignal State

```tsx
import {createSignal, type JSX} from 'solid-js'

export interface CounterButtonProps {
  children?: JSX.Element
}

export const CounterButton = (props: CounterButtonProps) => {
  const [count, setCount] = createSignal(0)
  const handleClick = () => setCount((value) => value + 1)

  return (
    <button type="button" onClick={handleClick}>
      {props.children} {count()}
    </button>
  )
}
```

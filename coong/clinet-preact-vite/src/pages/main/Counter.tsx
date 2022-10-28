import {signal, useComputed, useSignal} from '@preact/signals'
import {Number, Number2} from './Number'

const globalCountRef = signal(0)

const globalIncrement = () => {
  globalCountRef.value += 1
}

export const Counter = () => {
  const globalCount = globalCountRef.value
  const count = useSignal(0)
  const increment = () => {
    count.value += 1
  }
  const double = useComputed(() => count.value * 2)
  return (
    <div>
      <Number2 count={globalCount}>{count}</Number2>
      <Number count={globalCount}></Number>
      <span>{double}</span>
      <button onClick={increment}>Increment</button>
      <button onClick={globalIncrement}>Global Increment</button>
    </div>
  )
}

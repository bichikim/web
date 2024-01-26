import {createEffect, createSignal} from 'solid-js'
import {createStore} from 'solid-js/store'

const counter = () => {
  const [count, setCount] = createStore({value: 0})

  createEffect(() => {
    console.log(count.value)
  })

  return {count, setCount}
}

export default function Counter() {
  const {count, setCount} = counter()
  return (
    <button class="text-red" onClick={() => setCount('value', (value) => value + 1)}>
      Clicks: {count.value}
    </button>
  )
}

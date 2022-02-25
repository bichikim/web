import {ref, useSetup} from 'reactivue'

const Counter: FC = ({children}) => {
  return <div>{children}</div>
}
/**
 * it
 * @constructor
 */
export const Vue: FC = () => {
  const state = useSetup(() => {
    const count = ref(1)
    const count2 = ref(1)

    const onIncrease = () => (count.value += 1)
    const onIncrease2 = () => (count2.value += 1)

    return {count, count2, onIncrease, onIncrease2}
  })
  return (
    <div>
      <div>hello</div>
      <Counter>{state.count}</Counter>
      <Counter>{state.count2}</Counter>
      <button onClick={state.onIncrease}>increase</button>
      <button onClick={state.onIncrease2}>increase2</button>
    </div>
  )
}

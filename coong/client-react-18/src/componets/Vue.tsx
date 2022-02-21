import {ref, useSetup} from 'reactivue'

const Counter: FC = ({children}) => {
  return <div>{children}</div>
}

export const Vue: FC = () => {
  const {count, count2, onIncrease2, onIncrease} = useSetup(() => {
    const count = ref(1)
    const count2 = ref(1)

    const onIncrease = () => (count.value += 1)
    const onIncrease2 = () => (count2.value += 1)

    return {count, count2, onIncrease, onIncrease2}
  })
  return (
    <div>
      <div>hello</div>
      <Counter>{count}</Counter>
      <Counter>{count2}</Counter>
      <button onClick={onIncrease}>increase</button>
      <button onClick={onIncrease2}>increase2</button>
    </div>
  )
}

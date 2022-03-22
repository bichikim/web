import {useSetup, defineComponent} from 'reactivue'
import {ref, toRef} from '@vue/runtime-core'

const Counter: FC = defineComponent((props) => {
  const children = toRef(props, 'children')
  return {children}
},({children}) => {
  return <div>{children}</div>
})
/**
 * it
 * @constructor
 */
export const Vue: FC = defineComponent(() => {
  const count = ref(1)
  const count2 = ref(1)

  const onIncrease = () => (count.value += 1)
  const onIncrease2 = () => (count2.value += 1)

  return {count, count2, onIncrease, onIncrease2}
},
  (state) => {
  return (
    <div>
      <div>hello</div>
      <Counter>{state.count}</Counter>
      <Counter>{state.count2}</Counter>
      <button onClick={state.onIncrease}>increase</button>
      <button onClick={state.onIncrease2}>increase2</button>
    </div>
  )
})

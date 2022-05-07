/* eslint-disable no-magic-numbers */
import {Foo} from './_components/Foo'

const useState = () => {
  const age = ref(0)
  const increase = () => {
    age.value += 1
  }
  const decrease = () => {
    age.value -= 1
  }
  const set = (value: number) => {
    age.value = value
  }
  return reactive({
    age,
    decrease,
    increase,
    set,
  })
}

export const Test = defineComponent({
  setup: () => {
    const state = useState()

    return () => html`
      <div>
        <${Foo}>there<//>
        <div>${state.age}</div>
        <button onClick=${state.increase}>increase</button>
        <button onClick=${state.decrease}>decrease</button>
        <button onClick=${() => state.set(5)}>set</button>
      </div>
    `
  },
})

export default Test

import {defineComponent, h, ref} from 'vue'

const Count: any = defineComponent((_, {slots}) => {
  return () => {
    console.log('Counter')
    return h('div', slots.default?.())
  }
})

const Vue = defineComponent(() => {
  const count = ref(1)
  const count2 = ref(1)
  const parent = ref(1)

  const onIncrease = () => {
    count.value += 1
  }

  const onIncrease2 = () => {
    count2.value += 1
  }
  const onParentIncrease = () => {
    parent.value += 1
  }

  return () => {
    console.log('Vue')
    return (
      <div>
        <Count>{count.value}</Count>
        <Count>{count2.value}</Count>
        <Count>{parent.value}</Count>
        <button onClick={onIncrease}>increase</button>
        <button onClick={onIncrease2}>increase2</button>
        <button onClick={onParentIncrease}>parentIncrease</button>
      </div>
    )
  }
})

export default Vue


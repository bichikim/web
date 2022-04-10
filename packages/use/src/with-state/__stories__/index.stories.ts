import {FunctionalComponent, h, ref} from 'vue'
import {withState} from '../'

export const Default = () => {
  interface FunctionalComponentProps {
    age: number
  }

  // eslint-disable-next-line unicorn/consistent-function-scoping
  const FunctionalComponent: FunctionalComponent<FunctionalComponentProps, ['increase']> = (props, {emit}) => {
    return (
      h('div', {onClick: () => emit('increase')}, props.age)
    )
  }
  const Component = withState(FunctionalComponent, {
    setup: () => {
      const age = ref(1)
      const onIncrease = () => {
        age.value += 1
      }
      return {
        age,
        onIncrease,
      }
    },
  })
  return {
    setup() {
      return () => (
        h(Component)
      )
    },
  }
}

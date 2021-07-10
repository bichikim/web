import {animationRepeater} from '../'
import {h, ref} from 'vue-demi'

export const Default = () => ({
  setup() {

    const countRef = ref(0)
    const increaseCount = () => {
      countRef.value += 1
    }
    const toggleRef = animationRepeater(increaseCount)

    const toggleCount = () => {
      toggleRef.value = !toggleRef.value
    }

    return () => (
      h('div', [
        h('div', countRef.value),
        h('button', {onClick: toggleCount}, 'toggle count'),
      ])
    )
  },
})

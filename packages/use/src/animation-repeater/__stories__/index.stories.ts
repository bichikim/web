import {h, ref} from 'vue'
import {animationRepeater} from '../'

export default {
  title: 'use/animation-repeater',
}

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

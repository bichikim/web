import {onAnimationRepeater} from '../'
import {h, ref} from 'vue-demi'

export const Default = () => ({
  setup() {
    const countRef = ref(0)
    function increaseCount() {
      countRef.value += 1
    }
    const toggleRef = onAnimationRepeater(increaseCount)
    function toggleCount() {
      toggleRef.value = !toggleRef.value
    }
    return () =>
      h('div', [h('div', countRef.value), h('button', {onClick: toggleCount}, 'toggle count')])
  },
})

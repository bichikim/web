import {useDebounce} from '../'
import {h, ref} from 'vue'

export default {
  title: 'use/useDebounce',
}

export const Default = () => ({
  setup() {
    const countRef = ref(0)
    const increaseCount = () => {
      countRef.value += 1
    }
    const debouncedClick = useDebounce(increaseCount, 1000)
    return () =>
      h('div', [
        h('div', `value ${countRef.value}`),
        h('button', {onClick: debouncedClick}, 'toggle value'),
      ])
  },
})

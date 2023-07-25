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
    const debouncedClick = useDebounce(1000, increaseCount)
    return () =>
      h('div', [
        h('div', `value ${countRef.value}`),
        h('button', {onClick: debouncedClick}, 'toggle value'),
      ])
  },
})
